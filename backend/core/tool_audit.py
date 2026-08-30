import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


from core.database import managed_connection
from core.runtime_paths import runtime_data_dir
BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = runtime_data_dir()
DB_PATH = DATA_DIR / "orion_tool_audit.sqlite"
DATA_DIR.mkdir(parents=True, exist_ok=True)

AUDIT_DECISIONS = {"allowed", "blocked"}
MAX_AUDIT_LIMIT = 500


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
    return datetime.now().isoformat(timespec="seconds")


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
        }
        for column, definition in migrations.items():
            if column not in existing_columns:
                conn.execute(
                    f"ALTER TABLE tool_audit_events ADD COLUMN {column} {definition}"
                )
        conn.commit()


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
    now = _now()
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO tool_audit_events
            (tool_name, plugin_key, decision, reason, risk_level, category, source,
             actor, session_id, policy_profile, mission_id, step_id, run_id,
             approval_id, scope, side_effect, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                now,
            ),
        )
        conn.commit()
        event_id = int(cursor.lastrowid)
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
