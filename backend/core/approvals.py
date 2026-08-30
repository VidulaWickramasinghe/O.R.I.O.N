"""Transactional, idempotent approval storage and execution claims."""

import hashlib
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

from core.capability_gateway import get_active_authorization, requires_gateway
from core.database import managed_connection
from core.runtime_paths import runtime_data_dir


BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = runtime_data_dir()
DB_PATH = DATA_DIR / "orion_approvals.sqlite"
DATA_DIR.mkdir(parents=True, exist_ok=True)

APPROVAL_STATUSES = {"pending", "executing", "approved", "rejected", "failed"}
TERMINAL_APPROVAL_STATUSES = {"approved", "rejected", "failed"}
EXECUTION_STATUSES = {"executing", "succeeded", "rejected", "failed"}


def get_connection():
    return managed_connection(DB_PATH)


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _canonical_payload(payload: Dict[str, Any]) -> str:
    if not isinstance(payload, dict):
        raise ValueError("Approval payload must be a JSON object.")
    try:
        return json.dumps(
            payload,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
        )
    except (TypeError, ValueError) as error:
        raise ValueError("Approval payload must be JSON serializable.") from error


def _payload_hash(payload_json: str) -> str:
    return hashlib.sha256(payload_json.encode("utf-8")).hexdigest()


def _clean_idempotency_key(value: str) -> str:
    clean = str(value or "").strip()
    if len(clean) > 200:
        raise ValueError("Approval idempotency key must be 200 characters or fewer.")
    return clean


def _mission_idempotency_key(
    mission_id: int,
    step_id: int,
    action_type: str,
    payload_hash: str,
) -> str:
    identity = f"mission:{mission_id}:step:{step_id}:{action_type}:{payload_hash}"
    return f"mission-{hashlib.sha256(identity.encode('utf-8')).hexdigest()}"


def init_approval_db() -> None:
    with get_connection() as conn:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS approval_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action_type TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                payload_hash TEXT DEFAULT '',
                idempotency_key TEXT DEFAULT '',
                mission_id INTEGER,
                step_id INTEGER,
                run_id INTEGER,
                session_id TEXT DEFAULT '',
                risk_level TEXT DEFAULT 'medium',
                status TEXT DEFAULT 'pending',
                result TEXT DEFAULT '',
                source TEXT DEFAULT 'O.R.I.O.N.',
                execution_started_at TEXT DEFAULT '',
                completed_at TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        existing_columns = {
            str(row[1]) for row in conn.execute("PRAGMA table_info(approval_requests)")
        }
        migrations = {
            "payload_hash": "TEXT DEFAULT ''",
            "idempotency_key": "TEXT DEFAULT ''",
            "mission_id": "INTEGER",
            "step_id": "INTEGER",
            "run_id": "INTEGER",
            "session_id": "TEXT DEFAULT ''",
            "execution_started_at": "TEXT DEFAULT ''",
            "completed_at": "TEXT DEFAULT ''",
        }
        for column, definition in migrations.items():
            if column not in existing_columns:
                conn.execute(
                    f"ALTER TABLE approval_requests ADD COLUMN {column} {definition}"
                )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS approval_executions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                approval_id INTEGER NOT NULL UNIQUE,
                idempotency_key TEXT NOT NULL UNIQUE,
                payload_hash TEXT NOT NULL,
                status TEXT NOT NULL,
                actor TEXT DEFAULT 'unknown',
                session_id TEXT DEFAULT '',
                result TEXT DEFAULT '',
                error TEXT DEFAULT '',
                claimed_at TEXT NOT NULL,
                completed_at TEXT DEFAULT '',
                updated_at TEXT NOT NULL,
                FOREIGN KEY (approval_id) REFERENCES approval_requests(id)
            )
            """
        )
        execution_columns = {
            str(row[1])
            for row in conn.execute("PRAGMA table_info(approval_executions)")
        }
        if "session_id" not in execution_columns:
            conn.execute(
                "ALTER TABLE approval_executions ADD COLUMN session_id TEXT DEFAULT ''"
            )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS mission_continuations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                approval_id INTEGER NOT NULL UNIQUE,
                continuation_key TEXT NOT NULL UNIQUE,
                mission_id INTEGER NOT NULL,
                step_id INTEGER NOT NULL,
                run_id INTEGER,
                status TEXT NOT NULL DEFAULT 'waiting_approval',
                outcome TEXT DEFAULT '',
                result TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                completed_at TEXT DEFAULT '',
                FOREIGN KEY (approval_id) REFERENCES approval_requests(id)
            )
            """
        )
        rows = conn.execute(
            """
            SELECT id, payload_json, payload_hash, idempotency_key
            FROM approval_requests
            WHERE payload_hash = '' OR idempotency_key = ''
            """
        ).fetchall()
        for approval_id, payload_json, stored_hash, stored_key in rows:
            try:
                payload = json.loads(payload_json)
                canonical = _canonical_payload(payload if isinstance(payload, dict) else {})
            except (json.JSONDecodeError, ValueError):
                canonical = _canonical_payload({})
            conn.execute(
                """
                UPDATE approval_requests
                SET payload_hash = ?, idempotency_key = ?
                WHERE id = ?
                """,
                (
                    stored_hash or _payload_hash(canonical),
                    stored_key or f"legacy-approval-{approval_id}",
                    approval_id,
                ),
            )
        conn.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_approval_idempotency_key "
            "ON approval_requests(idempotency_key)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_approval_mission_step "
            "ON approval_requests(mission_id, step_id, run_id)"
        )
        conn.commit()


