import hashlib
import json
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4


from core.database import managed_connection
from core.runtime_paths import runtime_data_dir
BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = runtime_data_dir()
DB_PATH = DATA_DIR / "orion_tool_audit.sqlite"
DATA_DIR.mkdir(parents=True, exist_ok=True)

AUDIT_DECISIONS = {"allowed", "blocked"}
AUDIT_EXECUTION_STATUSES = {"started", "succeeded", "failed", "cancelled"}
MAX_AUDIT_LIMIT = 500
MAX_AUDIT_RESULT_LENGTH = 8000
SENSITIVE_FIELDS = {
    "api_key",
    "authorization",
    "credential",
    "password",
    "secret",
    "token",
}
SENSITIVE_TEXT_PATTERN = re.compile(
    r"(?i)\b(authorization|api[-_ ]?key|credential|password|secret|token)"
    r"(\s*[:=]\s*)([^\s,;]+)"
)
BEARER_PATTERN = re.compile(r"(?i)\bBearer\s+[A-Za-z0-9._~+/=-]+")


def _clean_text(value: Any, field: str, max_length: int, *, required: bool = False) -> str:
    clean = str(value or "").strip()
    if required and not clean:
        raise ValueError(f"{field} cannot be empty.")
    if len(clean) > max_length:
        raise ValueError(f"{field} must be {max_length} characters or fewer.")
    return clean


def get_connection():
    return managed_connection(DB_PATH)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def _redact_text(value: str) -> str:
    clean = BEARER_PATTERN.sub("Bearer [REDACTED]", value)
    return SENSITIVE_TEXT_PATTERN.sub(r"\1\2[REDACTED]", clean)


def _normalize(value: Any, *, redact: bool) -> Any:
    if isinstance(value, dict):
        return {
            str(key): "[REDACTED]"
            if redact and any(marker in str(key).lower() for marker in SENSITIVE_FIELDS)
            else _normalize(item, redact=redact)
            for key, item in value.items()
        }
    if isinstance(value, (list, tuple)):
        return [_normalize(item, redact=redact) for item in value]
    if isinstance(value, set):
        normalized = [_normalize(item, redact=redact) for item in value]
        return sorted(normalized, key=lambda item: json.dumps(item, sort_keys=True, default=repr))
    if isinstance(value, bytes):
        if redact:
            return f"<bytes:{len(value)}>"
        return {
            "bytes": len(value),
            "sha256": hashlib.sha256(value).hexdigest(),
        }
    if isinstance(value, str):
        return _redact_text(value) if redact else value
    if value is None or isinstance(value, (int, float, bool)):
        return value
    rendered = repr(value)
    return _redact_text(rendered) if redact else rendered


def _canonical_json(value: Any, *, redact: bool = True) -> str:
    return json.dumps(
        _normalize(value, redact=redact),
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )


def hash_audit_arguments(value: Any) -> str:
    """Hash canonical arguments without persisting their raw values."""

    return hashlib.sha256(
        _canonical_json(value, redact=False).encode("utf-8")
    ).hexdigest()


def _result_text(value: Any) -> str:
    if value is None:
        return ""
    text = _redact_text(value) if isinstance(value, str) else _canonical_json(value)
    return str(text)[:MAX_AUDIT_RESULT_LENGTH]


