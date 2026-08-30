"""Versioned persistence initialization and verified whole-state recovery."""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import sqlite3
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Iterable, Sequence
from uuid import uuid4

from core import (
    agent_runtime,
    approvals,
    developer_agent,
    knowledge_base,
    mission_planner,
    mission_run_history,
    notification_engine,
    persistent_memory,
    plugin_registry,
    release_candidate,
    security_policy,
    tool_audit,
    user_settings,
    vector_memory,
    workspace_manager,
)
from core.capability_gateway import requires_gateway
from core.database import Migration, apply_migrations, configure_connection
from core.runtime_paths import runtime_data_dir


BACKUP_FORMAT_VERSION = 1
BASELINE_SCHEMA_VERSION = 1
BACKUP_ID_PATTERN = re.compile(r"^orion-backup-[0-9]{8}T[0-9]{6}Z-[a-f0-9]{8}$")
PENDING_RESTORE_FILE = "pending_restore.json"
LAST_RESTORE_FILE = "last_restore.json"


@dataclass(frozen=True)
class StoreRegistration:
    key: str
    path: Callable[[], Path]
    initializer: Callable[[], None]
    target_version: int = BASELINE_SCHEMA_VERSION


def _baseline(_connection: sqlite3.Connection) -> None:
    """Record the validated schema produced by the store initializer."""


STORE_REGISTRY: tuple[StoreRegistration, ...] = (
    StoreRegistration("agent_runtime", lambda: Path(agent_runtime.DB_PATH), agent_runtime.init_agent_runtime_db),
    StoreRegistration("approvals", lambda: Path(approvals.DB_PATH), approvals.init_approval_db),
    StoreRegistration("developer_agent", lambda: Path(developer_agent.DB_PATH), developer_agent.init_developer_agent_db),
    StoreRegistration("knowledge", lambda: Path(knowledge_base.DB_PATH), knowledge_base.init_knowledge_db),
    StoreRegistration("missions", lambda: Path(mission_planner.DB_PATH), mission_planner.init_mission_db),
    StoreRegistration("mission_runs", lambda: Path(mission_run_history.DB_PATH), mission_run_history.init_mission_run_db),
    StoreRegistration("notifications", lambda: Path(notification_engine.DB_PATH), notification_engine.init_notification_db),
    StoreRegistration("memory", lambda: Path(persistent_memory.DB_PATH), persistent_memory.init_memory_db),
    StoreRegistration("plugins", lambda: Path(plugin_registry.DB_PATH), plugin_registry.init_plugin_registry_db),
    StoreRegistration("release_candidate", lambda: Path(release_candidate.DB_PATH), release_candidate.init_release_candidate_db),
    StoreRegistration("security_policy", lambda: Path(security_policy.DB_PATH), security_policy.init_security_policy_db),
    StoreRegistration("tool_audit", lambda: Path(tool_audit.DB_PATH), tool_audit.init_tool_audit_db),
    StoreRegistration("user_settings", lambda: Path(user_settings.DB_PATH), user_settings.init_user_settings_db),
    StoreRegistration("vectors", lambda: Path(vector_memory.DB_PATH), vector_memory.init_vector_db),
    StoreRegistration("workspaces", lambda: Path(workspace_manager.DB_PATH), workspace_manager.init_workspace_db),
)


def _store_migrations(store: StoreRegistration) -> tuple[Migration, ...]:
    if store.target_version != BASELINE_SCHEMA_VERSION:
        raise RuntimeError(f"No migration plan is registered for {store.key} version {store.target_version}.")
    return (Migration(1, f"{store.key}.baseline", _baseline),)


def initialize_persistence(
    stores: Sequence[StoreRegistration] = STORE_REGISTRY,
) -> dict[str, dict[str, object]]:
    """Upgrade every owned store and record its durable schema version."""

    results: dict[str, dict[str, object]] = {}
    for store in stores:
        store.initializer()
        results[store.key] = apply_migrations(store.path(), _store_migrations(store))
    return results


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _database_health(path: Path) -> dict[str, object]:
    connection = sqlite3.connect(f"file:{path.resolve()}?mode=ro", uri=True, timeout=10.0)
    try:
        integrity = str(connection.execute("PRAGMA integrity_check").fetchone()[0])
        foreign_key_errors = [tuple(row) for row in connection.execute("PRAGMA foreign_key_check")]
        version = int(connection.execute("PRAGMA user_version").fetchone()[0])
        if integrity.lower() != "ok" or foreign_key_errors:
            raise RuntimeError(
                f"Database verification failed for {path.name}: "
                f"integrity={integrity}, foreign_key_errors={len(foreign_key_errors)}"
            )
        return {
            "schema_version": version,
            "integrity": integrity,
            "foreign_key_errors": len(foreign_key_errors),
        }
    finally:
        connection.close()


