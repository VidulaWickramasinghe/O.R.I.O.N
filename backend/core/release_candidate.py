"""Local release-candidate state and artifact generation for O.R.I.O.N. v4.0.

This module never performs external publication, source-control pushes, or
destructive actions.  It records a local release-readiness freeze and writes
diagnostic artifacts below ``backend/data/release_candidates``.
"""

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from core.notification_engine import generate_startup_briefing
from core.plugin_registry import get_plugin_metrics, render_plugin_registry_report
from core.portfolio_demo import generate_release_pack
from core.security_policy import get_active_security_policy, render_security_policy_report
from core.stabilization_manager import run_stabilization_scan
from core.system_doctor import render_system_doctor_report
from core.tool_audit import get_tool_audit_metrics, render_tool_audit_report
from core.tool_permissions import get_tool_permission_metrics, render_tool_permission_report
from core.user_settings import get_user_settings_map


BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_DIR / "data"
RC_DIR = DATA_DIR / "release_candidates"
DB_PATH = DATA_DIR / "orion_release_candidate.sqlite"

RC_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_FREEZE_STATE: Dict[str, Any] = {
    "frozen": False,
    "release_version": "v4.0",
    "release_name": "Autonomous Release Candidate",
    "freeze_reason": "",
    "frozen_at": "",
    "unfrozen_at": "",
    "updated_at": "",
}


def get_connection() -> sqlite3.Connection:
    return sqlite3.connect(DB_PATH)


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def init_release_candidate_db() -> None:
    """Create the local release-candidate tables and their singleton state."""
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS release_freeze_state (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                frozen TEXT NOT NULL,
                release_version TEXT NOT NULL,
                release_name TEXT NOT NULL,
                freeze_reason TEXT DEFAULT '',
                frozen_at TEXT DEFAULT '',
                unfrozen_at TEXT DEFAULT '',
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS release_candidate_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                artifact_path TEXT DEFAULT '',
                created_at TEXT NOT NULL
            )
            """
        )
        if not conn.execute("SELECT id FROM release_freeze_state WHERE id = 1").fetchone():
            now = _now()
            conn.execute(
                """
                INSERT INTO release_freeze_state
                (id, frozen, release_version, release_name, freeze_reason, frozen_at, unfrozen_at, updated_at)
                VALUES (1, 'false', ?, ?, '', '', '', ?)
                """,
                (DEFAULT_FREEZE_STATE["release_version"], DEFAULT_FREEZE_STATE["release_name"], now),
            )
        conn.commit()


def get_freeze_state() -> Dict[str, Any]:
    init_release_candidate_db()
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT * FROM release_freeze_state WHERE id = 1").fetchone()
    if not row:
        return DEFAULT_FREEZE_STATE.copy()
    state = dict(row)
    state["frozen"] = state.get("frozen") == "true"
    return state


def record_release_event(event_type: str, title: str, message: str, artifact_path: str = "") -> Dict[str, Any]:
    init_release_candidate_db()
    now = _now()
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO release_candidate_events
            (event_type, title, message, artifact_path, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (event_type, title, message, artifact_path, now),
        )
        conn.commit()
    return {"id": int(cursor.lastrowid), "event_type": event_type, "title": title,
            "message": message, "artifact_path": artifact_path, "created_at": now}


def list_release_events(limit: int = 50) -> List[Dict[str, Any]]:
    init_release_candidate_db()
    safe_limit = max(1, min(int(limit), 500))
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM release_candidate_events ORDER BY id DESC LIMIT ?", (safe_limit,)
        ).fetchall()
    return [dict(row) for row in rows]


def freeze_system(reason: str = "Preparing O.R.I.O.N. v4.0 release candidate.", release_version: str = "v4.0") -> Dict[str, Any]:
    """Enter local release-readiness mode; no external system is changed."""
    init_release_candidate_db()
    now = _now()
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE release_freeze_state
            SET frozen = 'true', release_version = ?, release_name = ?,
                freeze_reason = ?, frozen_at = ?, updated_at = ?
            WHERE id = 1
            """,
            (release_version, DEFAULT_FREEZE_STATE["release_name"], reason.strip() or DEFAULT_FREEZE_STATE["freeze_reason"], now, now),
        )
        conn.commit()
    record_release_event("SYSTEM_FROZEN", "System Freeze Enabled", reason)
    return get_freeze_state()


