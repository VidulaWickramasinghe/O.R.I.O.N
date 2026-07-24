from functools import wraps
from typing import Any, Callable, Dict, List

from core.activity import log_activity
from core.plugin_registry import get_plugin, list_plugins
from core.tool_audit import record_tool_audit_event


TOOL_PLUGIN_MAP: Dict[str, str] = {
    "create_note": "core_safe_tools",
    "read_note": "core_safe_tools",
    "save_activity_log": "core_safe_tools",
    "list_notes": "core_safe_tools",
    "register_project": "project_manager",
    "list_projects": "project_manager",
    "read_project": "project_manager",
    "update_project_status": "project_manager",
    "add_project_note": "project_manager",
    "save_project_roadmap": "project_manager",
    "save_portfolio_summary": "project_manager",
    "get_system_status": "developer_tools",
    "list_directory": "developer_tools",
    "read_project_file": "developer_tools",
    "write_project_file": "developer_tools",
    "run_safe_command": "developer_tools",
    "remember_information": "memory_system",
    "search_persistent_memory": "memory_system",
    "list_recent_persistent_memory": "memory_system",
    "create_mission": "mission_planner",
    "list_missions": "mission_planner",
    "read_mission": "mission_planner",
    "update_mission_status": "mission_planner",
    "update_mission_step_status": "mission_planner",
    "add_mission_step": "mission_planner",
    "register_workspace": "workspace_manager",
    "list_workspaces": "workspace_manager",
    "read_workspace": "workspace_manager",
    "inspect_workspace": "workspace_manager",
    "read_workspace_key_file": "workspace_manager",
    "detect_workspace_tech_stack": "workspace_manager",
    "summarize_workspace": "workspace_manager",
    "inspect_github_release_readiness": "github_release_assistant",
    "generate_github_release_notes_tool": "github_release_assistant",
    "generate_github_release_checklist": "github_release_assistant",
    "suggest_release_commit_message": "github_release_assistant",
    "research_browser_page": "browser_research",
    "research_web_page": "browser_research",
    "compare_research_pages": "browser_research",
    "save_web_research": "browser_research",
    "retrieve_project_context": "context_engine",
    "open_workspace_in_vscode": "desktop_control",
    "open_workspace_folder": "desktop_control",
    "open_url_in_browser": "desktop_control",
    "start_workspace_dev_server": "desktop_control",
    "get_demo_readiness_report": "portfolio_demo",
    "generate_portfolio_case_study": "portfolio_demo",
    "generate_demo_script": "portfolio_demo",
    "generate_screenshot_checklist": "portfolio_demo",
    "generate_portfolio_release_pack": "portfolio_demo",
    "set_demo_mode": "portfolio_demo",
    "run_system_doctor": "system_doctor",
    "index_knowledge_document": "knowledge_base",
    "index_knowledge_folder": "knowledge_base",
    "list_knowledge_documents": "knowledge_base",
    "search_local_knowledge": "knowledge_base",
    "summarize_knowledge_document": "knowledge_base",
    "rebuild_vector_memory_index": "vector_memory",
    "semantic_memory_search": "vector_memory",
    "list_vector_memory_items": "vector_memory",
    "list_workflow_blueprints": "workflow_blueprints",
    "read_workflow_blueprint": "workflow_blueprints",
    "create_mission_from_workflow_blueprint": "workflow_blueprints",
    "inspect_workspace_for_development": "developer_agent",
    "diagnose_workspace_issue": "developer_agent",
    "create_workspace_patch_plan": "developer_agent",
    "request_workspace_file_patch": "developer_agent",
    "list_developer_reports": "developer_agent",
    "get_dashboard_intelligence_report": "dashboard_intelligence",
    "create_local_reminder": "notification_engine",
    "list_local_reminders": "notification_engine",
    "complete_local_reminder": "notification_engine",
    "refresh_due_reminders": "notification_engine",
    "generate_startup_briefing": "notification_engine",
    "list_user_profile_settings": "user_settings",
    "update_user_profile_setting": "user_settings",
    "reset_user_profile_settings": "user_settings",
    "get_user_profile_summary": "user_settings",
    "list_orion_plugins": "plugin_registry",
    "inspect_orion_plugin": "plugin_registry",
    "set_orion_plugin_enabled": "plugin_registry",
    "get_plugin_registry_report": "plugin_registry",
    "get_backend_sidecar_status": "backend_sidecar",
    "start_backend_sidecar": "backend_sidecar",
    "stop_backend_sidecar": "backend_sidecar",
    "restart_backend_sidecar": "backend_sidecar",
    "get_tool_permission_report": "tool_permission_enforcement",
    "check_tool_permission": "tool_permission_enforcement",
    "get_tool_permission_metrics": "tool_permission_enforcement",
    "list_tool_permission_matrix": "tool_permission_enforcement",
    "get_tool_audit_report": "tool_audit_center",
    "list_tool_audit_events": "tool_audit_center",
    "get_tool_audit_metrics": "tool_audit_center",
    "list_security_profiles": "security_policy_profiles",
    "get_active_security_policy": "security_policy_profiles",
    "apply_security_profile": "security_policy_profiles",
    "get_security_policy_report": "security_policy_profiles",
}

