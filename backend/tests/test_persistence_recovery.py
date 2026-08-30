"""Migration matrix and verified backup/restore regressions for ORION-018."""

import sqlite3
import sys
import tempfile
import unittest
from contextlib import ExitStack, contextmanager
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

import api_main
from core import capability_gateway, persistent_memory
from core.capability_gateway import CapabilityDeniedError, authorized, test_context
from core.database import Migration, apply_migrations, managed_connection
from core.persistence import (
    STORE_REGISTRY,
    StoreRegistration,
    apply_pending_runtime_restore,
    create_runtime_backup,
    database_state_digest,
    initialize_persistence,
    restore_runtime_backup,
    schedule_runtime_restore,
    verify_runtime_backup,
)


@contextmanager
def allowed(capability: str):
    with patch.object(
        capability_gateway, "_policy_snapshot", return_value=("balanced-test", set())
    ), patch.object(
        capability_gateway,
        "_plugin_decision",
        return_value=(True, "allowed", "high", "system"),
    ), patch.object(
        capability_gateway, "_approval_is_valid", return_value=(True, "approved")
    ), patch.object(
        capability_gateway, "_audit"
    ), patch(
        "core.tool_audit.record_audit_event", return_value={"id": 1}
    ), patch(
        "core.tool_audit.complete_audit_event"
    ):
        with authorized(capability, test_context(capability, approval_id=91)):
            yield


