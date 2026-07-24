import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from core.plugin_registry import get_plugin_metrics, list_plugins, set_plugin_enabled
from core.tool_audit import record_tool_audit_event
from core.user_settings import update_user_setting


BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_DIR / "data"
DB_PATH = DATA_DIR / "orion_security_policy.sqlite"

DATA_DIR.mkdir(parents=True, exist_ok=True)

PROTECTED_POLICY_PLUGINS = {
    "approval_system",
    "plugin_registry",
    "user_settings",
    "dashboard_intelligence",
    "tool_permission_enforcement",
    "tool_audit_center",
    "security_policy_profiles",
}

SECURITY_PROFILES: Dict[str, Dict[str, Any]] = {
    "strict": {
        "name": "Strict Mode",
        "description": "Maximum safety. High-risk operational plugins are disabled unless essential.",
        "safety_level": "strict",
        "enabled_plugins": {
            "core_safe_tools",
            "project_manager",
            "memory_system",
            "mission_planner",
            "approval_system",
            "workspace_manager",
            "github_release_assistant",
            "context_engine",
            "portfolio_demo",
            "system_doctor",
            "dashboard_intelligence",
            "notification_engine",
            "user_settings",
            "plugin_registry",
            "tool_permission_enforcement",
            "tool_audit_center",
            "security_policy_profiles",
        },
        "disabled_plugins": {
            "developer_tools",
            "browser_research",
            "voice_system",
            "desktop_control",
            "knowledge_base",
            "vector_memory",
            "workflow_blueprints",
            "developer_agent",
            "backend_sidecar",
        },
    },
    "balanced": {
        "name": "Balanced Mode",
        "description": "General productive mode. Most tools enabled, high-risk actions remain approval-gated.",
        "safety_level": "balanced",
        "enabled_plugins": {
            "core_safe_tools",
            "project_manager",
            "developer_tools",
            "memory_system",
            "mission_planner",
            "approval_system",
            "workspace_manager",
            "github_release_assistant",
            "browser_research",
            "voice_system",
            "context_engine",
            "desktop_control",
            "portfolio_demo",
            "system_doctor",
            "knowledge_base",
            "vector_memory",
            "workflow_blueprints",
            "developer_agent",
            "dashboard_intelligence",
            "notification_engine",
            "user_settings",
            "plugin_registry",
            "backend_sidecar",
            "tool_permission_enforcement",
            "tool_audit_center",
            "security_policy_profiles",
        },
        "disabled_plugins": set(),
    },
    "developer_lab": {
        "name": "Developer Lab Mode",
        "description": "Development-focused mode. Enables advanced developer and automation modules while preserving approvals.",
        "safety_level": "experimental",
        "enabled_plugins": {
            "core_safe_tools",
            "project_manager",
            "developer_tools",
            "memory_system",
            "mission_planner",
            "approval_system",
            "workspace_manager",
            "github_release_assistant",
            "browser_research",
            "voice_system",
            "context_engine",
            "desktop_control",
            "portfolio_demo",
            "system_doctor",
            "knowledge_base",
            "vector_memory",
            "workflow_blueprints",
            "developer_agent",
            "dashboard_intelligence",
            "notification_engine",
            "user_settings",
            "plugin_registry",
            "backend_sidecar",
            "tool_permission_enforcement",
            "tool_audit_center",
            "security_policy_profiles",
        },
        "disabled_plugins": set(),
    },
}


