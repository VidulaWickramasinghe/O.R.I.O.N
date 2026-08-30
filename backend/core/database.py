"""Shared SQLite policy and transactional migration helpers."""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable, Iterator, Sequence


MigrationOperation = Callable[[sqlite3.Connection], None]


@dataclass(frozen=True)
class Migration:
    """One immutable, monotonically-versioned database migration."""

    version: int
    name: str
    operation: MigrationOperation

    def __post_init__(self) -> None:
        if self.version < 1:
            raise ValueError("Migration versions start at 1.")
        if not str(self.name).strip():
            raise ValueError("Migration name cannot be empty.")


def configure_connection(connection: sqlite3.Connection) -> None:
    """Apply the mandatory policy for every writable O.R.I.O.N. database."""

    connection.execute("PRAGMA busy_timeout = 10000")
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    connection.execute("PRAGMA synchronous = NORMAL")


def _validate_migrations(migrations: Iterable[Migration]) -> tuple[Migration, ...]:
    ordered = tuple(sorted(migrations, key=lambda item: item.version))
    versions = [item.version for item in ordered]
    if len(versions) != len(set(versions)):
        raise ValueError("Migration versions must be unique.")
    if versions and versions != list(range(1, versions[-1] + 1)):
        raise ValueError("Migration versions must be contiguous from version 1.")
    return ordered


def apply_migrations(
    database: str | Path,
    migrations: Sequence[Migration],
) -> dict[str, object]:
    """Apply pending migrations in one rollback-safe transaction.

    Migration operations must use ``Connection.execute`` rather than
    ``executescript`` because SQLite's script helper commits implicitly.
    """

    ordered = _validate_migrations(migrations)
    target_version = ordered[-1].version if ordered else 0
    connection = sqlite3.connect(database, timeout=10.0, isolation_level=None)
    applied: list[int] = []
    try:
        configure_connection(connection)
        current_version = int(connection.execute("PRAGMA user_version").fetchone()[0])
        if current_version > target_version:
            raise RuntimeError(
                f"Database schema version {current_version} is newer than supported "
                f"version {target_version}."
            )
        connection.execute("BEGIN IMMEDIATE")
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS _orion_schema_migrations (
                version INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        recorded = {
            int(row[0]): str(row[1])
            for row in connection.execute(
                "SELECT version, name FROM _orion_schema_migrations"
            )
        }
        for migration in ordered:
            if migration.version <= current_version:
                recorded_name = recorded.get(migration.version)
                if recorded_name and recorded_name != migration.name:
                    raise RuntimeError(
                        f"Migration {migration.version} was recorded as "
                        f"'{recorded_name}', not '{migration.name}'."
                    )
                continue
            migration.operation(connection)
            connection.execute(
                "INSERT INTO _orion_schema_migrations (version, name) VALUES (?, ?)",
                (migration.version, migration.name),
            )
            connection.execute(f"PRAGMA user_version = {migration.version}")
            current_version = migration.version
            applied.append(migration.version)
        connection.execute("COMMIT")
        return {
            "current_version": current_version,
            "target_version": target_version,
            "applied": applied,
        }
    except BaseException:
        if connection.in_transaction:
            connection.execute("ROLLBACK")
        raise
    finally:
        connection.close()


@contextmanager
def managed_connection(database: str | Path) -> Iterator[sqlite3.Connection]:
    """Yield a transactional connection and always release its file descriptor.

    ``sqlite3.Connection`` commits or rolls back when used as a context manager,
    but it does not close itself.  Keeping the close in one helper prevents
    request and test workloads from retaining descriptors until garbage
    collection happens to run.
    """

    connection = sqlite3.connect(
        database,
        timeout=10.0,
    )
    try:
        configure_connection(connection)

        with connection:
            yield connection
    finally:
        connection.close()