class MigrationFrameworkTests(unittest.TestCase):
    def test_every_owned_sqlite_store_has_a_versioned_registration(self) -> None:
        self.assertEqual(len(STORE_REGISTRY), 15)
        self.assertEqual(len({store.key for store in STORE_REGISTRY}), len(STORE_REGISTRY))
        self.assertTrue(all(store.target_version >= 1 for store in STORE_REGISTRY))

    def test_prior_memory_fixture_upgrades_without_losing_rows(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            database = Path(temp_dir) / "orion_memory.sqlite"
            connection = sqlite3.connect(database)
            try:
                connection.execute(
                    """
                    CREATE TABLE memory_items (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        category TEXT NOT NULL,
                        title TEXT NOT NULL,
                        content TEXT NOT NULL,
                        source TEXT DEFAULT 'user',
                        importance INTEGER DEFAULT 3,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                    """
                )
                connection.execute(
                    """
                    INSERT INTO memory_items
                    (category, title, content, source, importance, created_at, updated_at)
                    VALUES ('project', 'Prior fixture', 'preserve me', 'fixture', 3, '2026-01-01', '2026-01-01')
                    """
                )
                connection.commit()
            finally:
                connection.close()

            with patch.object(persistent_memory, "DB_PATH", database):
                store = StoreRegistration(
                    "memory", lambda: Path(persistent_memory.DB_PATH), persistent_memory.init_memory_db
                )
                result = initialize_persistence((store,))

            connection = sqlite3.connect(database)
            try:
                columns = {
                    str(row[1]) for row in connection.execute("PRAGMA table_info(memory_items)")
                }
                row = connection.execute(
                    "SELECT title, content FROM memory_items WHERE id = 1"
                ).fetchone()
                version = int(connection.execute("PRAGMA user_version").fetchone()[0])
            finally:
                connection.close()

            self.assertEqual(result["memory"]["current_version"], 1)
            self.assertEqual(version, 1)
            self.assertEqual(row, ("Prior fixture", "preserve me"))
            self.assertTrue({"workspace_id", "sensitivity", "provenance_json"} <= columns)

    def test_failed_migration_rolls_back_schema_and_version(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            database = Path(temp_dir) / "rollback.sqlite"
            apply_migrations(
                database,
                (Migration(1, "baseline", lambda connection: connection.execute("CREATE TABLE stable (id INTEGER PRIMARY KEY)")),),
            )

            def fail(connection: sqlite3.Connection) -> None:
                connection.execute("CREATE TABLE partial (id INTEGER PRIMARY KEY)")
                connection.execute("INSERT INTO stable (id) VALUES (1)")
                raise RuntimeError("injected migration failure")

            with self.assertRaisesRegex(RuntimeError, "injected migration failure"):
                apply_migrations(
                    database,
                    (
                        Migration(1, "baseline", lambda _connection: None),
                        Migration(2, "must_rollback", fail),
                    ),
                )

            connection = sqlite3.connect(database)
            try:
                version = int(connection.execute("PRAGMA user_version").fetchone()[0])
                partial = connection.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'partial'"
                ).fetchone()
                stable_rows = connection.execute("SELECT COUNT(*) FROM stable").fetchone()[0]
            finally:
                connection.close()
            self.assertEqual(version, 1)
            self.assertIsNone(partial)
            self.assertEqual(stable_rows, 0)

    def test_managed_connections_enforce_foreign_keys_and_wal(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            database = Path(temp_dir) / "policy.sqlite"
            with managed_connection(database) as connection:
                self.assertEqual(connection.execute("PRAGMA foreign_keys").fetchone()[0], 1)
                self.assertEqual(connection.execute("PRAGMA journal_mode").fetchone()[0], "wal")
                connection.execute("CREATE TABLE parent (id INTEGER PRIMARY KEY)")
                connection.execute(
                    "CREATE TABLE child (parent_id INTEGER REFERENCES parent(id))"
                )
                with self.assertRaises(sqlite3.IntegrityError):
                    connection.execute("INSERT INTO child (parent_id) VALUES (99)")


class BackupRestoreTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.database = self.root / "state.sqlite"

        def initialize() -> None:
            with managed_connection(self.database) as connection:
                connection.execute(
                    "CREATE TABLE IF NOT EXISTS records (id INTEGER PRIMARY KEY, value TEXT NOT NULL)"
                )

        self.store = StoreRegistration("state", lambda: self.database, initialize)
        initialize_persistence((self.store,))
        with managed_connection(self.database) as connection:
            connection.execute("INSERT INTO records (id, value) VALUES (1, 'original')")

    def tearDown(self) -> None:
        self.temp.cleanup()

    def create_backup(self) -> dict[str, object]:
        with allowed("create_runtime_backup"):
            return create_runtime_backup(
                data_directory=self.root,
                backup_root=self.root / "backups",
                stores=(self.store,),
            )

    def test_direct_backup_and_restore_callers_fail_closed(self) -> None:
        with self.assertRaises(CapabilityDeniedError):
            create_runtime_backup(
                data_directory=self.root,
                backup_root=self.root / "backups",
                stores=(self.store,),
            )
        with self.assertRaises(CapabilityDeniedError):
            restore_runtime_backup(
                "orion-backup-20260101T000000Z-deadbeef",
                data_directory=self.root,
                backup_root=self.root / "backups",
            )

    def test_backup_restores_identical_logical_state(self) -> None:
        original_digest = database_state_digest(self.database)
        backup = self.create_backup()
        with managed_connection(self.database) as connection:
            connection.execute("UPDATE records SET value = 'mutated' WHERE id = 1")
            connection.execute("INSERT INTO records (id, value) VALUES (2, 'new')")
        self.assertNotEqual(database_state_digest(self.database), original_digest)

        with allowed("restore_runtime_backup"):
            result = restore_runtime_backup(
                str(backup["backup_id"]),
                data_directory=self.root,
                backup_root=self.root / "backups",
            )

        self.assertEqual(result["restored"], ["state.sqlite"])
        self.assertEqual(database_state_digest(self.database), original_digest)


    def test_corrupt_backup_is_rejected_without_touching_live_state(self) -> None:
        backup = self.create_backup()
        live_digest = database_state_digest(self.database)
        backup_database = Path(str(backup["path"])) / "state.sqlite"
        with backup_database.open("ab") as handle:
            handle.write(b"tampered")
        with self.assertRaisesRegex(RuntimeError, "hash mismatch"):
            verify_runtime_backup(
                str(backup["backup_id"]),
                data_directory=self.root,
                backup_root=self.root / "backups",
            )
        self.assertEqual(database_state_digest(self.database), live_digest)

    def test_approved_restore_is_hash_bound_and_applies_on_restart(self) -> None:
        backup = self.create_backup()
        verified = verify_runtime_backup(
            str(backup["backup_id"]),
            data_directory=self.root,
            backup_root=self.root / "backups",
        )
        original_digest = database_state_digest(self.database)
        with managed_connection(self.database) as connection:
            connection.execute("UPDATE records SET value = 'after backup' WHERE id = 1")

        with allowed("execute_approved_action"):
            scheduled = schedule_runtime_restore(
                str(backup["backup_id"]),
                expected_manifest_sha256=str(verified["manifest_sha256"]),
                data_directory=self.root,
                backup_root=self.root / "backups",
            )
        self.assertEqual(scheduled["status"], "scheduled_for_restart")
        restored = apply_pending_runtime_restore(data_directory=self.root)
        self.assertEqual(restored["status"], "restored")
        self.assertEqual(database_state_digest(self.database), original_digest)


class PersistenceApiFlowTests(unittest.TestCase):
    def test_backup_approval_and_restart_restore_complete_end_to_end(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir, ExitStack() as stack:
            root = Path(temp_dir)
            stack.enter_context(patch.dict("os.environ", {"ORION_DATA_DIR": str(root)}))
            for store in STORE_REGISTRY:
                module = sys.modules[store.initializer.__module__]
                stack.enter_context(
                    patch.object(module, "DB_PATH", root / f"{store.key}.sqlite")
                )
            stack.enter_context(
                patch.object(
                    api_main.LOCAL_API_AUTHENTICATOR,
                    "authenticate",
                    return_value="persistence-api-test",
                )
            )

            with TestClient(api_main.app) as client:
                overview = client.get("/api/system/persistence")
                self.assertEqual(overview.status_code, 200)
                self.assertEqual(len(overview.json()["stores"]), len(STORE_REGISTRY))

                created = client.post("/api/system/persistence/backups")
                self.assertEqual(created.status_code, 200)
                backup_id = created.json()["backup_id"]

                requested = client.post(
                    f"/api/system/persistence/backups/{backup_id}/restore-request"
                )
                self.assertEqual(requested.status_code, 200)
                approval = requested.json()["approval"]
                approved = client.post(
                    f"/api/approvals/{approval['id']}/approve",
                    headers={"Idempotency-Key": approval["idempotency_key"]},
                )
                self.assertEqual(approved.status_code, 200)
                self.assertEqual(approved.json()["status"], "approved")
                self.assertIsNotNone(
                    client.get("/api/system/persistence").json()["pending_restore"]
                )

            with TestClient(api_main.app) as restarted:
                recovered = restarted.get("/api/system/persistence")
                self.assertEqual(recovered.status_code, 200)
                state = recovered.json()
                self.assertIsNone(state["pending_restore"])
                self.assertEqual(state["last_restore"]["backup_id"], backup_id)
                self.assertTrue(state["healthy"])


if __name__ == "__main__":
    unittest.main()