def init_tool_audit_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tool_audit_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tool_name TEXT NOT NULL,
                plugin_key TEXT DEFAULT '',
                decision TEXT NOT NULL,
                reason TEXT DEFAULT '',
                risk_level TEXT DEFAULT 'unknown',
                category TEXT DEFAULT 'unknown',
                source TEXT DEFAULT 'O.R.I.O.N.',
                actor TEXT DEFAULT 'unknown',
                session_id TEXT DEFAULT '',
                policy_profile TEXT DEFAULT 'unknown',
                mission_id INTEGER,
                step_id INTEGER,
                run_id INTEGER,
                approval_id INTEGER,
                scope TEXT DEFAULT '',
                side_effect INTEGER DEFAULT 0,
                correlation_id TEXT DEFAULT '',
                arguments_hash TEXT DEFAULT '',
                result TEXT DEFAULT '',
                duration_ms REAL,
                created_at TEXT NOT NULL
            )
            """
        )
        existing_columns = {
            str(row[1]) for row in conn.execute("PRAGMA table_info(tool_audit_events)")
        }
        migrations = {
            "actor": "TEXT DEFAULT 'unknown'",
            "session_id": "TEXT DEFAULT ''",
            "policy_profile": "TEXT DEFAULT 'unknown'",
            "mission_id": "INTEGER",
            "step_id": "INTEGER",
            "run_id": "INTEGER",
            "approval_id": "INTEGER",
            "scope": "TEXT DEFAULT ''",
            "side_effect": "INTEGER DEFAULT 0",
            "correlation_id": "TEXT DEFAULT ''",
            "arguments_hash": "TEXT DEFAULT ''",
            "result": "TEXT DEFAULT ''",
            "duration_ms": "REAL",
        }
        for column, definition in migrations.items():
            if column not in existing_columns:
                conn.execute(
                    f"ALTER TABLE tool_audit_events ADD COLUMN {column} {definition}"
                )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                correlation_id TEXT NOT NULL,
                sequence INTEGER NOT NULL,
                parent_event_id INTEGER,
                event_type TEXT NOT NULL,
                phase TEXT NOT NULL,
                status TEXT DEFAULT '',
                actor TEXT DEFAULT 'unknown',
                source TEXT DEFAULT 'O.R.I.O.N.',
                session_id TEXT DEFAULT '',
                mission_id INTEGER,
                step_id INTEGER,
                run_id INTEGER,
                tool_name TEXT DEFAULT '',
                plugin_key TEXT DEFAULT '',
                policy_profile TEXT DEFAULT 'unknown',
                approval_id INTEGER,
                scope TEXT DEFAULT '',
                decision TEXT DEFAULT '',
                arguments_hash TEXT DEFAULT '',
                result TEXT DEFAULT '',
                result_hash TEXT DEFAULT '',
                duration_ms REAL,
                reason TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                completed_at TEXT DEFAULT '',
                UNIQUE(correlation_id, sequence)
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_audit_events_mission_order "
            "ON audit_events(mission_id, created_at, id)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_audit_events_correlation "
            "ON audit_events(correlation_id, sequence)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_audit_events_approval "
            "ON audit_events(approval_id, created_at, id)"
        )
        conn.commit()


def record_audit_event(
    event_type: str,
    phase: str,
    *,
    status: str = "",
    actor: str = "unknown",
    source: str = "O.R.I.O.N.",
    session_id: str = "",
    mission_id: Optional[int] = None,
    step_id: Optional[int] = None,
    run_id: Optional[int] = None,
    tool_name: str = "",
    plugin_key: str = "",
    policy_profile: str = "unknown",
    approval_id: Optional[int] = None,
    scope: str = "",
    decision: str = "",
    arguments_hash: str = "",
    result: Any = None,
    duration_ms: Optional[float] = None,
    reason: str = "",
    correlation_id: str = "",
    parent_event_id: Optional[int] = None,
) -> Dict[str, Any]:
    """Persist one immutable, correlated audit event.

    Raw arguments are never stored. Callers provide only their canonical hash.
    Result values are bounded and recursively redact common secret fields.
    """

    init_tool_audit_db()
    clean_correlation_id = _clean_text(
        correlation_id or uuid4().hex, "correlation_id", 128, required=True
    )
    clean_event_type = _clean_text(event_type, "event_type", 120, required=True)
    clean_phase = _clean_text(phase, "phase", 64, required=True)
    clean_status = _clean_text(status, "status", 32)
    clean_actor = _clean_text(actor, "actor", 100) or "unknown"
    clean_source = _clean_text(source, "source", 200) or "O.R.I.O.N."
    clean_session_id = _clean_text(session_id, "session_id", 100)
    clean_tool_name = _clean_text(tool_name, "tool_name", 120)
    clean_plugin_key = _clean_text(plugin_key, "plugin_key", 100)
    clean_policy = _clean_text(policy_profile, "policy_profile", 100) or "unknown"
    clean_scope = _clean_text(scope, "scope", 200)
    clean_decision = _clean_text(decision, "decision", 16).lower()
    if clean_decision and clean_decision not in AUDIT_DECISIONS:
        raise ValueError("decision must be empty, 'allowed', or 'blocked'.")
    clean_arguments_hash = _clean_text(arguments_hash, "arguments_hash", 64)
    if clean_arguments_hash and (
        len(clean_arguments_hash) != 64
        or any(character not in "0123456789abcdef" for character in clean_arguments_hash.lower())
    ):
        raise ValueError("arguments_hash must be a SHA-256 hexadecimal digest.")
    clean_reason = _clean_text(reason, "reason", 4000)
    clean_result = _result_text(result)
    result_hash = (
        hashlib.sha256(clean_result.encode("utf-8")).hexdigest()
        if clean_result
        else ""
    )
    now = _now()
    completed_at = now if clean_status in AUDIT_EXECUTION_STATUSES - {"started"} else ""
    with get_connection() as conn:
        conn.execute("BEGIN IMMEDIATE")
        sequence = int(
            conn.execute(
                "SELECT COALESCE(MAX(sequence), 0) + 1 FROM audit_events WHERE correlation_id = ?",
                (clean_correlation_id,),
            ).fetchone()[0]
        )
        cursor = conn.execute(
            """
            INSERT INTO audit_events
            (correlation_id, sequence, parent_event_id, event_type, phase, status,
             actor, source, session_id, mission_id, step_id, run_id, tool_name,
             plugin_key, policy_profile, approval_id, scope, decision,
             arguments_hash, result, result_hash, duration_ms, reason, created_at,
             completed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                clean_correlation_id,
                sequence,
                parent_event_id,
                clean_event_type,
                clean_phase,
                clean_status,
                clean_actor,
                clean_source,
                clean_session_id,
                mission_id,
                step_id,
                run_id,
                clean_tool_name,
                clean_plugin_key,
                clean_policy,
                approval_id,
                clean_scope,
                clean_decision,
                clean_arguments_hash,
                clean_result,
                result_hash,
                float(duration_ms) if duration_ms is not None else None,
                clean_reason,
                now,
                completed_at,
            ),
        )
        event_id = int(cursor.lastrowid)
        conn.commit()
    return {
        "id": event_id,
        "correlation_id": clean_correlation_id,
        "sequence": sequence,
        "parent_event_id": parent_event_id,
        "event_type": clean_event_type,
        "phase": clean_phase,
        "status": clean_status,
        "actor": clean_actor,
        "source": clean_source,
        "session_id": clean_session_id,
        "mission_id": mission_id,
        "step_id": step_id,
        "run_id": run_id,
        "tool_name": clean_tool_name,
        "plugin_key": clean_plugin_key,
        "policy_profile": clean_policy,
        "approval_id": approval_id,
        "scope": clean_scope,
        "decision": clean_decision,
        "arguments_hash": clean_arguments_hash,
        "result": clean_result,
        "result_hash": result_hash,
        "duration_ms": float(duration_ms) if duration_ms is not None else None,
        "reason": clean_reason,
        "created_at": now,
        "completed_at": completed_at,
    }