def database_state_digest(path: str | Path) -> str:
    """Return a deterministic digest of schema and row state, not file layout."""

    database = Path(path)
    _database_health(database)
    connection = sqlite3.connect(f"file:{database.resolve()}?mode=ro", uri=True, timeout=10.0)
    try:
        statements = "\n".join(connection.iterdump())
    finally:
        connection.close()
    return hashlib.sha256(statements.encode("utf-8")).hexdigest()


def _sqlite_backup(source: Path, destination: Path) -> None:
    source_connection = sqlite3.connect(source, timeout=10.0)
    destination_connection = sqlite3.connect(destination, timeout=10.0)
    try:
        configure_connection(source_connection)
        source_connection.backup(destination_connection)
        destination_connection.commit()
    finally:
        destination_connection.close()
        source_connection.close()


def _registered_paths(stores: Sequence[StoreRegistration]) -> dict[Path, str]:
    return {store.path().resolve(strict=False): store.key for store in stores}


def _discover_databases(
    data_directory: Path,
    stores: Sequence[StoreRegistration],
) -> list[tuple[str, Path]]:
    registered = _registered_paths(stores)
    candidates = {path for path in registered if path.exists()}
    candidates.update(path.resolve() for path in data_directory.glob("*.sqlite") if path.is_file())
    items: list[tuple[str, Path]] = []
    for path in sorted(candidates, key=lambda item: item.name):
        key = registered.get(path, f"additional:{path.stem}")
        items.append((key, path))
    return items