def _row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    data = dict(row)
    try:
        data["payload"] = json.loads(data.pop("payload_json"))
    except json.JSONDecodeError:
        data["payload"] = {}
    return data


def _approval_from_connection(
    conn: sqlite3.Connection, approval_id: int
) -> Optional[Dict[str, Any]]:
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT * FROM approval_requests WHERE id = ?", (approval_id,)
    ).fetchone()
    return _row_to_dict(row) if row else None


def _execution_from_connection(
    conn: sqlite3.Connection, approval_id: int
) -> Optional[Dict[str, Any]]:
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT * FROM approval_executions WHERE approval_id = ?", (approval_id,)
    ).fetchone()
    return dict(row) if row else None


def _continuation_from_connection(
    conn: sqlite3.Connection, approval_id: int
) -> Optional[Dict[str, Any]]:
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT * FROM mission_continuations WHERE approval_id = ?", (approval_id,)
    ).fetchone()
    return dict(row) if row else None


@requires_gateway
def create_approval_request(
    action_type: str,
    title: str,
    description: str,
    payload: Dict[str, Any],
    risk_level: str = "medium",
    source: str = "O.R.I.O.N.",
    idempotency_key: str = "",
    mission_id: Optional[int] = None,
    step_id: Optional[int] = None,
    run_id: Optional[int] = None,
) -> int:
    init_approval_db()
    active = get_active_authorization()
    context = active.context if active else None
    context_mission_id = getattr(context, "mission_id", None)
    context_step_id = getattr(context, "step_id", None)
    context_run_id = getattr(context, "run_id", None)
    context_session_id = str(getattr(context, "session_id", "") or "")[:100]
    for name, supplied, authorized_value in (
        ("mission_id", mission_id, context_mission_id),
        ("step_id", step_id, context_step_id),
        ("run_id", run_id, context_run_id),
    ):
        if supplied is not None and supplied != authorized_value:
            raise ValueError(f"Approval {name} does not match the gateway identity.")
    resolved_mission_id = context_mission_id
    resolved_step_id = context_step_id
    resolved_run_id = context_run_id
    if (resolved_mission_id is None) != (resolved_step_id is None):
        raise ValueError("Mission-bound approvals require both mission_id and step_id.")
    clean_action = str(action_type or "").strip()
    if not clean_action:
        raise ValueError("Approval action_type is required.")
    payload_json = _canonical_payload(payload)
    payload_digest = _payload_hash(payload_json)
    clean_key = _clean_idempotency_key(idempotency_key)
    if not clean_key and resolved_mission_id is not None and resolved_step_id is not None:
        clean_key = _mission_idempotency_key(
            int(resolved_mission_id), int(resolved_step_id), clean_action, payload_digest
        )
    clean_key = clean_key or f"approval-{uuid4().hex}"
    now = _now()
    with get_connection() as conn:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("BEGIN IMMEDIATE")
        conn.row_factory = sqlite3.Row
        existing = conn.execute(
            "SELECT * FROM approval_requests WHERE idempotency_key = ?", (clean_key,)
        ).fetchone()
        if existing:
            item = _row_to_dict(existing)
            if item["payload_hash"] != payload_digest or item["action_type"] != clean_action:
                raise ValueError(
                    "Approval idempotency key was reused with a different action or payload."
                )
            return int(item["id"])
        cursor = conn.execute(
            """
            INSERT INTO approval_requests
            (action_type, title, description, payload_json, payload_hash,
             idempotency_key, mission_id, step_id, run_id, risk_level, status,
             session_id, result, source, execution_started_at, completed_at,
             created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, '', ?, '', '', ?, ?)
            """,
            (
                clean_action,
                str(title),
                str(description),
                payload_json,
                payload_digest,
                clean_key,
                resolved_mission_id,
                resolved_step_id,
                resolved_run_id,
                str(risk_level),
                context_session_id,
                str(source),
                now,
                now,
            ),
        )
        approval_id = int(cursor.lastrowid)
        if resolved_mission_id is not None and resolved_step_id is not None:
            conn.execute(
                """
                INSERT INTO mission_continuations
                (approval_id, continuation_key, mission_id, step_id, run_id,
                 status, outcome, result, created_at, updated_at, completed_at)
                VALUES (?, ?, ?, ?, ?, 'waiting_approval', '', '', ?, ?, '')
                """,
                (
                    approval_id,
                    clean_key,
                    int(resolved_mission_id),
                    int(resolved_step_id),
                    int(resolved_run_id) if resolved_run_id is not None else None,
                    now,
                    now,
                ),
            )
        conn.commit()
        return approval_id