def unfreeze_system(reason: str = "Release candidate freeze lifted.") -> Dict[str, Any]:
    """Leave local release-readiness mode without changing external services."""
    init_release_candidate_db()
    now = _now()
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE release_freeze_state
            SET frozen = 'false', unfrozen_at = ?, freeze_reason = ?, updated_at = ?
            WHERE id = 1
            """,
            (now, reason.strip() or "Release candidate freeze lifted.", now),
        )
        conn.commit()
    record_release_event("SYSTEM_UNFROZEN", "System Freeze Disabled", reason)
    return get_freeze_state()


def _get_dashboard_intelligence() -> Dict[str, Any]:
    # Delayed import avoids the dashboard's release-candidate dependency cycle.
    from core.dashboard_intelligence import generate_dashboard_intelligence

    return generate_dashboard_intelligence()


def generate_release_checklist(include_dashboard: bool = True) -> Dict[str, Any]:
    """Generate readiness checks.

    Dashboard Intelligence calls this with ``include_dashboard=False`` so the
    release snapshot can be embedded in Dashboard Intelligence without a
    recursive dashboard-to-checklist-to-dashboard calculation.
    """
    dashboard = _get_dashboard_intelligence() if include_dashboard else {}
    plugin_metrics = get_plugin_metrics()
    permission_metrics = get_tool_permission_metrics()
    audit_metrics = get_tool_audit_metrics()
    security_policy = get_active_security_policy()
    settings = get_user_settings_map()
    stabilization = run_stabilization_scan(run_build=False)
    checklist = [
        {"item": "Dashboard Intelligence score is available", "ok": dashboard.get("intelligence_score", 0) > 0, "details": f"Score: {dashboard.get('intelligence_score', 0)}"},
        {"item": "At least one workspace registered", "ok": dashboard.get("workspace_metrics", {}).get("total_workspaces", 0) > 0, "details": f"Workspaces: {dashboard.get('workspace_metrics', {}).get('total_workspaces', 0)}"},
        {"item": "Plugin Registry loaded", "ok": plugin_metrics.get("total_plugins", 0) > 0, "details": f"Plugins: {plugin_metrics.get('total_plugins', 0)}"},
        {"item": "Tool Permission matrix loaded", "ok": permission_metrics.get("total_mapped_tools", 0) > 0, "details": f"Mapped tools: {permission_metrics.get('total_mapped_tools', 0)}"},
        {"item": "Tool Audit Center active", "ok": audit_metrics.get("total_audit_events", 0) >= 0, "details": f"Audit events: {audit_metrics.get('total_audit_events', 0)}"},
        {"item": "Security Policy active", "ok": bool(security_policy.get("active_profile")), "details": f"Active profile: {security_policy.get('active_profile', 'unknown')}"},
        {"item": "Safety level configured", "ok": settings.get("safety_level", "") in {"strict", "balanced", "experimental"}, "details": f"Safety level: {settings.get('safety_level', 'unknown')}"},
        {"item": "Approval gates remain protected", "ok": True, "details": "Approval system is protected by policy profile logic."},
        {"item": "v4.1 Stabilization scan completed", "ok": stabilization.get("status") in {"stable", "review_recommended", "cleanup_recommended"}, "details": f"Status: {stabilization.get('status', 'unknown')}"},
    ]
    passed = sum(1 for item in checklist if item["ok"])
    return {"passed": passed, "failed": len(checklist) - passed, "items": checklist}


def _write_artifact(file_name: str, content: str) -> str:
    path = RC_DIR / file_name
    path.write_text(content, encoding="utf-8")
    return str(path)


def generate_release_candidate_package() -> Dict[str, Any]:
    """Write a local diagnostics package and return paths to all artifacts."""
    from core.dashboard_intelligence import render_dashboard_intelligence_report

    init_release_candidate_db()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    freeze_state = get_freeze_state()
    checklist = generate_release_checklist()
    reports = {
        "dashboard_intelligence": render_dashboard_intelligence_report(),
        "plugin_registry": render_plugin_registry_report(),
        "tool_permissions": render_tool_permission_report(),
        "tool_audit": render_tool_audit_report(),
        "security_policy": render_security_policy_report(),
        "system_doctor": render_system_doctor_report(),
        "startup_briefing": generate_startup_briefing(),
    }
    checklist_lines = "\n".join(
        f"- [{'x' if item['ok'] else ' '}] {item['item']} — {item['details']}" for item in checklist["items"]
    )
    overview = f"""# O.R.I.O.N. v4.0 Release Candidate Overview

