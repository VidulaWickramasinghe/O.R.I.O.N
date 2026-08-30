import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


from core.database import managed_connection
from core.capability_gateway import requires_gateway
from core.runtime_paths import runtime_data_dir
BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = runtime_data_dir()
DB_PATH = DATA_DIR / "orion_missions.sqlite"

DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_connection():
    return managed_connection(DB_PATH)


def init_mission_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS missions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                goal TEXT NOT NULL,
                status TEXT DEFAULT 'planned',
                priority INTEGER DEFAULT 3,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )

        mission_columns = {
            str(row[1]) for row in conn.execute("PRAGMA table_info(missions)")
        }
        mission_migrations = {
            "state_version": "INTEGER NOT NULL DEFAULT 1",
            "terminal_reason": "TEXT DEFAULT ''",
            "paused_at": "TEXT DEFAULT ''",
            "cancelled_at": "TEXT DEFAULT ''",
            "completed_at": "TEXT DEFAULT ''",
            "retry_count": "INTEGER NOT NULL DEFAULT 0",
            "max_retries": "INTEGER NOT NULL DEFAULT 3",
            "last_transition_id": "INTEGER",
        }
        for column, definition in mission_migrations.items():
            if column not in mission_columns:
                conn.execute(f"ALTER TABLE missions ADD COLUMN {column} {definition}")

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS mission_steps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mission_id INTEGER NOT NULL,
                position INTEGER NOT NULL,
                title TEXT NOT NULL,
                details TEXT DEFAULT '',
                status TEXT DEFAULT 'pending',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (mission_id) REFERENCES missions(id)
            )
            """
        )

        step_columns = {
            str(row[1]) for row in conn.execute("PRAGMA table_info(mission_steps)")
        }
        step_migrations = {
            "attempt_count": "INTEGER NOT NULL DEFAULT 0",
            "max_attempts": "INTEGER NOT NULL DEFAULT 3",
            "evaluator_outcome": "TEXT DEFAULT ''",
            "last_error": "TEXT DEFAULT ''",
            "checkpoint_id": "INTEGER",
        }
        for column, definition in step_migrations.items():
            if column not in step_columns:
                conn.execute(f"ALTER TABLE mission_steps ADD COLUMN {column} {definition}")

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS mission_transitions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mission_id INTEGER NOT NULL,
                step_id INTEGER,
                run_id INTEGER,
                entity_type TEXT NOT NULL,
                from_state TEXT NOT NULL,
                to_state TEXT NOT NULL,
                cause TEXT NOT NULL,
                actor TEXT NOT NULL,
                evaluator_outcome TEXT DEFAULT '',
                metadata_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                FOREIGN KEY (mission_id) REFERENCES missions(id),
                FOREIGN KEY (step_id) REFERENCES mission_steps(id)
            )
            """
        )
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_mission_transitions_mission
            ON mission_transitions(mission_id, id)
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS mission_checkpoints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mission_id INTEGER NOT NULL,
                step_id INTEGER,
                run_id INTEGER,
                transition_id INTEGER NOT NULL,
                cause TEXT NOT NULL,
                snapshot_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (mission_id) REFERENCES missions(id),
                FOREIGN KEY (step_id) REFERENCES mission_steps(id),
                FOREIGN KEY (transition_id) REFERENCES mission_transitions(id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS mission_leases (
                mission_id INTEGER PRIMARY KEY,
                lease_id TEXT NOT NULL UNIQUE,
                owner TEXT NOT NULL,
                acquired_at TEXT NOT NULL,
                renewed_at TEXT NOT NULL,
                expires_at_epoch REAL NOT NULL,
                FOREIGN KEY (mission_id) REFERENCES missions(id)
            )
            """
        )

        # Canonicalize legacy prompt-driven values without discarding records.
        for legacy, canonical in {
            "in_progress": "running",
            "complete": "completed",
            "blocked": "failed",
        }.items():
            conn.execute(
                "UPDATE missions SET status = ? WHERE status = ?",
                (canonical, legacy),
            )

        conn.commit()


@requires_gateway
def create_mission_record(
    title: str,
    goal: str,
    steps: List[str],
    priority: int = 3,
    status: str = "planned",
) -> int:
    init_mission_db()
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")

    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO missions
            (title, goal, status, priority, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (title, goal, status, priority, now, now),
        )

        mission_id = int(cursor.lastrowid)

        for index, step in enumerate(steps, start=1):
            conn.execute(
                """
                INSERT INTO mission_steps
                (mission_id, position, title, details, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (mission_id, index, step, "", "pending", now, now),
            )

        transition = conn.execute(
            """
            INSERT INTO mission_transitions
            (mission_id, step_id, run_id, entity_type, from_state, to_state,
             cause, actor, evaluator_outcome, metadata_json, created_at)
            VALUES (?, NULL, NULL, 'mission', '', 'planned',
                    'mission_created', 'creator', '', '{}', ?)
            """,
            (mission_id, now),
        )
        transition_id = int(transition.lastrowid)
        snapshot = {
            "mission_id": mission_id,
            "status": "planned",
            "state_version": 1,
            "steps": [
                {"position": index, "title": step, "status": "pending"}
                for index, step in enumerate(steps, start=1)
            ],
        }
        conn.execute(
            """
            INSERT INTO mission_checkpoints
            (mission_id, step_id, run_id, transition_id, cause, snapshot_json, created_at)
            VALUES (?, NULL, NULL, ?, 'mission_created', ?, ?)
            """,
            (mission_id, transition_id, json.dumps(snapshot, sort_keys=True), now),
        )
        conn.execute(
            "UPDATE missions SET last_transition_id = ? WHERE id = ?",
            (transition_id, mission_id),
        )

        conn.commit()
        return mission_id


def list_mission_records(limit: int = 20) -> List[Dict[str, Any]]:
    init_mission_db()

    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT *
            FROM missions
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    return [dict(row) for row in rows]


def get_mission_record(mission_id: int) -> Optional[Dict[str, Any]]:
    init_mission_db()

    with get_connection() as conn:
        conn.row_factory = sqlite3.Row

        mission = conn.execute(
            """
            SELECT *
            FROM missions
            WHERE id = ?
            """,
            (mission_id,),
        ).fetchone()

        if not mission:
            return None

        steps = conn.execute(
            """
            SELECT *
            FROM mission_steps
            WHERE mission_id = ?
            ORDER BY position ASC
            """,
            (mission_id,),
        ).fetchall()

    result = dict(mission)
    result["steps"] = [dict(step) for step in steps]
    return result


@requires_gateway
def update_mission_status_record(mission_id: int, status: str) -> bool:
    from core.mission_manager import transition_mission_state

    result = transition_mission_state(
        mission_id,
        status,
        cause="validated_status_update",
        actor="mission_state_api",
    )
    return bool(result.get("transitioned") or result.get("replayed"))


@requires_gateway
def update_mission_step_status_record(step_id: int, status: str) -> bool:
    from core.mission_manager import transition_step_state

    result = transition_step_state(
        step_id,
        status,
        cause="validated_status_update",
        actor="mission_state_api",
    )
    return bool(result.get("transitioned") or result.get("replayed"))


@requires_gateway
def add_mission_step_record(
    mission_id: int,
    title: str,
    details: str = "",
    status: str = "pending",
) -> Optional[int]:
    init_mission_db()
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")

    with get_connection() as conn:
        current_max = conn.execute(
            """
            SELECT MAX(position)
            FROM mission_steps
            WHERE mission_id = ?
            """,
            (mission_id,),
        ).fetchone()[0]

        position = int(current_max or 0) + 1

        cursor = conn.execute(
            """
            INSERT INTO mission_steps
            (mission_id, position, title, details, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (mission_id, position, title, details, status, now, now),
        )

        conn.execute(
            """
            UPDATE missions
            SET updated_at = ?
            WHERE id = ?
            """,
            (now, mission_id),
        )

        conn.commit()
        return int(cursor.lastrowid)