ENFORCEMENT_ALWAYS_ALLOWED_PLUGINS = {
    "approval_system",
    "plugin_registry",
    "user_settings",
    "dashboard_intelligence",
    "tool_permission_enforcement",
    "tool_audit_center",
    "security_policy_profiles",
}


def get_plugin_for_tool(tool_name: str) -> str:
    return TOOL_PLUGIN_MAP.get(tool_name, "")


def is_tool_allowed(tool_name: str) -> Dict[str, Any]:
    plugin_key = get_plugin_for_tool(tool_name)
    if not plugin_key:
        return {
            "allowed": True,
            "tool_name": tool_name,
            "plugin_key": "",
            "plugin_name": "Unmapped",
            "risk_level": "unknown",
            "category": "unknown",
            "reason": "Tool is not mapped to a plugin. Allowed by default.",
        }
    plugin = get_plugin(plugin_key)
    if plugin_key in ENFORCEMENT_ALWAYS_ALLOWED_PLUGINS:
        return {
            "allowed": True,
            "tool_name": tool_name,
            "plugin_key": plugin_key,
            "plugin_name": plugin["name"] if plugin else plugin_key,
            "risk_level": plugin.get("risk_level", "unknown") if plugin else "unknown",
            "category": plugin.get("category", "unknown") if plugin else "unknown",
            "reason": "Plugin is protected and always allowed.",
        }
    if not plugin:
        return {
            "allowed": False,
            "tool_name": tool_name,
            "plugin_key": plugin_key,
            "plugin_name": "Missing plugin",
            "risk_level": "unknown",
            "category": "unknown",
            "reason": f"Plugin registry entry missing for {plugin_key}.",
        }
    if not plugin.get("enabled", False):
        return {
            "allowed": False,
            "tool_name": tool_name,
            "plugin_key": plugin_key,
            "plugin_name": plugin.get("name", plugin_key),
            "risk_level": plugin.get("risk_level", "unknown"),
            "category": plugin.get("category", "unknown"),
            "reason": f"Plugin {plugin_key} is disabled.",
        }
    return {
        "allowed": True,
        "tool_name": tool_name,
        "plugin_key": plugin_key,
        "plugin_name": plugin.get("name", plugin_key),
        "risk_level": plugin.get("risk_level", "unknown"),
        "category": plugin.get("category", "unknown"),
        "reason": f"Plugin {plugin_key} is enabled.",
    }

