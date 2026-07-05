from typing import Any, Dict, List

from core.activity import get_recent_activity
from core.approvals import list_approval_requests
from core.developer_agent import list_developer_reports
from core.knowledge_base import list_knowledge_documents
from core.mission_planner import list_mission_records
from core.mission_run_history import list_mission_runs
from core.notification_engine import list_reminders, refresh_due_reminders
from core.plugin_registry import get_plugin_metrics
from core.tool_permissions import get_tool_permission_metrics
from core.persistent_memory import list_recent_memory
from core.user_settings import get_user_settings_map
from core.vector_memory import list_vector_items
from core.workspace_manager import detect_workspace_stack, list_workspace_records


def _safe_percentage(value: int, total: int) -> int:
    if total <= 0:
        return 0
    return round((value / total) * 100)


def calculate_mission_metrics() -> Dict[str, Any]:
    missions = list_mission_records(limit=100)
    runs = list_mission_runs(limit=100)
    total = len(missions)
    completed = sum(1 for mission in missions if mission.get("status") == "completed")
    active = sum(
        1
        for mission in missions
        if mission.get("status") in ["planned", "active", "in_progress"]
    )
    blocked = sum(
        1
        for mission in missions
        if mission.get("status") in ["blocked", "waiting_approval"]
    )
    high_priority = sum(1 for mission in missions if int(mission.get("priority", 0)) >= 4)

    return {
        "total_missions": total,
        "completed_missions": completed,
        "active_missions": active,
        "blocked_missions": blocked,
        "high_priority_missions": high_priority,
        "mission_runs": len(runs),
        "completion_rate": _safe_percentage(completed, total),
    }


def calculate_workspace_metrics() -> Dict[str, Any]:
    workspaces = list_workspace_records(limit=100)
    stack_counts: Dict[str, int] = {}
    ready_count = 0
    workspace_summaries = []

    for workspace in workspaces:
        stack = detect_workspace_stack(workspace["id"])
        detected_stack = stack.get("detected_stack", [])
        key_files = stack.get("key_files", [])

        for item in detected_stack:
            stack_counts[item] = stack_counts.get(item, 0) + 1

        readiness_points = 0
        if key_files:
            readiness_points += 25
        if "Git" in detected_stack or "Git repository" in detected_stack:
            readiness_points += 25
        if any(
            name in key_files
            for name in ["README.md", "package.json", "requirements.txt", "pyproject.toml"]
        ):
            readiness_points += 25
        if workspace.get("status") == "active":
            readiness_points += 25

        if readiness_points >= 75:
            ready_count += 1

        workspace_summaries.append(
            {
                "id": workspace["id"],
                "name": workspace["name"],
                "status": workspace["status"],
                "readiness_score": readiness_points,
                "detected_stack": detected_stack,
                "key_files": key_files,
            }
        )

    return {
        "total_workspaces": len(workspaces),
        "ready_workspaces": ready_count,
        "workspace_readiness_rate": _safe_percentage(ready_count, len(workspaces)),
        "stack_counts": stack_counts,
        "workspace_summaries": workspace_summaries,
    }


def calculate_memory_metrics() -> Dict[str, Any]:
    memories = list_recent_memory(limit=100)
    knowledge_docs = list_knowledge_documents(limit=100)
    vector_items = list_vector_items(limit=200)
    category_counts: Dict[str, int] = {}

    for memory in memories:
        category = memory.get("category", "uncategorized")
        category_counts[category] = category_counts.get(category, 0) + 1

    return {
        "recent_memory_items": len(memories),
        "knowledge_documents": len(knowledge_docs),
        "vector_items": len(vector_items),
        "memory_category_counts": category_counts,
    }


def calculate_risk_metrics() -> Dict[str, Any]:
    pending_approvals = list_approval_requests(limit=100, status="pending")
    risk_counts = {
        "low": 0,
        "medium": 0,
        "high": 0,
        "unknown": 0,
    }

    for approval in pending_approvals:
        risk = approval.get("risk_level", "unknown")
        risk_counts[risk] = risk_counts.get(risk, 0) + 1

    if risk_counts.get("high", 0) > 0:
        risk_level = "high"
    elif risk_counts.get("medium", 0) > 0:
        risk_level = "medium"
    elif risk_counts.get("low", 0) > 0:
        risk_level = "low"
    else:
        risk_level = "clear"

    return {
        "pending_approvals": len(pending_approvals),
        "risk_counts": risk_counts,
        "current_risk_level": risk_level,
    }