def complete_audit_event(
    event_id: int,
    *,
    status: str,
    result: Any = None,
    duration_ms: Optional[float] = None,
    reason: str = "",
) -> Dict[str, Any]:
    """Atomically finish a started execution record; terminal rows are immutable."""

    clean_status = _clean_text(status, "status", 32, required=True).lower()
    if clean_status not in AUDIT_EXECUTION_STATUSES - {"started"}:
        raise ValueError("Audit completion status must be succeeded, failed, or cancelled.")
    clean_result = _result_text(result)
    result_hash = (
        hashlib.sha256(clean_result.encode("utf-8")).hexdigest()
        if clean_result
        else ""
    )
    clean_reason = _clean_text(reason, "reason", 4000)
    completed_at = _now()
    init_tool_audit_db()
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        conn.execute("BEGIN IMMEDIATE")
        cursor = conn.execute(
            """
            UPDATE audit_events
            SET status = ?, result = ?, result_hash = ?, duration_ms = ?,
                reason = ?, completed_at = ?
            WHERE id = ? AND status = 'started'
            """,
            (
                clean_status,
                clean_result,
                result_hash,
                float(duration_ms) if duration_ms is not None else None,
                clean_reason,
                completed_at,
                int(event_id),
            ),
        )
        if cursor.rowcount != 1:
            raise ValueError("Audit execution is missing or already terminal.")
        row = conn.execute("SELECT * FROM audit_events WHERE id = ?", (int(event_id),)).fetchone()
        conn.commit()
    return dict(row)