def list_approval_requests(
    limit: int = 30, status: Optional[str] = None
) -> List[Dict[str, Any]]:
    init_approval_db()
    bounded_limit = max(1, min(int(limit), 500))
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        if status:
            rows = conn.execute(
                "SELECT * FROM approval_requests WHERE status = ? ORDER BY id DESC LIMIT ?",
                (status, bounded_limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM approval_requests ORDER BY id DESC LIMIT ?",
                (bounded_limit,),
            ).fetchall()
    return [_row_to_dict(row) for row in rows]


def get_approval_request(approval_id: int) -> Optional[Dict[str, Any]]:
    init_approval_db()
    with get_connection() as conn:
        return _approval_from_connection(conn, int(approval_id))


def get_approval_execution(approval_id: int) -> Optional[Dict[str, Any]]:
    init_approval_db()
    with get_connection() as conn:
        return _execution_from_connection(conn, int(approval_id))


def get_mission_continuation(approval_id: int) -> Optional[Dict[str, Any]]:
    init_approval_db()
    with get_connection() as conn:
        return _continuation_from_connection(conn, int(approval_id))


def get_mission_continuation_for_run(run_id: int) -> Optional[Dict[str, Any]]:
    init_approval_db()
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM mission_continuations WHERE run_id = ? ORDER BY id DESC LIMIT 1",
            (int(run_id),),
        ).fetchone()
    return dict(row) if row else None


def get_latest_mission_continuation(mission_id: int, step_id: int) -> Optional[Dict[str, Any]]:
    init_approval_db()
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            """
            SELECT * FROM mission_continuations
            WHERE mission_id = ? AND step_id = ?
            ORDER BY id DESC LIMIT 1
            """,
            (int(mission_id), int(step_id)),
        ).fetchone()
    return dict(row) if row else None