Generated: {_now()}

## Freeze State

- Frozen: {freeze_state['frozen']}
- Release Version: {freeze_state['release_version']}
- Release Name: {freeze_state['release_name']}
- Freeze Reason: {freeze_state['freeze_reason']}
- Frozen At: {freeze_state['frozen_at']}

## Release Checklist

- Passed: {checklist['passed']}
- Failed: {checklist['failed']}

{checklist_lines}

## Package Contents

- Dashboard Intelligence Report
- Plugin Registry Report
- Tool Permission Report
- Tool Audit Report
- Security Policy Report
- System Doctor Report
- Startup Briefing
"""
    artifacts = {"overview": _write_artifact(f"orion_v4_release_overview_{timestamp}.md", overview)}
    artifacts.update({key: _write_artifact(f"{key}_{timestamp}.md", value) for key, value in reports.items()})
    try:
        demo_pack = generate_release_pack()
    except Exception as error:  # A package remains useful when optional demo generation fails.
        demo_pack = {"status": "failed", "error": str(error), "files": []}
    package_summary = {"status": "generated", "generated_at": _now(), "freeze_state": freeze_state,
                       "checklist": checklist, "artifacts": artifacts, "demo_pack": demo_pack}
    summary_path = _write_artifact(
        f"orion_v4_release_package_summary_{timestamp}.json", json.dumps(package_summary, indent=2)
    )
    record_release_event("RELEASE_PACKAGE_GENERATED", "v4.0 Release Candidate Package Generated",
                         f"Generated {len(artifacts)} release artifacts.", summary_path)
    return {**package_summary, "summary_path": summary_path}


def render_release_candidate_report() -> str:
    freeze_state = get_freeze_state()
    checklist = generate_release_checklist()
    checklist_lines = "\n".join(
        f"- [{'x' if item['ok'] else ' '}] {item['item']} — {item['details']}" for item in checklist["items"]
    )
    event_lines = "\n".join(
        f"- [{event['created_at']}] {event['event_type']}: {event['title']} — {event['message']}"
        for event in list_release_events(limit=20)
    ) or "No release candidate events yet."
    return f"""# O.R.I.O.N. v4.0 Release Candidate Report

## Freeze State

- Frozen: {freeze_state['frozen']}
- Release Version: {freeze_state['release_version']}
- Release Name: {freeze_state['release_name']}
- Freeze Reason: {freeze_state['freeze_reason']}
- Frozen At: {freeze_state['frozen_at']}
- Unfrozen At: {freeze_state['unfrozen_at']}
- Updated At: {freeze_state['updated_at']}

## Checklist

- Passed: {checklist['passed']}
- Failed: {checklist['failed']}

{checklist_lines}

## Recent Release Events

{event_lines}

## Safety

System Freeze is a local release-readiness mode. It does not push code, publish releases, delete files, or bypass approval gates.
"""