def list_audit_events(
    *,
    limit: int = 200,
    mission_id: Optional[int] = None,
    correlation_id: str = "",
    phase: str = "",
) -> List[Dict[str, Any]]:
    init_tool_audit_db()
    clauses: List[str] = []
    values: List[Any] = []
    if mission_id is not None:
        clauses.append("mission_id = ?")
        values.append(int(mission_id))
    if correlation_id:
        clauses.append("correlation_id = ?")
        values.append(_clean_text(correlation_id, "correlation_id", 128, required=True))
    if phase:
        clauses.append("phase = ?")
        values.append(_clean_text(phase, "phase", 64, required=True))
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    bounded_limit = max(1, min(int(limit), 5000))
    values.append(bounded_limit)
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            f"SELECT * FROM audit_events {where} ORDER BY created_at ASC, id ASC LIMIT ?",
            tuple(values),
        ).fetchall()
    return [dict(row) for row in rows]


def build_mission_audit_timeline(
    mission_id: int, limit: int = 5000
) -> List[Dict[str, Any]]:
    """Merge durable mission, approval, run, and gateway evidence in order."""

    from core.approvals import list_approval_requests_for_mission
    from core.mission_manager import list_mission_transitions
    from core.mission_planner import get_mission_record
    from core.mission_run_history import list_runs_for_mission

    clean_mission_id = int(mission_id)
    mission = get_mission_record(clean_mission_id)
    if not mission:
        return []
    timeline: List[Dict[str, Any]] = [
        {
            "timestamp": mission["created_at"],
            "category": "plan",
            "event_type": "mission.plan.created",
            "correlation_id": f"mission:{clean_mission_id}:plan",
            "actor": "user",
            "mission_id": clean_mission_id,
            "step_id": None,
            "run_id": None,
            "tool": "create_mission",
            "policy": "",
            "approval_id": None,
            "arguments_hash": "",
            "result": {
                "title": mission["title"],
                "goal": mission["goal"],
                "steps": [
                    {
                        "id": step["id"],
                        "position": step["position"],
                        "title": step["title"],
                    }
                    for step in mission.get("steps", [])
                ],
            },
            "duration_ms": None,
            "_sort_rank": 0,
            "_sort_id": 0,
        }
    ]
    for event in list_audit_events(mission_id=clean_mission_id, limit=limit):
        timeline.append(
            {
                "timestamp": event["created_at"],
                "category": event["phase"],
                "event_type": event["event_type"],
                "correlation_id": event["correlation_id"],
                "actor": event["actor"],
                "mission_id": event["mission_id"],
                "step_id": event["step_id"],
                "run_id": event["run_id"],
                "tool": event["tool_name"],
                "policy": event["policy_profile"],
                "approval_id": event["approval_id"],
                "arguments_hash": event["arguments_hash"],
                "result": event["result"],
                "duration_ms": event["duration_ms"],
                "decision": event["decision"],
                "status": event["status"],
                "reason": event["reason"],
                "sequence": event["sequence"],
                "_sort_rank": {
                    "decision": 10,
                    "execution": 20,
                    "action": 30,
                    "approval": 40,
                    "transition": 50,
                    "result": 60,
                    "activity": 70,
                }.get(event["phase"], 80),
                "_sort_id": event["id"],
            }
        )
    for transition in list_mission_transitions(clean_mission_id, limit=limit):
        timeline.append(
            {
                "timestamp": transition["created_at"],
                "category": "transition",
                "event_type": f"mission.{transition['entity_type']}.transition",
                "correlation_id": f"mission:{clean_mission_id}:transition:{transition['id']}",
                "actor": transition["actor"],
                "mission_id": clean_mission_id,
                "step_id": transition.get("step_id"),
                "run_id": transition.get("run_id"),
                "tool": "mission_state_machine",
                "policy": "",
                "approval_id": None,
                "arguments_hash": "",
                "result": {
                    "from": transition["from_state"],
                    "to": transition["to_state"],
                    "cause": transition["cause"],
                    "evaluator_outcome": transition.get("evaluator_outcome", ""),
                },
                "duration_ms": None,
                "_sort_rank": 50,
                "_sort_id": transition["id"],
            }
        )
    for approval in list_approval_requests_for_mission(clean_mission_id, limit=limit):
        correlated = next(
            (
                item["correlation_id"]
                for item in timeline
                if item.get("approval_id") == approval["id"]
            ),
            f"approval:{approval['id']}",
        )
        timeline.append(
            {
                "timestamp": approval["created_at"],
                "category": "approval",
                "event_type": "mission.approval",
                "correlation_id": correlated,
                "actor": "user" if approval["status"] in {"approved", "rejected"} else "agent",
                "mission_id": clean_mission_id,
                "step_id": approval.get("step_id"),
                "run_id": approval.get("run_id"),
                "tool": approval["action_type"],
                "policy": "",
                "approval_id": approval["id"],
                "arguments_hash": approval["payload_hash"],
                "result": approval["result"],
                "duration_ms": None,
                "status": approval["status"],
                "_sort_rank": 40,
                "_sort_id": approval["id"],
            }
        )
    for run in list_runs_for_mission(clean_mission_id, limit=limit):
        timeline.append(
            {
                "timestamp": run["started_at"],
                "category": "result",
                "event_type": "mission.run.result",
                "correlation_id": f"mission:{clean_mission_id}:run:{run['id']}",
                "actor": "mission_agent",
                "mission_id": clean_mission_id,
                "step_id": run.get("step_id"),
                "run_id": run["id"],
                "tool": "mission_runner",
                "policy": "",
                "approval_id": run.get("approval_id"),
                "arguments_hash": "",
                "result": run.get("output") or run.get("error") or "",
                "duration_ms": None,
                "status": run["status"],
                "_sort_rank": 60,
                "_sort_id": run["id"],
            }
        )
    timeline.sort(
        key=lambda item: (
            str(item.get("timestamp") or ""),
            int(item.get("_sort_rank") or 0),
            int(item.get("_sort_id") or 0),
        )
    )
    bounded = timeline[: max(1, min(int(limit), 5000))]
    for item in bounded:
        item.pop("_sort_rank", None)
        item.pop("_sort_id", None)
    return bounded