def list_recoverable_mission_continuations(limit: int = 100) -> List[Dict[str, Any]]:
    init_approval_db()
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT c.*, a.status AS approval_status, a.result AS approval_result
            FROM mission_continuations c
            JOIN approval_requests a ON a.id = c.approval_id
            WHERE c.status IN (
                'waiting_approval', 'executing', 'ready_to_resume',
                'ready_to_block'
            )
            ORDER BY c.id ASC LIMIT ?
            """,
            (max(1, min(int(limit), 500)),),
        ).fetchall()
    return [dict(row) for row in rows]


def validate_approval_integrity(approval: Dict[str, Any]) -> tuple[bool, str]:
    try:
        canonical = _canonical_payload(approval.get("payload", {}))
    except ValueError as error:
        return False, str(error)
    if _payload_hash(canonical) != str(approval.get("payload_hash", "")):
        return False, "Approval payload hash does not match the stored payload."
    if not str(approval.get("idempotency_key", "")).strip():
        return False, "Approval idempotency key is missing."
    return True, "Approval payload integrity validated."


@requires_gateway
def claim_approval_execution(
    approval_id: int,
    actor: str,
    expected_idempotency_key: str = "",
) -> Dict[str, Any]:
    init_approval_db()
    active = get_active_authorization()
    authorized_actor = active.context.actor if active else ""
    authorized_session_id = str(active.context.session_id if active else "")[:100]
    if str(actor or "").strip() != authorized_actor:
        raise ValueError("Approval execution actor does not match the gateway identity.")
    now = _now()
    with get_connection() as conn:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("BEGIN IMMEDIATE")
        approval = _approval_from_connection(conn, int(approval_id))
        if not approval:
            return {
                "claimed": False,
                "status": "not_found",
                "approval": None,
                "execution": None,
            }
        valid, reason = validate_approval_integrity(approval)
        if not valid:
            raise ValueError(reason)
        expected_key = _clean_idempotency_key(expected_idempotency_key)
        if expected_key and expected_key != approval["idempotency_key"]:
            raise ValueError(
                "Approval idempotency key does not match the stored request."
            )
        existing_execution = _execution_from_connection(conn, int(approval_id))
        if approval["status"] != "pending":
            return {
                "claimed": False,
                "status": approval["status"],
                "approval": approval,
                "execution": existing_execution,
            }
        cursor = conn.execute(
            """
            UPDATE approval_requests
            SET status = 'executing', execution_started_at = ?, updated_at = ?
            WHERE id = ? AND status = 'pending'
            """,
            (now, now, int(approval_id)),
        )
        if cursor.rowcount != 1:
            approval = _approval_from_connection(conn, int(approval_id))
            return {
                "claimed": False,
                "status": approval["status"] if approval else "not_found",
                "approval": approval,
                "execution": _execution_from_connection(conn, int(approval_id)),
            }
        execution_cursor = conn.execute(
            """
            INSERT INTO approval_executions
            (approval_id, idempotency_key, payload_hash, status, actor, session_id,
             result, error, claimed_at, completed_at, updated_at)
            VALUES (?, ?, ?, 'executing', ?, ?, '', '', ?, '', ?)
            """,
            (
                int(approval_id),
                approval["idempotency_key"],
                approval["payload_hash"],
                authorized_actor[:100],
                authorized_session_id,
                now,
                now,
            ),
        )
        conn.execute(
            """
            UPDATE mission_continuations
            SET status = 'executing', updated_at = ?
            WHERE approval_id = ? AND status = 'waiting_approval'
            """,
            (now, int(approval_id)),
        )
        conn.commit()
        return {
            "claimed": True,
            "status": "executing",
            "approval": _approval_from_connection(conn, int(approval_id)),
            "execution": _execution_from_connection(conn, int(approval_id)),
            "execution_id": int(execution_cursor.lastrowid),
        }


def _finish_execution(
    approval_id: int,
    execution_id: int,
    approval_status: str,
    execution_status: str,
    result: str,
    error: str,
    continuation_status: str,
) -> Dict[str, Any]:
    if approval_status not in TERMINAL_APPROVAL_STATUSES:
        raise ValueError("Approval completion status must be terminal.")
    if execution_status not in EXECUTION_STATUSES - {"executing"}:
        raise ValueError("Execution completion status is invalid.")
    now = _now()
    with get_connection() as conn:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("BEGIN IMMEDIATE")
        execution = _execution_from_connection(conn, int(approval_id))
        approval = _approval_from_connection(conn, int(approval_id))
        if not approval or not execution:
            raise ValueError("Approval execution record was not found.")
        if int(execution["id"]) != int(execution_id):
            raise ValueError("Approval execution ID does not match the active claim.")
        if approval["status"] != "executing" or execution["status"] != "executing":
            raise ValueError("Approval execution is no longer active.")
        execution_update = conn.execute(
            """
            UPDATE approval_executions
            SET status = ?, result = ?, error = ?, completed_at = ?, updated_at = ?
            WHERE id = ? AND approval_id = ? AND status = 'executing'
            """,
            (
                execution_status,
                str(result),
                str(error),
                now,
                now,
                int(execution_id),
                int(approval_id),
            ),
        )
        approval_update = conn.execute(
            """
            UPDATE approval_requests
            SET status = ?, result = ?, completed_at = ?, updated_at = ?
            WHERE id = ? AND status = 'executing'
            """,
            (approval_status, str(result or error), now, now, int(approval_id)),
        )
        if execution_update.rowcount != 1 or approval_update.rowcount != 1:
            raise ValueError("Approval terminal transition lost its execution claim.")
        conn.execute(
            """
            UPDATE mission_continuations
            SET status = ?, outcome = ?, result = ?, updated_at = ?
            WHERE approval_id = ? AND status = 'executing'
            """,
            (
                continuation_status,
                approval_status,
                str(result or error),
                now,
                int(approval_id),
            ),
        )
        conn.commit()
        return {
            "approval": _approval_from_connection(conn, int(approval_id)),
            "execution": _execution_from_connection(conn, int(approval_id)),
            "continuation": _continuation_from_connection(conn, int(approval_id)),
        }


@requires_gateway
def complete_approval_execution(
    approval_id: int, execution_id: int, result: str
) -> Dict[str, Any]:
    return _finish_execution(
        approval_id, execution_id, "approved", "succeeded", result, "", "ready_to_resume"
    )


@requires_gateway
def fail_approval_execution(
    approval_id: int, execution_id: int, error: str
) -> Dict[str, Any]:
    return _finish_execution(
        approval_id, execution_id, "failed", "failed", "", error, "ready_to_block"
    )


@requires_gateway
def reject_approval_request(
    approval_id: int, result: str = "Rejected by user."
) -> Dict[str, Any]:
    init_approval_db()
    active = get_active_authorization()
    authorized_actor = str(active.context.actor if active else "unknown")[:100]
    authorized_session_id = str(active.context.session_id if active else "")[:100]
    now = _now()
    with get_connection() as conn:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("BEGIN IMMEDIATE")
        approval = _approval_from_connection(conn, int(approval_id))
        if not approval:
            return {"transitioned": False, "status": "not_found", "approval": None}
        if approval["status"] != "pending":
            return {
                "transitioned": False,
                "status": approval["status"],
                "approval": approval,
                "execution": _execution_from_connection(conn, int(approval_id)),
            }
        update = conn.execute(
            """
            UPDATE approval_requests
            SET status = 'rejected', result = ?, completed_at = ?, updated_at = ?
            WHERE id = ? AND status = 'pending'
            """,
            (str(result), now, now, int(approval_id)),
        )
        if update.rowcount != 1:
            raise ValueError("Approval rejection lost its pending-state claim.")
        cursor = conn.execute(
            """
            INSERT INTO approval_executions
            (approval_id, idempotency_key, payload_hash, status, actor, session_id,
             result, error, claimed_at, completed_at, updated_at)
            VALUES (?, ?, ?, 'rejected', ?, ?, ?, '', ?, ?, ?)
            """,
            (
                int(approval_id),
                approval["idempotency_key"],
                approval["payload_hash"],
                authorized_actor,
                authorized_session_id,
                str(result),
                now,
                now,
                now,
            ),
        )
        conn.execute(
            """
            UPDATE mission_continuations
            SET status = 'ready_to_block', outcome = 'rejected', result = ?, updated_at = ?
            WHERE approval_id = ? AND status = 'waiting_approval'
            """,
            (str(result), now, int(approval_id)),
        )
        conn.commit()
        return {
            "transitioned": True,
            "status": "rejected",
            "approval": _approval_from_connection(conn, int(approval_id)),
            "execution": _execution_from_connection(conn, int(approval_id)),
            "execution_id": int(cursor.lastrowid),
            "continuation": _continuation_from_connection(conn, int(approval_id)),
        }


@requires_gateway
def mark_mission_continuation_resolved(
    approval_id: int,
    status: str,
    outcome: str,
    result: str,
) -> Dict[str, Any]:
    clean_status = str(status).strip()
    if clean_status not in {"resumed", "blocked", "recovery_required"}:
        raise ValueError("Mission continuation terminal status is invalid.")
    now = _now()
    with get_connection() as conn:
        conn.execute("BEGIN IMMEDIATE")
        continuation = _continuation_from_connection(conn, int(approval_id))
        if not continuation:
            raise ValueError("Mission continuation was not found.")
        if continuation["status"] in {"resumed", "blocked", "recovery_required"}:
            return continuation
        allowed_origins = {
            "resumed": {"ready_to_resume"},
            "blocked": {"ready_to_block"},
            "recovery_required": {"executing", "recovery_required"},
        }
        if continuation["status"] not in allowed_origins[clean_status]:
            raise ValueError(
                f"Mission continuation cannot transition from {continuation['status']} to {clean_status}."
            )
        conn.execute(
            """
            UPDATE mission_continuations
            SET status = ?, outcome = ?, result = ?, updated_at = ?, completed_at = ?
            WHERE approval_id = ?
            """,
            (clean_status, str(outcome), str(result), now, now, int(approval_id)),
        )
        conn.commit()
        return _continuation_from_connection(conn, int(approval_id)) or {}


@requires_gateway
def update_approval_status(approval_id: int, status: str, result: str = "") -> bool:
    """Compatibility API with strict state-machine and execution-record guards."""

    clean_status = str(status).strip().lower()
    if clean_status == "rejected":
        return bool(reject_approval_request(approval_id, result)["transitioned"])
    if clean_status == "executing":
        active = get_active_authorization()
        actor = active.context.actor if active else ""
        return bool(claim_approval_execution(approval_id, actor)["claimed"])
    execution = get_approval_execution(approval_id)
    if clean_status in {"approved", "failed"} and execution:
        if clean_status == "approved":
            complete_approval_execution(approval_id, int(execution["id"]), result)
        else:
            fail_approval_execution(approval_id, int(execution["id"]), result)
        return True
    raise ValueError(
        "Approval status transitions require an atomic claim and matching execution record."
    )