def _atomic_json(path: Path, payload: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{uuid4().hex}.tmp")
    temporary.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def _backup_root(
    path: str | Path | None,
    data_directory: Path,
    *,
    create: bool = True,
) -> Path:
    root = Path(path).expanduser() if path else data_directory / "backups"
    root = root.resolve(strict=False)
    if create:
        root.mkdir(parents=True, exist_ok=True)
    return root


@requires_gateway
def create_runtime_backup(
    *,
    data_directory: str | Path | None = None,
    backup_root: str | Path | None = None,
    stores: Sequence[StoreRegistration] = STORE_REGISTRY,
) -> dict[str, object]:
    """Create an online-consistent SQLite backup set with verification hashes."""

    data_root = Path(data_directory).resolve() if data_directory else runtime_data_dir().resolve()
    root = _backup_root(backup_root, data_root)
    now = datetime.now(timezone.utc)
    backup_id = f"orion-backup-{now.strftime('%Y%m%dT%H%M%SZ')}-{uuid4().hex[:8]}"
    final_directory = root / backup_id
    staging = Path(tempfile.mkdtemp(prefix=f".{backup_id}-", dir=root))
    try:
        entries: list[dict[str, object]] = []
        for key, source in _discover_databases(data_root, stores):
            if source.is_symlink():
                raise RuntimeError(f"Refusing to back up symlinked database: {source.name}")
            destination_name = source.name
            destination = staging / destination_name
            _sqlite_backup(source, destination)
            health = _database_health(destination)
            entries.append(
                {
                    "key": key,
                    "filename": destination_name,
                    "bytes": destination.stat().st_size,
                    "sha256": _sha256(destination),
                    "state_sha256": database_state_digest(destination),
                    **health,
                }
            )
        if not entries:
            raise RuntimeError("No SQLite stores exist to back up.")
        manifest: dict[str, object] = {
            "format_version": BACKUP_FORMAT_VERSION,
            "backup_id": backup_id,
            "created_at": now.isoformat(timespec="seconds"),
            "stores": entries,
        }
        _atomic_json(staging / "manifest.json", manifest)
        os.replace(staging, final_directory)
        return {**manifest, "path": str(final_directory)}
    except BaseException:
        shutil.rmtree(staging, ignore_errors=True)
        raise


def _resolve_backup(
    backup_id: str,
    *,
    data_directory: Path,
    backup_root: str | Path | None,
) -> Path:
    clean_id = str(backup_id).strip()
    if not BACKUP_ID_PATTERN.fullmatch(clean_id):
        raise ValueError("Backup ID is invalid.")
    root = _backup_root(backup_root, data_directory, create=False)
    if not root.is_dir():
        raise FileNotFoundError(f"Backup root was not found: {root}")
    candidate = (root / clean_id).resolve(strict=False)
    candidate.relative_to(root)
    if not candidate.is_dir() or candidate.is_symlink():
        raise FileNotFoundError(f"Backup was not found: {clean_id}")
    return candidate


def verify_runtime_backup(
    backup_id: str,
    *,
    data_directory: str | Path | None = None,
    backup_root: str | Path | None = None,
) -> dict[str, object]:
    data_root = Path(data_directory).resolve() if data_directory else runtime_data_dir().resolve()
    directory = _resolve_backup(backup_id, data_directory=data_root, backup_root=backup_root)
    manifest_path = directory / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if int(manifest.get("format_version", 0)) != BACKUP_FORMAT_VERSION:
        raise RuntimeError("Backup format is not supported.")
    if manifest.get("backup_id") != backup_id:
        raise RuntimeError("Backup manifest identity does not match its directory.")
    stores = manifest.get("stores")
    if not isinstance(stores, list) or not stores:
        raise RuntimeError("Backup manifest contains no stores.")
    for entry in stores:
        if not isinstance(entry, dict):
            raise RuntimeError("Backup store entry is invalid.")
        filename = str(entry.get("filename", ""))
        if Path(filename).name != filename or not filename.endswith(".sqlite"):
            raise RuntimeError("Backup store filename is unsafe.")
        database = directory / filename
        if not database.is_file() or database.is_symlink():
            raise RuntimeError(f"Backup store is missing or unsafe: {filename}")
        if _sha256(database) != str(entry.get("sha256", "")):
            raise RuntimeError(f"Backup file hash mismatch: {filename}")
        if database_state_digest(database) != str(entry.get("state_sha256", "")):
            raise RuntimeError(f"Backup logical-state hash mismatch: {filename}")
    return {**manifest, "path": str(directory), "manifest_sha256": _sha256(manifest_path)}


def list_runtime_backups(
    *,
    data_directory: str | Path | None = None,
    backup_root: str | Path | None = None,
) -> list[dict[str, object]]:
    data_root = Path(data_directory).resolve() if data_directory else runtime_data_dir().resolve()
    root = _backup_root(backup_root, data_root, create=False)
    if not root.is_dir():
        return []
    backups: list[dict[str, object]] = []
    for child in sorted(root.iterdir(), reverse=True):
        if not child.is_dir() or not BACKUP_ID_PATTERN.fullmatch(child.name):
            continue
        try:
            verified = verify_runtime_backup(
                child.name, data_directory=data_root, backup_root=root
            )
            backups.append(verified)
        except Exception as error:
            backups.append({"backup_id": child.name, "valid": False, "error": str(error)})
    return backups


def recovery_status(
    *,
    data_directory: str | Path | None = None,
) -> dict[str, object]:
    data_root = Path(data_directory).resolve() if data_directory else runtime_data_dir().resolve()

    def load_marker(filename: str) -> dict[str, object] | None:
        path = data_root / filename
        if not path.is_file() or path.is_symlink():
            return None
        value = json.loads(path.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else None

    return {
        "pending_restore": load_marker(PENDING_RESTORE_FILE),
        "last_restore": load_marker(LAST_RESTORE_FILE),
    }


def persistence_status(
    stores: Sequence[StoreRegistration] = STORE_REGISTRY,
) -> dict[str, object]:
    items: list[dict[str, object]] = []
    for store in stores:
        path = store.path()
        if not path.exists():
            items.append({"key": store.key, "available": False, "target_version": store.target_version})
            continue
        health = _database_health(path)
        connection = sqlite3.connect(f"file:{path.resolve()}?mode=ro", uri=True, timeout=10.0)
        try:
            journal_mode = str(connection.execute("PRAGMA journal_mode").fetchone()[0]).lower()
        finally:
            connection.close()
        items.append(
            {
                "key": store.key,
                "available": True,
                "target_version": store.target_version,
                "journal_mode": journal_mode,
                "foreign_keys": True,
                **health,
            }
        )
    return {"stores": items, "healthy": all(item.get("available") for item in items)}


def _restore_verified_backup(
    backup_id: str,
    *,
    data_directory: str | Path | None = None,
    backup_root: str | Path | None = None,
) -> dict[str, object]:
    """Restore a verified set with staging and whole-operation rollback."""

    data_root = Path(data_directory).resolve() if data_directory else runtime_data_dir().resolve()
    verified = verify_runtime_backup(
        backup_id, data_directory=data_root, backup_root=backup_root
    )
    backup_directory = Path(str(verified["path"]))
    staging = Path(tempfile.mkdtemp(prefix=".orion-restore-stage-", dir=data_root))
    rollback = Path(tempfile.mkdtemp(prefix=".orion-restore-rollback-", dir=data_root))
    replaced: list[tuple[Path, bool]] = []
    try:
        for entry in verified["stores"]:
            filename = str(entry["filename"])
            _sqlite_backup(backup_directory / filename, staging / filename)
            if database_state_digest(staging / filename) != str(entry["state_sha256"]):
                raise RuntimeError(f"Restore staging verification failed: {filename}")
        for entry in verified["stores"]:
            filename = str(entry["filename"])
            target = data_root / filename
            existed = target.exists()
            for suffix in ("", "-wal", "-shm"):
                current = Path(f"{target}{suffix}")
                if current.exists():
                    os.replace(current, rollback / f"{filename}{suffix}")
            replaced.append((target, existed))
            os.replace(staging / filename, target)
        for entry in verified["stores"]:
            target = data_root / str(entry["filename"])
            if database_state_digest(target) != str(entry["state_sha256"]):
                raise RuntimeError(f"Restored database verification failed: {target.name}")
        return {
            "backup_id": backup_id,
            "restored": [str(entry["filename"]) for entry in verified["stores"]],
            "restored_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        }
    except BaseException:
        for target, _existed in reversed(replaced):
            target.unlink(missing_ok=True)
            Path(f"{target}-wal").unlink(missing_ok=True)
            Path(f"{target}-shm").unlink(missing_ok=True)
            for suffix in ("", "-wal", "-shm"):
                original = rollback / f"{target.name}{suffix}"
                if original.exists():
                    os.replace(original, Path(f"{target}{suffix}"))
        raise
    finally:
        shutil.rmtree(staging, ignore_errors=True)
        shutil.rmtree(rollback, ignore_errors=True)


@requires_gateway
def restore_runtime_backup(
    backup_id: str,
    *,
    data_directory: str | Path | None = None,
    backup_root: str | Path | None = None,
) -> dict[str, object]:
    """Restore immediately; callers must ensure the application is offline."""

    return _restore_verified_backup(
        backup_id, data_directory=data_directory, backup_root=backup_root
    )


@requires_gateway
def schedule_runtime_restore(
    backup_id: str,
    *,
    expected_manifest_sha256: str = "",
    data_directory: str | Path | None = None,
    backup_root: str | Path | None = None,
) -> dict[str, object]:
    """Queue a verified restore for the next backend start."""

    data_root = Path(data_directory).resolve() if data_directory else runtime_data_dir().resolve()
    verified = verify_runtime_backup(
        backup_id, data_directory=data_root, backup_root=backup_root
    )
    if expected_manifest_sha256 and verified["manifest_sha256"] != expected_manifest_sha256:
        raise RuntimeError("Approved restore manifest no longer matches the backup.")
    payload: dict[str, object] = {
        "backup_id": backup_id,
        "backup_root": str(Path(str(verified["path"])).parent),
        "manifest_sha256": verified["manifest_sha256"],
        "scheduled_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    _atomic_json(data_root / PENDING_RESTORE_FILE, payload)
    return {**payload, "status": "scheduled_for_restart"}


def apply_pending_runtime_restore(
    *,
    data_directory: str | Path | None = None,
) -> dict[str, object] | None:
    """Apply the gateway-created pending marker before any store is opened."""

    data_root = Path(data_directory).resolve() if data_directory else runtime_data_dir().resolve()
    marker = data_root / PENDING_RESTORE_FILE
    if not marker.exists():
        return None
    payload = json.loads(marker.read_text(encoding="utf-8"))
    backup_id = str(payload.get("backup_id", ""))
    backup_root = str(payload.get("backup_root", ""))
    verified = verify_runtime_backup(
        backup_id, data_directory=data_root, backup_root=backup_root
    )
    if verified["manifest_sha256"] != payload.get("manifest_sha256"):
        raise RuntimeError("Pending restore manifest changed after approval.")
    result = _restore_verified_backup(
        backup_id, data_directory=data_root, backup_root=backup_root
    )
    completed = {**payload, **result, "status": "restored"}
    _atomic_json(data_root / LAST_RESTORE_FILE, completed)
    marker.unlink()
    return completed