def record_tool_audit_event(
    tool_name: str,
    plugin_key: str,
    decision: str,
    reason: str,
    risk_level: str = "unknown",
    category: str = "unknown",
    source: str = "O.R.I.O.N.",
    actor: str = "unknown",
    session_id: str = "",
    policy_profile: str = "unknown",
    mission_id: Optional[int] = None,
    step_id: Optional[int] = None,
    run_id: Optional[int] = None,
    approval_id: Optional[int] = None,
    scope: str = "",
    side_effect: bool = False,
    correlation_id: str = "",
    arguments_hash: str = "",
    result: Any = None,
    duration_ms: Optional[float] = None,
) -> Dict[str, Any]:
    init_tool_audit_db()
    clean_tool_name = _clean_text(tool_name, "tool_name", 120, required=True)
    clean_plugin_key = _clean_text(plugin_key, "plugin_key", 100)
    clean_decision = _clean_text(decision, "decision", 16, required=True).lower()
    if clean_decision not in AUDIT_DECISIONS:
        raise ValueError("decision must be 'allowed' or 'blocked'.")
    clean_reason = _clean_text(reason, "reason", 1000)
    clean_risk_level = _clean_text(risk_level, "risk_level", 32) or "unknown"
    clean_category = _clean_text(category, "category", 64) or "unknown"
    clean_source = _clean_text(source, "source", 100) or "O.R.I.O.N."
    clean_actor = _clean_text(actor, "actor", 100) or "unknown"
    clean_session_id = _clean_text(session_id, "session_id", 100)
    clean_policy_profile = _clean_text(policy_profile, "policy_profile", 100) or "unknown"
    clean_scope = _clean_text(scope, "scope", 200)
    clean_correlation_id = _clean_text(
        correlation_id or uuid4().hex, "correlation_id", 128, required=True
    )
    clean_arguments_hash = _clean_text(arguments_hash, "arguments_hash", 64)
    clean_result = _result_text(result)
    now = _now()
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO tool_audit_events
            (tool_name, plugin_key, decision, reason, risk_level, category, source,
             actor, session_id, policy_profile, mission_id, step_id, run_id,
             approval_id, scope, side_effect, correlation_id, arguments_hash,
             result, duration_ms, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                clean_tool_name,
                clean_plugin_key,
                clean_decision,
                clean_reason,
                clean_risk_level,
                clean_category,
                clean_source,
                clean_actor,
                clean_session_id,
                clean_policy_profile,
                mission_id,
                step_id,
                run_id,
                approval_id,
                clean_scope,
                1 if side_effect else 0,
                clean_correlation_id,
                clean_arguments_hash,
                clean_result,
                float(duration_ms) if duration_ms is not None else None,
                now,
            ),
        )
        conn.commit()
        event_id = int(cursor.lastrowid)
    record_audit_event(
        "capability.decision",
        "decision",
        status="succeeded" if clean_decision == "allowed" else "failed",
        actor=clean_actor,
        source=clean_source,
        session_id=clean_session_id,
        mission_id=mission_id,
        step_id=step_id,
        run_id=run_id,
        tool_name=clean_tool_name,
        plugin_key=clean_plugin_key,
        policy_profile=clean_policy_profile,
        approval_id=approval_id,
        scope=clean_scope,
        decision=clean_decision,
        arguments_hash=clean_arguments_hash,
        result=clean_result,
        duration_ms=duration_ms,
        reason=clean_reason,
        correlation_id=clean_correlation_id,
    )
    return {
        "id": event_id,
        "tool_name": clean_tool_name,
        "plugin_key": clean_plugin_key,
        "decision": clean_decision,
        "reason": clean_reason,
        "risk_level": clean_risk_level,
        "category": clean_category,
        "source": clean_source,
        "actor": clean_actor,
        "session_id": clean_session_id,
        "policy_profile": clean_policy_profile,
        "mission_id": mission_id,
        "step_id": step_id,
        "run_id": run_id,
        "approval_id": approval_id,
        "scope": clean_scope,
        "side_effect": bool(side_effect),
        "correlation_id": clean_correlation_id,
        "arguments_hash": clean_arguments_hash,
        "result": clean_result,
        "duration_ms": float(duration_ms) if duration_ms is not None else None,
        "created_at": now,
    }


