import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_DIR / "data"
DB_PATH = DATA_DIR / "orion_tool_audit.sqlite"
DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_connection():
    return sqlite3.connect(DB_PATH)


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
                created_at TEXT NOT NULL
            )
            """
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
) -> Dict[str, Any]:
    init_tool_audit_db()
    now = _now()
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO tool_audit_events
            (tool_name, plugin_key, decision, reason, risk_level, category, source, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                tool_name,
                plugin_key,
                decision,
                reason,
                risk_level,
                category,
                source,
                now,
            ),
        )
        conn.commit()
        event_id = int(cursor.lastrowid)
    return {
        "id": event_id,
        "tool_name": tool_name,
        "plugin_key": plugin_key,
        "decision": decision,
        "reason": reason,
        "risk_level": risk_level,
        "category": category,
        "source": source,
        "created_at": now,
    }


def list_tool_audit_events(limit: int = 100, decision: Optional[str] = None) -> List[Dict[str, Any]]:
    init_tool_audit_db()
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        if decision:
            rows = conn.execute(
                """
                SELECT *
                FROM tool_audit_events
                WHERE decision = ?
                ORDER BY id DESC
                LIMIT ?
                """,
                (decision, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT *
                FROM tool_audit_events
                ORDER BY id DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
    return [dict(row) for row in rows]


def get_tool_audit_metrics() -> Dict[str, Any]:
    events = list_tool_audit_events(limit=1000)
    decision_counts: Dict[str, int] = {}
    plugin_counts: Dict[str, int] = {}
    risk_counts: Dict[str, int] = {}
    for event in events:
        decision = event.get("decision", "unknown")
        plugin_key = event.get("plugin_key", "unknown")
        risk_level = event.get("risk_level", "unknown")
        decision_counts[decision] = decision_counts.get(decision, 0) + 1
        plugin_counts[plugin_key] = plugin_counts.get(plugin_key, 0) + 1
        risk_counts[risk_level] = risk_counts.get(risk_level, 0) + 1
    return {
        "total_audit_events": len(events),
        "allowed_events": decision_counts.get("allowed", 0),
        "blocked_events": decision_counts.get("blocked", 0),
        "decision_counts": decision_counts,
        "plugin_counts": plugin_counts,
        "risk_counts": risk_counts,
    }


def render_tool_audit_report() -> str:
    metrics = get_tool_audit_metrics()
    events = list_tool_audit_events(limit=80)
    event_lines = []
    for event in events:
        event_lines.append(
            f"## Event {event['id']}\n\n"
            f"- Tool: {event['tool_name']}\n"
            f"- Plugin: {event['plugin_key'] or 'unmapped'}\n"
            f"- Decision: {event['decision']}\n"
            f"- Risk Level: {event['risk_level']}\n"
            f"- Category: {event['category']}\n"
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