def enforce_tool_permission(tool_name: str) -> Callable:
    """
    Decorator for O.R.I.O.N. tool functions.
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            decision = is_tool_allowed(tool_name)
            record_tool_audit_event(
                tool_name=tool_name,
                plugin_key=decision.get("plugin_key", ""),
                decision="allowed" if decision["allowed"] else "blocked",
                reason=decision.get("reason", ""),
                risk_level=decision.get("risk_level", "unknown"),
                category=decision.get("category", "unknown"),
                source="Tool Permission Enforcement",
            )
            if not decision["allowed"]:
                message = (
                    "Tool blocked by Plugin Permission Enforcement.\n\n"
                    f"Tool: {tool_name}\n"
                    f"Plugin: {decision['plugin_key']}\n"
                    f"Reason: {decision['reason']}\n\n"
                    "Enable the plugin in Aurora OS Plugin System if you want to use this tool."
                )
                log_activity(
                    "TOOL_PERMISSION_BLOCKED",
                    f"{tool_name} blocked. {decision['reason']}",
                    "O.R.I.O.N.",
                )
                return message
            log_activity(
                "TOOL_PERMISSION_ALLOWED",
                f"{tool_name} allowed. {decision['reason']}",
                "O.R.I.O.N.",
            )
            return func(*args, **kwargs)

        return wrapper

    return decorator


def get_tool_permission_matrix() -> List[Dict[str, Any]]:
    plugins = {plugin["key"]: plugin for plugin in list_plugins(limit=300)}
    matrix = []
    for tool_name, plugin_key in sorted(TOOL_PLUGIN_MAP.items()):
        plugin = plugins.get(plugin_key)
        matrix.append(
            {
                "tool_name": tool_name,
                "plugin_key": plugin_key,
                "plugin_name": plugin["name"] if plugin else "Missing plugin",
                "enabled": bool(plugin.get("enabled", False)) if plugin else False,
                "risk_level": plugin.get("risk_level", "unknown") if plugin else "unknown",
                "category": plugin.get("category", "unknown") if plugin else "unknown",
                "permissions": plugin.get("permissions", []) if plugin else [],
                "protected": plugin_key in ENFORCEMENT_ALWAYS_ALLOWED_PLUGINS,
            }
        )
    return matrix


def get_tool_permission_metrics() -> Dict[str, Any]:
    matrix = get_tool_permission_matrix()
    total_tools = len(matrix)
    allowed_tools = sum(1 for item in matrix if item["enabled"] or item["protected"])
    blocked_tools = total_tools - allowed_tools
    high_risk_tools = sum(1 for item in matrix if item["risk_level"] == "high")
    high_risk_allowed = sum(
        1
        for item in matrix
        if item["risk_level"] == "high" and (item["enabled"] or item["protected"])
    )
    return {
        "total_mapped_tools": total_tools,
        "allowed_tools": allowed_tools,
        "blocked_tools": blocked_tools,
        "high_risk_tools": high_risk_tools,
        "high_risk_allowed": high_risk_allowed,
    }


def render_tool_permission_report() -> str:
    metrics = get_tool_permission_metrics()
    matrix = get_tool_permission_matrix()
    lines = [
        "# O.R.I.O.N. Tool Permission Enforcement Report",
        "",
        "## Metrics",
        "",
        f"- Total Mapped Tools: {metrics['total_mapped_tools']}",
        f"- Allowed Tools: {metrics['allowed_tools']}",
        f"- Blocked Tools: {metrics['blocked_tools']}",
        f"- High-Risk Tools: {metrics['high_risk_tools']}",
        f"- High-Risk Allowed: {metrics['high_risk_allowed']}",
        "",
        "## Tool Matrix",
        "",
    ]
    for item in matrix:
        status = "allowed" if item["enabled"] or item["protected"] else "blocked"
        protected = "yes" if item["protected"] else "no"
        lines.extend(
            [
                f"### {item['tool_name']}",
                "",
                f"- Plugin: {item['plugin_key']} / {item['plugin_name']}",
                f"- Category: {item['category']}",
                f"- Risk Level: {item['risk_level']}",
                f"- Status: {status}",
                f"- Protected: {protected}",
                f"- Permissions: {', '.join(item['permissions']) or 'none'}",
                "",
            ]
        )
    return "\n".join(lines)
