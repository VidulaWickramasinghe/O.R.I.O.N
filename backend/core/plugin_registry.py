import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_DIR / "data"
DB_PATH = DATA_DIR / "orion_plugins.sqlite"

DATA_DIR.mkdir(parents=True, exist_ok=True)

PLUGIN_DEFINITIONS: List[Dict[str, Any]] = [
    {
        "key": "core_safe_tools",
        "name": "Core Safe Tools",
        "description": "Basic safe notes, logs, and utility actions.",
        "category": "core",
        "risk_level": "low",
        "permissions": ["notes", "activity_log"],
        "default_enabled": True,
    },
    {
        "key": "project_manager",
        "name": "Project Manager",
        "description": "Project registration, notes, status, roadmap, and portfolio summaries.",
        "category": "project",
        "risk_level": "low",
        "permissions": ["project_memory"],
        "default_enabled": True,
    },
    {
        "key": "developer_tools",
        "name": "Developer Tools",
        "description": "Approval-gated file writing and safe terminal command requests.",
        "category": "developer",
        "risk_level": "high",
        "permissions": ["read_files", "request_file_write", "request_safe_command"],
        "default_enabled": True,
    },
    {
        "key": "memory_system",
        "name": "Persistent Memory",
        "description": "SQLite memory storage, search, and retrieval.",
        "category": "memory",
        "risk_level": "medium",
        "permissions": ["memory_read", "memory_write"],
        "default_enabled": True,
    },
    {
        "key": "mission_planner",
        "name": "Mission Planner",
        "description": "Mission creation, step tracking, controlled mission execution, and reports.",
        "category": "mission",
        "risk_level": "medium",
        "permissions": ["mission_create", "mission_update", "mission_run"],
        "default_enabled": True,
    },
    {
        "key": "approval_system",
        "name": "Command Approval System",
        "description": "Manual approval gate for file, command, desktop, and developer actions.",
        "category": "safety",
        "risk_level": "high",
        "permissions": ["approval_create", "approval_execute"],
        "default_enabled": True,
    },
    {
        "key": "workspace_manager",
        "name": "Workspace Manager",
        "description": "Registered workspace inspection, stack detection, and file reading.",
        "category": "workspace",
        "risk_level": "medium",
        "permissions": ["workspace_read", "workspace_inspect"],
        "default_enabled": True,
    },
    {
        "key": "github_release_assistant",
        "name": "GitHub Release Assistant",
        "description": "Release readiness, release notes, checklists, and commit message preparation.",
        "category": "release",
        "risk_level": "low",
        "permissions": ["release_prepare"],
        "default_enabled": True,
    },
    {
        "key": "browser_research",
        "name": "Browser Research",
        "description": "Public webpage research, comparison, and research report generation.",
        "category": "research",
        "risk_level": "medium",
        "permissions": ["public_web_read"],
        "default_enabled": True,
    },
    {
        "key": "voice_system",
        "name": "Voice + Wake Phrase",
        "description": "Voice input, speech output, wake phrase mode, and voice state.",
        "category": "voice",
        "risk_level": "medium",
        "permissions": ["microphone", "speech_output"],
        "default_enabled": True,
    },
    {
        "key": "context_engine",
        "name": "Context Engine",
        "description": "Retrieves project, memory, mission, workspace, activity, and profile context.",
        "category": "intelligence",
        "risk_level": "medium",
        "permissions": ["context_retrieval"],
        "default_enabled": True,
    },
    {
        "key": "desktop_control",
        "name": "Desktop Control",
        "description": "Approval-gated VS Code, folder, URL, and dev server launching.",
        "category": "desktop",
        "risk_level": "high",
        "permissions": ["desktop_open", "dev_server_start"],
        "default_enabled": True,
    },
    {
        "key": "portfolio_demo",
        "name": "Portfolio Demo Mode",
        "description": "Demo readiness, case study, screenshot checklist, and release pack generation.",
        "category": "portfolio",
        "risk_level": "low",
        "permissions": ["demo_generate"],
        "default_enabled": True,
    },
    {
        "key": "system_doctor",
        "name": "System Doctor",
        "description": "Production readiness, dependency, environment, and safety diagnostics.",
        "category": "diagnostics",
        "risk_level": "low",
        "permissions": ["system_diagnostics"],
        "default_enabled": True,
    },
    {
        "key": "knowledge_base",
        "name": "Knowledge Base",
        "description": "Local document indexing, knowledge search, and document summaries.",
        "category": "knowledge",
        "risk_level": "medium",
        "permissions": ["local_file_read", "knowledge_index"],
        "default_enabled": True,
    },
    {
        "key": "vector_memory",
        "name": "Vector Memory",
        "description": "Embedding-based memory and knowledge semantic search.",
        "category": "intelligence",
        "risk_level": "medium",
        "permissions": ["embedding_create", "semantic_search"],
        "default_enabled": True,
    },
    {
        "key": "workflow_blueprints",
        "name": "Workflow Blueprints",
        "description": "Reusable mission templates and blueprint-to-mission generation.",
        "category": "workflow",
        "risk_level": "low",
        "permissions": ["workflow_create"],
        "default_enabled": True,
    },
    {
        "key": "developer_agent",
        "name": "Agentic Developer Mode",
        "description": "Workspace inspection, diagnosis, patch plans, reports, and approval-gated patches.",
        "category": "developer",
        "risk_level": "high",
        "permissions": ["developer_inspect", "patch_request", "report_generate"],
        "default_enabled": True,
    },
    {
        "key": "dashboard_intelligence",
        "name": "Dashboard Intelligence",
        "description": "System scoring, analytics, recommendations, and readiness metrics.",
        "category": "analytics",
        "risk_level": "low",
        "permissions": ["analytics_read"],
        "default_enabled": True,
    },
    {
        "key": "notification_engine",
        "name": "Notification Engine",
        "description": "Local reminders, notification events, and startup briefings.",
        "category": "notifications",
        "risk_level": "low",
        "permissions": ["local_reminders"],
        "default_enabled": True,
    },
    {
        "key": "backend_sidecar",
        "name": "Backend Sidecar",
        "description": "Local backend process manager and one-click desktop launch support.",
        "category": "desktop",
        "risk_level": "medium",
        "permissions": ["backend_start", "backend_stop", "process_status"],
        "default_enabled": True,
    },
    {
        "key": "tool_permission_enforcement",
        "name": "Tool Permission Enforcement",
        "description": "Checks plugin enabled/disabled state before protected tools execute.",
        "category": "safety",
        "risk_level": "high",
        "permissions": ["tool_gate", "plugin_enforcement", "blocked_tool_logging"],
        "default_enabled": True,
    },
    {
        "key": "tool_audit_center",
        "name": "Tool Audit Center",
        "description": "Stores allowed and blocked tool permission events for security review.",
        "category": "safety",
        "risk_level": "medium",
        "permissions": ["audit_read", "audit_write", "security_report"],
        "default_enabled": True,
    },
    {
        "key": "user_settings",
        "name": "User Profile + Settings",
        "description": "Local profile preferences, safety level, theme, voice, and default workspace.",
        "category": "settings",
        "risk_level": "low",
        "permissions": ["settings_read", "settings_write"],
        "default_enabled": True,
    },
]


