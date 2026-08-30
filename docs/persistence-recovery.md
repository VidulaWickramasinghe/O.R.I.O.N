# O.R.I.O.N. persistence recovery

O.R.I.O.N. keeps its local state in independently owned SQLite stores. The
stores are not merged: each domain retains a narrow database, while
`backend/core/database.py` supplies one connection policy and transactional
migration runner.

## Connection and schema policy

Every writable store connection enables:

- foreign-key enforcement;
- WAL journaling;
- a 10-second busy timeout; and
- normal synchronous durability.

Each owned store records its current schema through `PRAGMA user_version` and
`_orion_schema_migrations`. Migrations are contiguous, immutable, and executed
inside `BEGIN IMMEDIATE`. A failed migration rolls back its schema, data, and
version changes together. A database newer than the application fails closed.

## Backup

Use **System → Persistence Recovery → Create backup**. The Capability Gateway
authorizes the operation before `backend/core/persistence.py` uses SQLite's
online backup API. Development backups are stored under
`~/O.R.I.O.N/backend/data/backups/`; packaged builds use the configured local
application data directory.

Each backup contains a manifest with:

- the backup ID and creation time;
- every SQLite store filename and schema version;
- SHA-256 of the backup file; and
- a logical schema-and-row-state SHA-256.

Absolute source paths and credentials are not included.

## Restore

Restore is deliberately restart-bound:

1. Select **Request restore approval** for a verified backup.
2. Review the critical request in **Governance → Tools & approvals**.
3. Approval records a hash-bound pending restore; it does not replace a live database.
4. Restart the backend or desktop application.
5. Startup verifies the approved manifest again, stages every store, replaces
   the set, verifies logical state, and rolls the whole operation back if any
   store fails.
6. Normal versioned migrations run against the restored state before the API
   becomes available.

Never copy a live `.sqlite`, `-wal`, or `-shm` file manually. Generated backups
and restore markers are runtime state and must not be committed.