def calculate_activity_metrics() -> Dict[str, Any]:
    activity = get_recent_activity(limit=100)
    event_counts: Dict[str, int] = {}

    for event in activity:
        event_type = event.get("type", "UNKNOWN")
        event_counts[event_type] = event_counts.get(event_type, 0) + 1

    error_events = sum(
        count
        for event_type, count in event_counts.items()
        if "ERROR" in event_type or "FAILED" in event_type
    )

    return {
        "recent_activity_events": len(activity),
        "event_counts": event_counts,
        "error_events": error_events,
    }


def calculate_developer_metrics() -> Dict[str, Any]:
    reports = list_developer_reports(limit=100)
    report_counts: Dict[str, int] = {}

    for report in reports:
        report_type = report.get("report_type", "unknown")
        report_counts[report_type] = report_counts.get(report_type, 0) + 1

    return {
        "developer_reports": len(reports),
        "developer_report_counts": report_counts,
    }


def calculate_system_intelligence_score(
    mission_metrics: Dict[str, Any],
    workspace_metrics: Dict[str, Any],
    memory_metrics: Dict[str, Any],
    risk_metrics: Dict[str, Any],
    activity_metrics: Dict[str, Any],
    developer_metrics: Dict[str, Any],
) -> int:
    score = 0

    if workspace_metrics["total_workspaces"] > 0:
        score += 15
    if mission_metrics["total_missions"] > 0:
        score += 15
    if mission_metrics["mission_runs"] > 0:
        score += 10
    if memory_metrics["recent_memory_items"] > 0:
        score += 10
    if memory_metrics["knowledge_documents"] > 0:
        score += 10
    if memory_metrics["vector_items"] > 0:
        score += 10
    if developer_metrics["developer_reports"] > 0:
        score += 10

    if risk_metrics["current_risk_level"] == "clear":
        score += 10
    elif risk_metrics["current_risk_level"] == "low":
        score += 7
    elif risk_metrics["current_risk_level"] == "medium":
        score += 4

    if activity_metrics["error_events"] == 0:
        score += 10
    elif activity_metrics["error_events"] <= 3:
        score += 5

    return min(score, 100)


def generate_dashboard_intelligence() -> Dict[str, Any]:
    mission_metrics = calculate_mission_metrics()
    workspace_metrics = calculate_workspace_metrics()
    memory_metrics = calculate_memory_metrics()
    risk_metrics = calculate_risk_metrics()
    activity_metrics = calculate_activity_metrics()
    developer_metrics = calculate_developer_metrics()
    refresh_due_reminders()
    reminders = list_reminders(limit=100)
    due_reminders = [item for item in reminders if item.get("status") == "due"]
    pending_reminders = [item for item in reminders if item.get("status") == "pending"]
    user_settings = get_user_settings_map()
    plugin_metrics = get_plugin_metrics()
    tool_permission_metrics = get_tool_permission_metrics()
    intelligence_score = calculate_system_intelligence_score(
        mission_metrics=mission_metrics,
        workspace_metrics=workspace_metrics,
        memory_metrics=memory_metrics,
        risk_metrics=risk_metrics,
        activity_metrics=activity_metrics,
        developer_metrics=developer_metrics,
    )

    if intelligence_score >= 85:
        readiness_label = "excellent"
    elif intelligence_score >= 70:
        readiness_label = "strong"
    elif intelligence_score >= 50:
        readiness_label = "developing"
    else:
        readiness_label = "needs_setup"

    recommendations: List[str] = []
    if workspace_metrics["total_workspaces"] == 0:
        recommendations.append("Register at least one workspace.")
    if mission_metrics["total_missions"] == 0:
        recommendations.append("Create a mission or use a workflow blueprint.")
    if memory_metrics["knowledge_documents"] == 0:
        recommendations.append("Index local documents into the Knowledge Base.")
    if memory_metrics["vector_items"] == 0:
        recommendations.append("Rebuild the Vector Memory index.")
    if risk_metrics["pending_approvals"] > 0:
        recommendations.append("Review pending Command Approval requests.")
    if activity_metrics["error_events"] > 0:
        recommendations.append("Review recent failed/error activity events.")
    if developer_metrics["developer_reports"] == 0:
        recommendations.append("Run Agentic Developer Mode inspection for a workspace.")
    if not recommendations:
        recommendations.append("System is in strong condition. Continue with release or demo workflow.")

    return {
        "intelligence_score": intelligence_score,
        "readiness_label": readiness_label,
        "mission_metrics": mission_metrics,
        "workspace_metrics": workspace_metrics,
        "memory_metrics": memory_metrics,
        "risk_metrics": risk_metrics,
        "activity_metrics": activity_metrics,
        "developer_metrics": developer_metrics,
        "notification_metrics": {
            "total_reminders": len(reminders),
            "due_reminders": len(due_reminders),
            "pending_reminders": len(pending_reminders),
        },
        "plugin_metrics": plugin_metrics,
        "tool_permission_metrics": tool_permission_metrics,
        "user_settings": {
            "display_name": user_settings.get("display_name", "O.R.I.O.N. User"),
            "default_workspace_id": user_settings.get("default_workspace_id", ""),
            "safety_level": user_settings.get("safety_level", "strict"),
            "voice_mode": user_settings.get("voice_mode", "text_first"),
            "theme_mode": user_settings.get("theme_mode", "aurora_dark"),
            "developer_mode_enabled": user_settings.get("developer_mode_enabled", "false"),
            "startup_briefing_enabled": user_settings.get("startup_briefing_enabled", "true"),
        },
        "recommendations": recommendations,
    }