def get_connection():
    return sqlite3.connect(DB_PATH)


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def init_security_policy_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS security_policy_state (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                active_profile TEXT NOT NULL,
                applied_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS security_policy_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profile_key TEXT NOT NULL,
                profile_name TEXT NOT NULL,
                summary TEXT NOT NULL,
                enabled_count INTEGER DEFAULT 0,
                disabled_count INTEGER DEFAULT 0,
                source TEXT DEFAULT 'O.R.I.O.N.',
                created_at TEXT NOT NULL
            )
            """
        )
        row = conn.execute("SELECT id FROM security_policy_state WHERE id = 1").fetchone()
        if not row:
            now = _now()
            conn.execute(
                """
                INSERT INTO security_policy_state
                (id, active_profile, applied_at, updated_at)
                VALUES (1, 'balanced', ?, ?)
                """,
                (now, now),
            )
        conn.commit()


def list_security_profiles() -> List[Dict[str, Any]]:
    return [
        {
            "key": key,
            "name": profile["name"],
            "description": profile["description"],
            "safety_level": profile["safety_level"],
            "enabled_plugin_count": len(profile["enabled_plugins"]),
            "disabled_plugin_count": len(profile["disabled_plugins"]),
        }
        for key, profile in SECURITY_PROFILES.items()
    ]


def get_security_profile(profile_key: str) -> Optional[Dict[str, Any]]:
    profile = SECURITY_PROFILES.get(profile_key)
    if not profile:
        return None
    return {
        "key": profile_key,
        "name": profile["name"],
        "description": profile["description"],
        "safety_level": profile["safety_level"],
        "enabled_plugins": sorted(profile["enabled_plugins"]),
        "disabled_plugins": sorted(profile["disabled_plugins"]),
    }


def get_active_security_policy() -> Dict[str, Any]:
    init_security_policy_db()
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT * FROM security_policy_state WHERE id = 1").fetchone()
    state = dict(row) if row else {"active_profile": "balanced", "applied_at": "", "updated_at": ""}
    profile = get_security_profile(state["active_profile"]) or get_security_profile("balanced")
    return {
        "active_profile": state["active_profile"],
        "applied_at": state.get("applied_at", ""),
        "updated_at": state.get("updated_at", ""),
        "profile": profile,
        "plugin_metrics": get_plugin_metrics(),
    }


def apply_security_profile(profile_key: str, source: str = "O.R.I.O.N.") -> Dict[str, Any]:
    init_security_policy_db()
    profile = get_security_profile(profile_key)
    if not profile:
        raise ValueError(f"Security profile not found: {profile_key}")

    all_plugins = list_plugins(limit=300)
    enabled_set = set(profile["enabled_plugins"])
    disabled_set = set(profile["disabled_plugins"])
    enabled_count = 0
    disabled_count = 0
    unchanged_count = 0

    for plugin in all_plugins:
        key = plugin["key"]
        if key in PROTECTED_POLICY_PLUGINS:
            set_plugin_enabled(key, True)
            enabled_count += 1
        elif key in enabled_set:
            set_plugin_enabled(key, True)
            enabled_count += 1
        elif key in disabled_set:
            set_plugin_enabled(key, False)
            disabled_count += 1
        else:
            unchanged_count += 1

    update_user_setting("safety_level", profile["safety_level"])
    now = _now()
    summary = (
        f"Applied {profile['name']}. Enabled: {enabled_count}. "
        f"Disabled: {disabled_count}. Unchanged: {unchanged_count}."
    )

    with get_connection() as conn:
        conn.execute(
            """
            UPDATE security_policy_state
            SET active_profile = ?, applied_at = ?, updated_at = ?
            WHERE id = 1
            """,
            (profile_key, now, now),
        )
        conn.execute(
            """
            INSERT INTO security_policy_events
            (profile_key, profile_name, summary, enabled_count, disabled_count, source, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (profile_key, profile["name"], summary, enabled_count, disabled_count, source, now),
        )
        conn.commit()

    record_tool_audit_event(
        tool_name="apply_security_profile",
        plugin_key="security_policy_profiles",
        decision="allowed",
        reason=summary,
        risk_level="high",
        category="safety",
        source=source,
    )
    return {
        "status": "applied",
        "profile_key": profile_key,
        "profile_name": profile["name"],
        "summary": summary,
        "enabled_count": enabled_count,
        "disabled_count": disabled_count,
        "unchanged_count": unchanged_count,
        "applied_at": now,
        "active_policy": get_active_security_policy(),
    }


def list_security_policy_events(limit: int = 50) -> List[Dict[str, Any]]:
    init_security_policy_db()
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT *
            FROM security_policy_events
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [dict(row) for row in rows]


def render_security_policy_report() -> str:
    active = get_active_security_policy()
    profiles = list_security_profiles()
    events = list_security_policy_events(limit=20)
    profile_lines = [
        f"## {profile['name']}\n\n"
        f"- Key: {profile['key']}\n"
        f"- Safety Level: {profile['safety_level']}\n"
        f"- Enabled Plugins: {profile['enabled_plugin_count']}\n"
        f"- Disabled Plugins: {profile['disabled_plugin_count']}\n"
        f"- Description: {profile['description']}\n"
        for profile in profiles
    ]
    event_lines = [
        f"- [{event['created_at']}] {event['profile_name']} — {event['summary']}"
        for event in events
    ]
    return f"""# O.R.I.O.N. Security Policy Report

## Active Policy

- Active Profile: {active['active_profile']}
- Profile Name: {active['profile']['name']}
- Safety Level: {active['profile']['safety_level']}
- Applied At: {active['applied_at']}
- Updated At: {active['updated_at']}

## Plugin Metrics

- Total Plugins: {active['plugin_metrics']['total_plugins']}
- Enabled Plugins: {active['plugin_metrics']['enabled_plugins']}
- Disabled Plugins: {active['plugin_metrics']['disabled_plugins']}
- High-Risk Enabled: {active['plugin_metrics']['high_risk_enabled']}

## Available Profiles

{chr(10).join(profile_lines)}

## Recent Policy Events

{chr(10).join(event_lines) or 'No policy events yet.'}

## Safety Notes

- Approval System remains protected.
- Plugin Registry remains protected.
- Tool Audit Center remains protected.
- Security Policy Profiles remain protected.
- Policy profiles do not bypass approvals.
"""