def list_tool_audit_events(limit: int = 100, decision: Optional[str] = None) -> List[Dict[str, Any]]:
    init_tool_audit_db()
    clean_limit = max(1, min(int(limit), MAX_AUDIT_LIMIT))
    clean_decision = None
    if decision is not None:
        clean_decision = str(decision).strip().lower()
        if clean_decision not in AUDIT_DECISIONS:
            raise ValueError("decision filter must be 'allowed' or 'blocked'.")
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        if clean_decision:
            rows = conn.execute(
                """
                SELECT *
                FROM tool_audit_events
                WHERE decision = ?
                ORDER BY id DESC
                LIMIT ?
                """,
                (clean_decision, clean_limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT *
                FROM tool_audit_events
                ORDER BY id DESC
                LIMIT ?
                """,
                (clean_limit,),
            ).fetchall()
    events = [dict(row) for row in rows]
    for event in events:
        event["side_effect"] = bool(event.get("side_effect", False))
    return events


def get_tool_audit_metrics() -> Dict[str, Any]:
    init_tool_audit_db()
    with get_connection() as conn:
        total = int(conn.execute("SELECT COUNT(*) FROM tool_audit_events").fetchone()[0])
        decision_counts = dict(
            conn.execute(
                "SELECT decision, COUNT(*) FROM tool_audit_events GROUP BY decision"
            ).fetchall()
        )
        plugin_counts = dict(
            conn.execute(
                "SELECT plugin_key, COUNT(*) FROM tool_audit_events GROUP BY plugin_key"
            ).fetchall()
        )
        risk_counts = dict(
            conn.execute(
                "SELECT risk_level, COUNT(*) FROM tool_audit_events GROUP BY risk_level"
            ).fetchall()
        )
    return {
        "total_audit_events": total,
        "allowed_events": decision_counts.get("allowed", 0),
        "blocked_events": decision_counts.get("blocked", 0),
        "decision_counts": decision_counts,
        "plugin_counts": plugin_counts,
        "risk_counts": risk_counts,
    }


def get_tool_audit_snapshot(limit: int = 80) -> Dict[str, Any]:
    return {
        "metrics": get_tool_audit_metrics(),
        "events": list_tool_audit_events(limit=limit),
    }


def render_tool_audit_report(snapshot: Optional[Dict[str, Any]] = None) -> str:
    snapshot = snapshot or get_tool_audit_snapshot()
    metrics = snapshot["metrics"]
    events = snapshot["events"]
    event_lines = []
    for event in events:
        event_lines.append(
            f"## Event {event['id']}\n\n"
            f"- Tool: {event['tool_name']}\n"
            f"- Plugin: {event['plugin_key'] or 'unmapped'}\n"
            f"- Decision: {event['decision']}\n"
            f"- Risk Level: {event['risk_level']}\n"
            f"- Category: {event['category']}\n"
            f"- Actor: {event.get('actor', 'unknown')}\n"
            f"- Local Session: {event.get('session_id', '') or 'none'}\n"
            f"- Policy: {event.get('policy_profile', 'unknown')}\n"
            f"- Scope: {event.get('scope', '') or 'none'}\n"
            f"- Mission: {event.get('mission_id') or 'none'}\n"
            f"- Step: {event.get('step_id') or 'none'}\n"
            f"- Approval: {event.get('approval_id') or 'none'}\n"
            f"- Side Effect: {bool(event.get('side_effect', False))}\n"
            f"- Reason: {event['reason']}\n"
            f"- Created: {event['created_at']}\n"
        )
    return f"""# O.R.I.O.N. Tool Audit Center Report

## Metrics

- Total Audit Events: {metrics['total_audit_events']}
- Allowed Events: {metrics['allowed_events']}
- Blocked Events: {metrics['blocked_events']}

## Risk Counts

{chr(10).join(f"- {key}: {value}" for key, value in metrics['risk_counts'].items()) or '- None'}

## Plugin Counts

{chr(10).join(f"- {key}: {value}" for key, value in metrics['plugin_counts'].items()) or '- None'}

## Recent Events

{chr(10).join(event_lines) or 'No audit events recorded yet.'}
"""
