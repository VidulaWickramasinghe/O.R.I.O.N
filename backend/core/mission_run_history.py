import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


from core.database import managed_connection
from core.capability_gateway import requires_gateway
from core.runtime_paths import runtime_data_dir
BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = runtime_data_dir()
REPORTS_DIR = DATA_DIR / "mission_reports"
DB_PATH = DATA_DIR / "orion_mission_runs.sqlite"

DATA_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def get_connection():
    return managed_connection(DB_PATH)


def init_mission_run_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS mission_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mission_id INTEGER NOT NULL,
                step_id INTEGER,
                approval_id INTEGER,
                mission_title TEXT NOT NULL,
                step_title TEXT DEFAULT '',
                status TEXT DEFAULT 'started',
                output TEXT DEFAULT '',
                error TEXT DEFAULT '',
                started_at TEXT NOT NULL,
                completed_at TEXT DEFAULT '',
                created_at TEXT NOT NULL
            )
            """
        )
        existing_columns = {
            str(row[1]) for row in conn.execute("PRAGMA table_info(mission_runs)")
        }
        if "approval_id" not in existing_columns:
            conn.execute("ALTER TABLE mission_runs ADD COLUMN approval_id INTEGER")
        conn.commit()


@requires_gateway
def start_mission_run(
    mission_id: int,
    mission_title: str,
    step_id: Optional[int],
    step_title: str,
) -> int:
    init_mission_run_db()
    now = datetime.now().isoformat(timespec="seconds")

    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO mission_runs
            (mission_id, step_id, mission_title, step_title, status, output, error, started_at, completed_at, created_at)
            VALUES (?, ?, ?, ?, 'started', '', '', ?, '', ?)
            """,
            (mission_id, step_id, mission_title, step_title, now, now),
        )
        conn.commit()
        return int(cursor.lastrowid)


@requires_gateway
def complete_mission_run(
    run_id: int,
    status: str,
    output: str,
    approval_id: Optional[int] = None,
) -> bool:
    init_mission_run_db()
    now = datetime.now().isoformat(timespec="seconds")

    with get_connection() as conn:
        cursor = conn.execute(
            """
            UPDATE mission_runs
            SET status = ?, output = ?, approval_id = ?, completed_at = ?
            WHERE id = ? AND status = 'started'
            """,
            (status, output, approval_id, now, run_id),
        )
        conn.commit()

    return cursor.rowcount > 0


@requires_gateway
def fail_mission_run(run_id: int, error: str) -> bool:
    init_mission_run_db()
    now = datetime.now().isoformat(timespec="seconds")

    with get_connection() as conn:
        cursor = conn.execute(
            """
            UPDATE mission_runs
            SET status = 'error', error = ?, completed_at = ?
            WHERE id = ? AND status = 'started'
            """,
            (error, now, run_id),
        )
        conn.commit()

    return cursor.rowcount > 0


def get_mission_run(run_id: int) -> Optional[Dict[str, Any]]:
    init_mission_run_db()
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM mission_runs WHERE id = ?", (int(run_id),)
        ).fetchone()
    return dict(row) if row else None


@requires_gateway
def bind_mission_run_approval(
    run_id: int,
    mission_id: int,
    step_id: int,
    approval_id: int,
) -> bool:
    """Idempotently close the crash window between approval creation and run update."""

    now = datetime.now().isoformat(timespec="seconds")
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        existing = conn.execute(
            "SELECT * FROM mission_runs WHERE id = ?", (int(run_id),)
        ).fetchone()
        if not existing:
            return False
        if int(existing["mission_id"]) != int(mission_id):
            return False
        if int(existing["step_id"] or -1) != int(step_id):
            return False
        if existing["approval_id"] is not None:
            return int(existing["approval_id"]) == int(approval_id)
        if existing["status"] != "started":
            return False
        cursor = conn.execute(
            """
            UPDATE mission_runs
            SET approval_id = ?, status = 'waiting_approval', completed_at = ?
            WHERE id = ? AND mission_id = ? AND step_id = ?
              AND approval_id IS NULL AND status = 'started'
            """,
            (
                int(approval_id),
                now,
                int(run_id),
                int(mission_id),
                int(step_id),
            ),
        )
        conn.commit()
    return cursor.rowcount == 1


@requires_gateway
def update_mission_run_after_approval(
    run_id: int,
    approval_id: int,
    status: str,
    output: str = "",
    error: str = "",
) -> bool:
    """Resolve only the run linked to the claimed approval continuation."""

    clean_status = str(status).strip()
    if clean_status not in {"approval_resolved", "approval_rejected", "recovery_required"}:
        raise ValueError("Mission run approval status is invalid.")
    now = datetime.now().isoformat(timespec="seconds")
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        existing = conn.execute(
            "SELECT * FROM mission_runs WHERE id = ?", (int(run_id),)
        ).fetchone()
        if not existing or int(existing["approval_id"] or -1) != int(approval_id):
            return False
        if existing["status"] == clean_status:
            return True
        if existing["status"] != "waiting_approval":
            return False
        cursor = conn.execute(
            """
            UPDATE mission_runs
            SET status = ?, output = ?, error = ?, completed_at = ?
            WHERE id = ? AND approval_id = ? AND status = 'waiting_approval'
            """,
            (
                clean_status,
                str(output),
                str(error),
                now,
                int(run_id),
                int(approval_id),
            ),
        )
        conn.commit()
    return cursor.rowcount == 1


def list_mission_runs(limit: int = 30) -> List[Dict[str, Any]]:
    init_mission_run_db()

    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT *
            FROM mission_runs
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    return [dict(row) for row in rows]


def list_runs_for_mission(mission_id: int, limit: int = 50) -> List[Dict[str, Any]]:
    init_mission_run_db()

    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT *
            FROM mission_runs
            WHERE mission_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (mission_id, limit),
        ).fetchall()

    return [dict(row) for row in rows]


@requires_gateway
def generate_mission_report(mission: Dict[str, Any]) -> str:
    init_mission_run_db()

    mission_id = int(mission["id"])
    runs = list_runs_for_mission(mission_id=mission_id, limit=100)

    safe_title = (
        mission["title"]
        .lower()
        .replace(" ", "_")
        .replace("/", "_")
        .replace("\\", "_")
    )

    file_path = REPORTS_DIR / f"mission_{mission_id}_{safe_title}_report.md"

    steps = mission.get("steps", [])

    step_text = "\n".join(
        f"- Step {step['position']} [{step['status']}]: {step['title']} "
        f"(Step ID: {step['id']})"
        for step in steps
    ) or "No steps recorded."

    run_text = "\n\n".join(
        f"## Run #{run['id']}\n\n"
        f"- Mission ID: {run['mission_id']}\n"
        f"- Step ID: {run['step_id']}\n"
        f"- Step Title: {run['step_title']}\n"
        f"- Status: {run['status']}\n"
        f"- Started: {run['started_at']}\n"
        f"- Completed: {run['completed_at']}\n\n"
        f"### Output\n\n{run['output'] or 'No output.'}\n\n"
        f"### Error\n\n{run['error'] or 'No error.'}"
        for run in runs
    ) or "No mission runs recorded yet."

    content = f"""# Mission Execution Report

## Mission

- Mission ID: {mission['id']}
- Title: {mission['title']}
- Goal: {mission['goal']}
- Status: {mission['status']}
- Priority: {mission['priority']}
- Created: {mission['created_at']}
- Updated: {mission['updated_at']}

## Mission Steps

{step_text}

## Execution History

{run_text}
"""

    file_path.write_text(content, encoding="utf-8")
    return str(file_path)