def get_connection():
    return sqlite3.connect(DB_PATH)


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def init_plugin_registry_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS plugins (
                key TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                category TEXT NOT NULL,
                risk_level TEXT NOT NULL,
                permissions_json TEXT NOT NULL,
                enabled TEXT NOT NULL,
                built_in TEXT DEFAULT 'true',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
    sync_builtin_plugins()


def sync_builtin_plugins() -> None:
    now = _now()
    with get_connection() as conn:
        for plugin in PLUGIN_DEFINITIONS:
            permissions_json = json.dumps(plugin["permissions"])
            existing = conn.execute(
                """
                SELECT key
                FROM plugins
                WHERE key = ?
                """,
                (plugin["key"],),
            ).fetchone()

            if existing:
                conn.execute(
                    """
                    UPDATE plugins
                    SET
                        name = ?,
                        description = ?,
                        category = ?,
                        risk_level = ?,
                        permissions_json = ?,
                        updated_at = ?
                    WHERE key = ?
                    """,
                    (
                        plugin["name"],
                        plugin["description"],
                        plugin["category"],
                        plugin["risk_level"],
                        permissions_json,
                        now,
                        plugin["key"],
                    ),
                )
            else:
                conn.execute(
                    """
                    INSERT INTO plugins
                    (key, name, description, category, risk_level, permissions_json, enabled, built_in, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'true', ?, ?)
                    """,
                    (
                        plugin["key"],
                        plugin["name"],
                        plugin["description"],
                        plugin["category"],
                        plugin["risk_level"],
                        permissions_json,
                        "true" if plugin["default_enabled"] else "false",
                        now,
                        now,
                    ),
                )
        conn.commit()


def _parse_permissions(value: str) -> List[str]:
    try:
        parsed = json.loads(value or "[]")
        if isinstance(parsed, list):
            return [str(permission).strip() for permission in parsed if str(permission).strip()]
    except json.JSONDecodeError:
        pass
    return [permission.strip() for permission in (value or "").split(",") if permission.strip()]


def _row_to_plugin(row: sqlite3.Row) -> Dict[str, Any]:
    item = dict(row)
    item["permissions"] = _parse_permissions(item.pop("permissions_json", "[]"))
    item["enabled"] = item.get("enabled") == "true"
    item["built_in"] = item.get("built_in") == "true"
    return item


def list_plugins(
    category: Optional[str] = None,
    enabled: Optional[bool] = None,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    init_plugin_registry_db()
    query = "SELECT * FROM plugins"
    params: List[Any] = []
    conditions = []

    if category:
        conditions.append("category = ?")
        params.append(category)
    if enabled is not None:
        conditions.append("enabled = ?")
        params.append("true" if enabled else "false")
    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY category ASC, name ASC LIMIT ?"
    params.append(max(1, min(int(limit), 250)))

    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(query, params).fetchall()
    return [_row_to_plugin(row) for row in rows]


def get_plugin(plugin_key: str) -> Optional[Dict[str, Any]]:
    init_plugin_registry_db()
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            """
            SELECT *
            FROM plugins
            WHERE key = ?
            """,
            (plugin_key,),
        ).fetchone()
    return _row_to_plugin(row) if row else None


def set_plugin_enabled(plugin_key: str, enabled: bool) -> Dict[str, Any]:
    init_plugin_registry_db()
    plugin = get_plugin(plugin_key)
    if not plugin:
        raise ValueError(f"Plugin not found: {plugin_key}")

    now = _now()
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE plugins
            SET enabled = ?, updated_at = ?
            WHERE key = ?
            """,
            ("true" if enabled else "false", now, plugin_key),
        )
        conn.commit()

    updated = get_plugin(plugin_key)
    if not updated:
        raise ValueError("Plugin update failed.")
    return updated


def get_plugin_metrics() -> Dict[str, Any]:
    plugins = list_plugins(limit=250)
    category_counts: Dict[str, int] = {}
    risk_counts: Dict[str, int] = {}
    enabled_count = 0
    disabled_count = 0
    high_risk_enabled = 0

    for plugin in plugins:
        category = plugin["category"]
        risk = plugin["risk_level"]
        category_counts[category] = category_counts.get(category, 0) + 1
        risk_counts[risk] = risk_counts.get(risk, 0) + 1

        if plugin["enabled"]:
            enabled_count += 1
            if risk == "high":
                high_risk_enabled += 1
        else:
            disabled_count += 1

    return {
        "total_plugins": len(plugins),
        "enabled_plugins": enabled_count,
        "disabled_plugins": disabled_count,
        "high_risk_enabled": high_risk_enabled,
        "category_counts": category_counts,
        "risk_counts": risk_counts,
    }


def render_plugin_registry_report() -> str:
    plugins = list_plugins(limit=250)
    metrics = get_plugin_metrics()
    plugin_lines = []

    for plugin in plugins:
        status = "enabled" if plugin["enabled"] else "disabled"
        permissions = ", ".join(plugin["permissions"]) or "none"
        plugin_lines.append(
            f"## {plugin['name']}\n\n"
            f"- Key: {plugin['key']}\n"
            f"- Category: {plugin['category']}\n"
            f"- Risk Level: {plugin['risk_level']}\n"
            f"- Status: {status}\n"
            f"- Permissions: {permissions}\n"
            f"- Description: {plugin['description']}\n"
        )

    return f"""# O.R.I.O.N. Plugin Registry Report

## Metrics

- Total Plugins: {metrics['total_plugins']}
- Enabled Plugins: {metrics['enabled_plugins']}
- Disabled Plugins: {metrics['disabled_plugins']}
- High-Risk Enabled Plugins: {metrics['high_risk_enabled']}

## Plugins

{chr(10).join(plugin_lines)}
"""