def render_dashboard_intelligence_report() -> str:
    data = generate_dashboard_intelligence()

    return f"""# Aurora OS Dashboard Intelligence Report

## System Intelligence

- Score: {data['intelligence_score']} / 100
- Readiness: {data['readiness_label']}

## Mission Metrics

- Total Missions: {data['mission_metrics']['total_missions']}
- Active Missions: {data['mission_metrics']['active_missions']}
- Completed Missions: {data['mission_metrics']['completed_missions']}
- Blocked Missions: {data['mission_metrics']['blocked_missions']}
- Mission Runs: {data['mission_metrics']['mission_runs']}
- Completion Rate: {data['mission_metrics']['completion_rate']}%

## Workspace Metrics

- Total Workspaces: {data['workspace_metrics']['total_workspaces']}
- Ready Workspaces: {data['workspace_metrics']['ready_workspaces']}
- Workspace Readiness Rate: {data['workspace_metrics']['workspace_readiness_rate']}%

## Memory + Knowledge

- Recent Memory Items: {data['memory_metrics']['recent_memory_items']}
- Knowledge Documents: {data['memory_metrics']['knowledge_documents']}
- Vector Items: {data['memory_metrics']['vector_items']}

## Risk + Approval

- Pending Approvals: {data['risk_metrics']['pending_approvals']}
- Current Risk Level: {data['risk_metrics']['current_risk_level']}

## Activity

- Recent Activity Events: {data['activity_metrics']['recent_activity_events']}
- Error / Failed Events: {data['activity_metrics']['error_events']}

## Developer Mode

- Developer Reports: {data['developer_metrics']['developer_reports']}

## Notifications

- Total Reminders: {data['notification_metrics']['total_reminders']}
- Due Reminders: {data['notification_metrics']['due_reminders']}
- Pending Reminders: {data['notification_metrics']['pending_reminders']}

## User Settings

- Display Name: {data['user_settings']['display_name']}
- Default Workspace ID: {data['user_settings']['default_workspace_id'] or 'Not set'}
- Safety Level: {data['user_settings']['safety_level']}
- Voice Mode: {data['user_settings']['voice_mode']}
- Theme Mode: {data['user_settings']['theme_mode']}
- Developer Mode Enabled: {data['user_settings']['developer_mode_enabled']}
- Startup Briefing Enabled: {data['user_settings']['startup_briefing_enabled']}

## Plugin Registry

- Total Plugins: {data['plugin_metrics']['total_plugins']}
- Enabled Plugins: {data['plugin_metrics']['enabled_plugins']}
- Disabled Plugins: {data['plugin_metrics']['disabled_plugins']}
- High-Risk Enabled Plugins: {data['plugin_metrics']['high_risk_enabled']}

## Tool Permission Enforcement

- Total Mapped Tools: {data['tool_permission_metrics']['total_mapped_tools']}
- Allowed Tools: {data['tool_permission_metrics']['allowed_tools']}
- Blocked Tools: {data['tool_permission_metrics']['blocked_tools']}
- High-Risk Tools: {data['tool_permission_metrics']['high_risk_tools']}
- High-Risk Allowed: {data['tool_permission_metrics']['high_risk_allowed']}

## Recommendations

{chr(10).join(f'- {item}' for item in data['recommendations'])}
"""
