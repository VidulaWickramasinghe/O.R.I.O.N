"""Mandatory capability authorization for O.R.I.O.N. execution boundaries.

All agent tools and mutating API routes enter through this module.  Core
mutation primitives use :func:`requires_gateway` so importing a service
function directly does not bypass the authorization decision made here.

Database/schema bootstrap and gateway-owned audit/activity telemetry are
enforcement infrastructure rather than user-invokable capabilities; they are
the only intentional low-level write sinks outside the guarded business API.
"""

from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass
from functools import wraps
from typing import Any, Callable, Dict, Iterator, Mapping, Optional, TypeVar

from starlette.requests import Request


T = TypeVar("T")


ALLOWED_ACTORS = {
    "agent",
    "approval_executor",
    "aurora_api",
    "internal",
    "mission_agent",
    "test",
    "voice_agent",
    "wake_agent",
}


# Capabilities used by HTTP routes but not exposed as agent tools.
CAPABILITY_PLUGIN_OVERRIDES: Dict[str, str] = {
    "agent_chat": "context_engine",
    "clear_activity": "core_safe_tools",
    "execute_approved_action": "approval_system",
    "generate_mission_report": "mission_planner",
    "generate_public_release_package": "stable_release",
    "reject_approval": "approval_system",
    "recover_mission_continuations": "mission_planner",
    "resolve_mission_continuation": "mission_planner",
    "reset_voice_state": "voice_system",
    "run_mission_batch": "mission_planner",
    "run_mission_step": "mission_planner",
    "run_quality_gate": "release_candidate",
    "save_quality_gate_report": "release_candidate",
    "update_voice_state": "voice_system",
}


# Every POST endpoint is explicit.  Adding a new mutating route without adding
# it here fails closed in ``api_capability_guard``.
API_CAPABILITY_MAP: Dict[str, str] = {
    "clear_activity_route": "clear_activity",
    "mission_report": "generate_mission_report",
    "approve_request": "execute_approved_action",
    "reject_request": "reject_approval",
    "run_next_mission_step": "run_mission_step",
    "run_mission_batch": "run_mission_batch",
    "register_workspace_api": "register_workspace",
    "github_release_notes": "generate_github_release_notes_tool",
    "github_release_checklist": "generate_github_release_checklist",
    "github_release_commit_message": "suggest_release_commit_message",
    "browser_compare": "compare_research_pages",
    "browser_save": "save_web_research",
    "browser_research_route": "research_web_page",
    "browser_research_legacy_route": "research_web_page",
    "voice_reset": "reset_voice_state",
    "context_preview": "retrieve_project_context",
    "desktop_open_vscode": "open_workspace_in_vscode",
    "desktop_open_folder": "open_workspace_folder",
    "desktop_start_dev": "start_workspace_dev_server",
    "desktop_open_url": "open_url_in_browser",
    "demo_mode": "set_demo_mode",
    "demo_release_pack": "generate_portfolio_release_pack",
    "knowledge_index": "index_knowledge_document",
    "knowledge_index_folder": "index_knowledge_folder",
    "knowledge_search": "search_local_knowledge",
    "vector_rebuild": "rebuild_vector_memory_index",
    "vector_search": "semantic_memory_search",
    "workflow_create_mission": "create_mission_from_workflow_blueprint",
    "developer_diagnose_workspace": "diagnose_workspace_issue",
    "developer_patch_plan": "create_workspace_patch_plan",
    "developer_request_patch": "request_workspace_file_patch",
    "notification_create_reminder": "create_local_reminder",
    "notification_update_reminder_status": "complete_local_reminder",
    "notification_reminders": "refresh_due_reminders",
    "notification_startup_briefing": "generate_startup_briefing",
    "dashboard_intelligence": "get_dashboard_intelligence_report",
    "sidecar_status": "get_backend_sidecar_status",
    "system_doctor": "run_system_doctor",
    "settings_reset": "reset_user_profile_settings",
    "settings_update": "update_user_profile_setting",
    "plugins_update_status": "set_orion_plugin_enabled",
    "security_policy_apply": "apply_security_profile",
    "release_candidate_freeze": "freeze_release_candidate",
    "release_candidate_unfreeze": "unfreeze_release_candidate",
    "release_candidate_package": "generate_release_candidate_package",
    "stabilization_scan": "run_stabilization_scan",
    "stabilization_report_save": "save_stabilization_report",
    "frontend_refactor_report_save": "save_frontend_refactor_report",
    "sidecar_start": "start_backend_sidecar",
    "sidecar_stop": "stop_backend_sidecar",
    "sidecar_restart": "restart_backend_sidecar",
    "quality_gate_run": "run_quality_gate",
    "quality_gate_report_save": "save_quality_gate_report",
    "public_release_package": "generate_public_release_package",
    "github_polish_artifacts_save": "save_github_polish_artifacts",
    "portfolio_showcase_report_save": "save_portfolio_showcase_report",
    "demo_walkthrough_report_save": "save_demo_walkthrough_report",
    "demo_recording_report_save": "save_demo_recording_report",
    "final_launch_freeze": "freeze_final_launch",
    "final_launch_unfreeze": "unfreeze_final_launch",
    "final_launch_report_save": "save_final_launch_report",
    "final_launch_package": "generate_final_launch_package",
    "github_launch_artifacts_save": "save_github_launch_artifacts",
    "public_landing_report_save": "save_public_landing_report",
    "ui_polish_report_save": "save_ui_polish_report",
    "production_readiness_report_save": "save_production_readiness_report",
    "production_readiness_release_candidate_v2": "generate_final_release_candidate_v2",
    "stable_release_lock": "lock_stable_release",
    "stable_release_unlock": "unlock_stable_release",
    "stable_release_report_save": "save_stable_release_report",
    "stable_release_package": "generate_stable_release_package",
    "post_release_maintenance_report_save": "save_post_release_maintenance_report",
    "post_release_maintenance_issue_add": "add_known_issue",
    "changelog_intelligence_artifacts_save": "save_changelog_intelligence_artifacts",
    "roadmap_planner_report_save": "save_roadmap_report",
    "roadmap_planner_feature_add": "add_future_feature",
    "roadmap_planner_package": "generate_roadmap_package",
    "safety_review_board_report_save": "save_safety_review_report",
    "safety_review_board_review_create": "create_feature_review",
    "safety_review_board_package": "generate_safety_review_package",
    "patch_release_start": "start_patch_release",
    "patch_release_complete": "complete_patch_release",
    "patch_release_report_save": "save_patch_release_report",
    "patch_release_package": "generate_patch_release_package",
    "chat": "agent_chat",
}


# Core mutation primitives may only run beneath the named parent capability.
# This prevents a caller from authorizing an unrelated low-risk operation and
# using that authorization to invoke a different protected service function.
INTERNAL_CAPABILITY_MAP: Dict[str, frozenset[str]] = {
    "core.activity.clear_activity": frozenset({"clear_activity"}),
    "core.approvals.create_approval_request": frozenset(
        {
            "open_url_in_browser",
            "open_workspace_folder",
            "open_workspace_in_vscode",
            "request_workspace_file_patch",
            "run_safe_command",
            "start_workspace_dev_server",
            "write_project_file",
        }
    ),
    "core.approvals.update_approval_status": frozenset(
        {"execute_approved_action", "reject_approval"}
    ),
    "core.approvals.claim_approval_execution": frozenset(
        {"execute_approved_action"}
    ),
    "core.approvals.complete_approval_execution": frozenset(
        {"execute_approved_action"}
    ),
    "core.approvals.fail_approval_execution": frozenset(
        {"execute_approved_action"}
    ),
    "core.approvals.reject_approval_request": frozenset({"reject_approval"}),
    "core.approvals.mark_mission_continuation_resolved": frozenset(
        {"recover_mission_continuations", "resolve_mission_continuation"}
    ),
    "core.backend_sidecar.start_backend_sidecar": frozenset({"start_backend_sidecar"}),
    "core.backend_sidecar.stop_backend_sidecar": frozenset({"stop_backend_sidecar"}),
    "core.backend_sidecar.restart_backend_sidecar": frozenset({"restart_backend_sidecar"}),
    "core.backend_sidecar.save_sidecar_state": frozenset(
        {
            "get_backend_sidecar_status",
            "restart_backend_sidecar",
            "run_system_doctor",
            "start_backend_sidecar",
            "stop_backend_sidecar",
        }
    ),
    "core.browser_research.save_web_research_report": frozenset({"save_web_research"}),
    "core.context_engine.save_context_history": frozenset(
        {"agent_chat", "retrieve_project_context"}
    ),
    "core.changelog_intelligence.save_changelog_intelligence_artifacts": frozenset(
        {"save_changelog_intelligence_artifacts"}
    ),
    "core.demo_recording.save_demo_recording_report": frozenset({"save_demo_recording_report"}),
    "core.demo_walkthrough.save_demo_walkthrough_report": frozenset({"save_demo_walkthrough_report"}),
    "core.desktop_control.execute_approved_desktop_action": frozenset({"execute_approved_action"}),
    "core.developer_agent.create_developer_report_record": frozenset(
        {
            "create_workspace_patch_plan",
            "diagnose_workspace_issue",
            "inspect_workspace_for_development",
        }
    ),
    "core.developer_agent.create_patch_plan": frozenset({"create_workspace_patch_plan"}),
    "core.developer_agent.request_workspace_file_patch": frozenset({"request_workspace_file_patch"}),
    "core.developer_agent.execute_approved_workspace_patch": frozenset({"execute_approved_action"}),
    "core.final_launch.save_final_launch_freeze_state": frozenset(
        {"freeze_final_launch", "unfreeze_final_launch"}
    ),
    "core.final_launch.freeze_final_launch": frozenset({"freeze_final_launch"}),
    "core.final_launch.unfreeze_final_launch": frozenset({"unfreeze_final_launch"}),
    "core.final_launch.save_final_launch_report": frozenset({"save_final_launch_report"}),
    "core.final_launch.generate_final_launch_package": frozenset({"generate_final_launch_package"}),
    "core.frontend_refactor.save_frontend_refactor_report": frozenset({"save_frontend_refactor_report"}),
    "core.github_launch.save_github_launch_artifacts": frozenset({"save_github_launch_artifacts"}),
    "core.github_polish.save_github_polish_artifacts": frozenset({"save_github_polish_artifacts"}),
    "core.github_release_assistant.save_release_artifact": frozenset(
        {
            "generate_github_release_checklist",
            "generate_github_release_notes_tool",
            "suggest_release_commit_message",
        }
    ),
    "core.knowledge_base.index_document": frozenset({"index_knowledge_document"}),
    "core.knowledge_base.index_knowledge_folder": frozenset({"index_knowledge_folder"}),
    "core.knowledge_base._index_document_path": frozenset(
        {"index_knowledge_document", "index_knowledge_folder"}
    ),
    "core.mission_planner.create_mission_record": frozenset(
        {"create_mission", "create_mission_from_workflow_blueprint"}
    ),
    "core.mission_manager.resolve_mission_continuation": frozenset(
        {"resolve_mission_continuation"}
    ),
    "core.mission_manager.recover_mission_continuations": frozenset(
        {"recover_mission_continuations"}
    ),
    "core.mission_planner.update_mission_status_record": frozenset(
        {
            "recover_mission_continuations",
            "resolve_mission_continuation",
            "update_mission_status",
        }
    ),
    "core.mission_planner.update_mission_step_status_record": frozenset(
        {
            "recover_mission_continuations",
            "resolve_mission_continuation",
            "run_mission_batch",
            "run_mission_step",
            "update_mission_step_status",
        }
    ),
    "core.mission_planner.add_mission_step_record": frozenset({"add_mission_step"}),
    "core.mission_run_history.start_mission_run": frozenset({"run_mission_batch", "run_mission_step"}),
    "core.mission_run_history.complete_mission_run": frozenset({"run_mission_batch", "run_mission_step"}),
    "core.mission_run_history.fail_mission_run": frozenset({"run_mission_batch", "run_mission_step"}),
    "core.mission_run_history.bind_mission_run_approval": frozenset(
        {"recover_mission_continuations", "resolve_mission_continuation"}
    ),
    "core.mission_run_history.update_mission_run_after_approval": frozenset(
        {"recover_mission_continuations", "resolve_mission_continuation"}
    ),
    "core.mission_run_history.generate_mission_report": frozenset({"generate_mission_report"}),
    "core.notification_engine.create_notification_event": frozenset(
        {
            "complete_local_reminder",
            "create_local_reminder",
            "generate_startup_briefing",
            "get_dashboard_intelligence_report",
            "refresh_due_reminders",
        }
    ),
    "core.notification_engine.create_reminder_record": frozenset({"create_local_reminder"}),
    "core.notification_engine.update_reminder_status": frozenset({"complete_local_reminder"}),
    "core.notification_engine.refresh_due_reminders": frozenset(
        {"generate_startup_briefing", "get_dashboard_intelligence_report", "refresh_due_reminders"}
    ),
    "core.patch_release.save_patch_state": frozenset({"complete_patch_release", "start_patch_release"}),
    "core.patch_release.start_patch_release": frozenset({"start_patch_release"}),
    "core.patch_release.complete_patch_release": frozenset({"complete_patch_release"}),
    "core.patch_release.save_patch_release_report": frozenset({"save_patch_release_report"}),
    "core.patch_release.generate_patch_release_package": frozenset({"generate_patch_release_package"}),
    "core.persistent_memory.save_memory_item": frozenset({"remember_information"}),
    "core.plugin_registry.set_plugin_enabled": frozenset(
        {"apply_security_profile", "set_orion_plugin_enabled"}
    ),
    "core.plugin_registry.sync_builtin_plugins": frozenset(
        {"apply_security_profile", "set_orion_plugin_enabled"}
    ),
    "core.portfolio_demo.save_demo_state": frozenset(
        {"generate_portfolio_demo_pack", "generate_portfolio_release_pack", "set_demo_mode"}
    ),
    "core.portfolio_demo.update_demo_mode": frozenset({"set_demo_mode"}),
    "core.portfolio_demo.generate_release_pack": frozenset(
        {"generate_portfolio_demo_pack", "generate_portfolio_release_pack"}
    ),
    "core.portfolio_showcase.save_portfolio_showcase_report": frozenset({"save_portfolio_showcase_report"}),
    "core.post_release_maintenance.save_known_issues": frozenset({"add_known_issue"}),
    "core.post_release_maintenance.add_known_issue": frozenset({"add_known_issue"}),
    "core.post_release_maintenance.save_maintenance_report": frozenset({"save_post_release_maintenance_report"}),
    "core.production_readiness.save_production_readiness_report": frozenset({"save_production_readiness_report"}),
    "core.production_readiness.generate_final_release_candidate_v2": frozenset({"generate_final_release_candidate_v2"}),
    "core.public_landing.save_public_landing_report": frozenset({"save_public_landing_report"}),
    "core.public_release.generate_public_release_package": frozenset({"generate_public_release_package"}),
    "core.release_candidate.freeze_system": frozenset({"freeze_release_candidate"}),
    "core.release_candidate.unfreeze_system": frozenset({"unfreeze_release_candidate"}),
    "core.release_candidate.generate_release_candidate_package": frozenset({"generate_release_candidate_package"}),
    "core.release_candidate.record_release_event": frozenset(
        {
            "freeze_release_candidate",
            "generate_release_candidate_package",
            "unfreeze_release_candidate",
        }
    ),
    "core.roadmap_planner.save_future_features": frozenset({"add_future_feature"}),
    "core.roadmap_planner.add_future_feature": frozenset({"add_future_feature"}),
    "core.roadmap_planner.save_roadmap_report": frozenset({"save_roadmap_report"}),
    "core.roadmap_planner.generate_roadmap_package": frozenset({"generate_roadmap_package"}),
    "core.safety_review_board.save_feature_reviews": frozenset({"create_feature_review"}),
    "core.safety_review_board.create_feature_review": frozenset({"create_feature_review"}),
    "core.safety_review_board.save_safety_review_report": frozenset({"save_safety_review_report"}),
    "core.safety_review_board.generate_safety_review_package": frozenset({"generate_safety_review_package"}),
    "core.security_policy.apply_security_profile": frozenset({"apply_security_profile"}),
    "core.stabilization_manager.save_stabilization_report": frozenset({"save_stabilization_report"}),
    "core.stable_release.save_version_lock": frozenset({"lock_stable_release", "unlock_stable_release"}),
    "core.stable_release.lock_stable_release": frozenset({"lock_stable_release"}),
    "core.stable_release.unlock_stable_release": frozenset({"unlock_stable_release"}),
    "core.stable_release.save_stable_release_report": frozenset({"save_stable_release_report"}),
    "core.stable_release.generate_stable_release_package": frozenset({"generate_stable_release_package"}),
    "core.ui_polish.save_ui_polish_report": frozenset({"save_ui_polish_report"}),
    "core.user_settings.update_user_setting": frozenset(
        {"apply_security_profile", "update_user_profile_setting"}
    ),
    "core.user_settings.reset_user_settings": frozenset({"reset_user_profile_settings"}),
    "core.vector_memory.rebuild_vector_index": frozenset({"rebuild_vector_memory_index"}),
    "core.vector_memory.upsert_vector_item": frozenset({"rebuild_vector_memory_index"}),
    "core.voice_state.save_voice_state": frozenset({"reset_voice_state", "update_voice_state"}),
    "core.voice_state.update_voice_state": frozenset({"reset_voice_state", "update_voice_state"}),
    "core.workspace_manager.register_workspace_record": frozenset({"register_workspace"}),
    "tools.dev_tools.execute_approved_dev_action": frozenset({"execute_approved_action"}),
    "tools.dev_tools._write_project_file_now": frozenset({"execute_approved_action"}),
    "tools.dev_tools._run_safe_command_now": frozenset({"execute_approved_action"}),
}


SIDE_EFFECTING_CAPABILITIES = {
    "add_future_feature",
    "add_known_issue",
    "add_mission_step",
    "add_project_note",
    "agent_chat",
    "apply_security_profile",
    "clear_activity",
    "complete_local_reminder",
    "complete_patch_release",
    "create_feature_review",
    "create_local_reminder",
    "create_mission",
    "create_mission_from_workflow_blueprint",
    "create_note",
    "create_workspace_patch_plan",
    "diagnose_workspace_issue",
    "execute_approved_action",
    "freeze_final_launch",
    "freeze_release_candidate",
    "generate_final_launch_package",
    "generate_final_release_candidate_v2",
    "generate_github_release_checklist",
    "generate_github_release_notes_tool",
    "generate_mission_report",
    "generate_patch_release_package",
    "generate_portfolio_demo_pack",
    "generate_portfolio_release_pack",
    "generate_public_release_package",
    "generate_release_candidate_package",
    "generate_roadmap_package",
    "generate_safety_review_package",
    "generate_startup_briefing",
    "generate_stable_release_package",
    "index_knowledge_document",
    "index_knowledge_folder",
    "inspect_workspace_for_development",
    "lock_stable_release",
    "open_url_in_browser",
    "open_workspace_folder",
    "open_workspace_in_vscode",
    "rebuild_vector_memory_index",
    "register_project",
    "register_workspace",
    "reject_approval",
    "recover_mission_continuations",
    "request_workspace_file_patch",
    "research_browser_page",
    "research_web_page",
    "resolve_mission_continuation",
    "retrieve_project_context",
    "reset_user_profile_settings",
    "reset_voice_state",
    "refresh_due_reminders",
    "restart_backend_sidecar",
    "run_mission_batch",
    "run_mission_step",
    "run_quality_gate",
    "run_safe_command",
    "save_activity_log",
    "save_changelog_intelligence_artifacts",
    "save_demo_recording_report",
    "save_demo_walkthrough_report",
    "save_final_launch_report",
    "save_frontend_refactor_report",
    "save_github_launch_artifacts",
    "save_github_polish_artifacts",
    "save_portfolio_showcase_report",
    "save_post_release_maintenance_report",
    "save_production_readiness_report",
    "save_project_roadmap",
    "save_public_landing_report",
    "save_quality_gate_report",
    "save_roadmap_report",
    "save_safety_review_report",
    "save_stabilization_report",
    "save_stable_release_report",
    "save_ui_polish_report",
    "save_web_research",
    "semantic_memory_search",
    "set_demo_mode",
    "set_orion_plugin_enabled",
    "start_backend_sidecar",
    "start_patch_release",
    "start_workspace_dev_server",
    "stop_backend_sidecar",
    "unfreeze_final_launch",
    "unfreeze_release_candidate",
    "unlock_stable_release",
    "update_mission_status",
    "update_mission_step_status",
    "update_project_status",
    "update_user_profile_setting",
    "update_voice_state",
    "suggest_release_commit_message",
    "write_project_file",
}


APPROVAL_REQUIRED_CAPABILITIES = {"execute_approved_action"}


@dataclass(frozen=True)
class CapabilityManifest:
    name: str
    plugin_key: str
    scope: str
    side_effect: bool
    approval_required: bool


@dataclass(frozen=True)
class CapabilityContext:
    actor: str
    source: str
    scope: str = ""
    session_id: str = ""
    mission_id: Optional[int] = None
    step_id: Optional[int] = None
    run_id: Optional[int] = None
    approval_id: Optional[int] = None


@dataclass(frozen=True)
class CapabilityAuthorization:
    manifest: CapabilityManifest
    context: CapabilityContext
    policy_profile: str


class CapabilityDeniedError(PermissionError):
    """Raised when a capability fails closed before its operation runs."""

    def __init__(self, capability: str, reason: str) -> None:
        super().__init__(f"Capability '{capability}' denied: {reason}")
        self.capability = capability
        self.reason = reason


_active_authorization: ContextVar[Optional[CapabilityAuthorization]] = ContextVar(
    "orion_active_capability", default=None
)
_execution_identity: ContextVar[Optional[CapabilityContext]] = ContextVar(
    "orion_execution_identity", default=None
)


def _capability_plugins() -> Dict[str, str]:
    from core.tool_permissions import TOOL_PLUGIN_MAP

    return {**TOOL_PLUGIN_MAP, **CAPABILITY_PLUGIN_OVERRIDES}


def get_capability_manifest(capability: str) -> Optional[CapabilityManifest]:
    clean_name = str(capability or "").strip()
    plugin_key = _capability_plugins().get(clean_name, "")
    if not clean_name or not plugin_key:
        return None
    return CapabilityManifest(
        name=clean_name,
        plugin_key=plugin_key,
        scope=f"plugin:{plugin_key}",
        side_effect=clean_name in SIDE_EFFECTING_CAPABILITIES,
        approval_required=clean_name in APPROVAL_REQUIRED_CAPABILITIES,
    )


def list_capability_manifests() -> Dict[str, CapabilityManifest]:
    return {
        name: manifest
        for name in sorted(_capability_plugins())
        if (manifest := get_capability_manifest(name)) is not None
    }


def get_active_authorization() -> Optional[CapabilityAuthorization]:
    return _active_authorization.get()


def _policy_snapshot() -> tuple[str, set[str]]:
    from core.security_policy import get_active_security_policy

    policy = get_active_security_policy()
    profile = policy.get("profile") or {}
    name = str(policy.get("active_profile") or profile.get("key") or "unknown")
    disabled = {str(item) for item in profile.get("disabled_plugins", [])}
    return name, disabled


def _plugin_decision(manifest: CapabilityManifest, disabled: set[str]) -> tuple[bool, str, str, str]:
    from core.plugin_registry import get_plugin

    plugin = get_plugin(manifest.plugin_key)
    if not plugin:
        return False, "Capability plugin is not registered.", "unknown", "unknown"
    if manifest.plugin_key in disabled:
        return False, "Plugin is disabled by the active security policy.", plugin["risk_level"], plugin["category"]
    if not plugin.get("enabled", False):
        return False, "Plugin is disabled in the registry.", plugin["risk_level"], plugin["category"]
    return True, "Capability is allowed by the active policy.", plugin["risk_level"], plugin["category"]


def _approval_is_valid(context: CapabilityContext) -> tuple[bool, str]:
    if context.approval_id is None:
        return False, "An approval ID is required."
    from core.approvals import (
        APPROVAL_STATUSES,
        get_approval_request,
        validate_approval_integrity,
    )

    approval = get_approval_request(context.approval_id)
    if not approval:
        return False, "Approval request was not found."
    valid, reason = validate_approval_integrity(approval)
    if not valid:
        return False, reason
    status = str(approval.get("status", "unknown"))
    if status not in APPROVAL_STATUSES:
        return False, f"Approval has an invalid state: {status}."
    return True, f"Approval integrity validated in {status} state."


def _audit(
    manifest: CapabilityManifest,
    context: CapabilityContext,
    policy_profile: str,
    allowed: bool,
    reason: str,
    risk_level: str,
    category: str,
) -> None:
    from core.tool_audit import record_tool_audit_event

    record_tool_audit_event(
        tool_name=manifest.name,
        plugin_key=manifest.plugin_key,
        decision="allowed" if allowed else "blocked",
        reason=reason,
        risk_level=risk_level,
        category=category,
        source=context.source,
        actor=context.actor,
        session_id=context.session_id,
        policy_profile=policy_profile,
        mission_id=context.mission_id,
        step_id=context.step_id,
        run_id=context.run_id,
        approval_id=context.approval_id,
        scope=context.scope or manifest.scope,
        side_effect=manifest.side_effect,
    )


def authorize(capability: str, context: CapabilityContext) -> CapabilityAuthorization:
    manifest = get_capability_manifest(capability)
    if manifest is None:
        reason = "Capability is not present in the manifest."
        try:
            from core.tool_audit import record_tool_audit_event

            record_tool_audit_event(
                tool_name=str(capability or "unmapped")[:120],
                plugin_key="",
                decision="blocked",
                reason=reason,
                risk_level="unknown",
                category="unknown",
                source=str(context.source or "capability_gateway")[:100],
                actor=str(context.actor or "unknown")[:100],
                session_id=str(context.session_id or "")[:100],
                policy_profile="unavailable",
                mission_id=context.mission_id,
                step_id=context.step_id,
                run_id=context.run_id,
                approval_id=context.approval_id,
                scope=str(context.scope or "")[:200],
                side_effect=True,
            )
        except Exception as error:
            raise CapabilityDeniedError(
                capability,
                f"Required audit event could not be recorded: {type(error).__name__}: {error}",
            ) from error
        raise CapabilityDeniedError(capability, reason)

    policy_profile = "unavailable"
    risk_level = "unknown"
    category = "unknown"
    allowed = False
    reason = "Capability validation did not complete."
    resolved_context = CapabilityContext(
        actor=str(context.actor or "").strip(),
        source=str(context.source or "").strip(),
        scope=str(context.scope or manifest.scope).strip(),
        session_id=str(context.session_id or "").strip(),
        mission_id=context.mission_id,
        step_id=context.step_id,
        run_id=context.run_id,
        approval_id=context.approval_id,
    )

    try:
        if resolved_context.actor not in ALLOWED_ACTORS:
            reason = "Actor is not trusted by the capability manifest."
        elif not resolved_context.source:
            reason = "Execution source is required."
        elif resolved_context.scope != manifest.scope:
            reason = "Requested scope does not match the capability manifest."
        else:
            policy_profile, disabled = _policy_snapshot()
            allowed, reason, risk_level, category = _plugin_decision(manifest, disabled)
            if allowed and manifest.approval_required:
                allowed, reason = _approval_is_valid(resolved_context)
    except Exception as error:
        reason = f"Capability validation failed closed: {type(error).__name__}: {error}"
        allowed = False

    # Audit persistence is part of authorization.  If it fails, the exception
    # propagates and the operation is never called.
    try:
        _audit(
            manifest,
            resolved_context,
            policy_profile,
            allowed,
            reason,
            risk_level,
            category,
        )
    except Exception as error:
        raise CapabilityDeniedError(
            manifest.name,
            f"Required audit event could not be recorded: {type(error).__name__}: {error}",
        ) from error
    if not allowed:
        raise CapabilityDeniedError(manifest.name, reason)
    return CapabilityAuthorization(manifest, resolved_context, policy_profile)


@contextmanager
def authorized(capability: str, context: CapabilityContext) -> Iterator[CapabilityAuthorization]:
    current = _active_authorization.get()
    if current and current.manifest.name == capability:
        yield current
        return
    authorization = authorize(capability, context)
    token = _active_authorization.set(authorization)
    try:
        yield authorization
    finally:
        _active_authorization.reset(token)


def execute_capability(
    capability: str,
    context: CapabilityContext,
    operation: Callable[..., T],
    *args: Any,
    **kwargs: Any,
) -> T:
    with authorized(capability, context):
        return operation(*args, **kwargs)


@contextmanager
def execution_identity(context: CapabilityContext) -> Iterator[None]:
    token = _execution_identity.set(context)
    try:
        yield
    finally:
        _execution_identity.reset(token)


def tool_context(tool_name: str) -> CapabilityContext:
    identity = _execution_identity.get()
    manifest = get_capability_manifest(tool_name)
    scope = manifest.scope if manifest else ""
    if identity:
        return CapabilityContext(
            actor=identity.actor,
            source=identity.source,
            scope=scope,
            session_id=identity.session_id,
            mission_id=identity.mission_id,
            step_id=identity.step_id,
            run_id=identity.run_id,
            approval_id=identity.approval_id,
        )
    return CapabilityContext(actor="agent", source="agent_tool", scope=scope)


def requires_gateway(func: Callable[..., T]) -> Callable[..., T]:
    """Guard a core mutation primitive against direct internal invocation."""

    @wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> T:
        authorization = _active_authorization.get()
        primitive = f"{func.__module__}.{func.__name__}"
        permitted = INTERNAL_CAPABILITY_MAP.get(primitive)
        if not permitted:
            raise CapabilityDeniedError(
                func.__name__, "Internal mutation is missing a Capability Gateway binding."
            )
        if authorization is None:
            raise CapabilityDeniedError(
                func.__name__, "Internal mutation requires an active Capability Gateway authorization."
            )
        if authorization.manifest.name not in permitted:
            raise CapabilityDeniedError(
                func.__name__,
                "Active capability is not permitted to invoke this internal mutation.",
            )
        return func(*args, **kwargs)

    setattr(wrapper, "__capability_gateway_required__", True)
    return wrapper


def test_context(capability: str, **values: Any) -> CapabilityContext:
    """Build an explicit test actor context without weakening production defaults."""

    manifest = get_capability_manifest(capability)
    return CapabilityContext(
        actor="test",
        source="regression_test",
        scope=manifest.scope if manifest else "",
        session_id=str(values.get("session_id") or ""),
        mission_id=values.get("mission_id"),
        step_id=values.get("step_id"),
        run_id=values.get("run_id"),
        approval_id=values.get("approval_id"),
    )


async def api_capability_guard(request: Request) -> Iterator[None]:
    """FastAPI dependency that fails closed for every state-changing route."""

    endpoint = request.scope.get("endpoint")
    endpoint_name = getattr(endpoint, "__name__", "")
    capability = API_CAPABILITY_MAP.get(endpoint_name, "")
    if str(request.method).upper() in {"GET", "HEAD", "OPTIONS"} and not capability:
        yield
        return
    if not capability:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=403,
            detail=f"Capability Gateway denied unmapped route: {endpoint_name or request.url.path}",
        )

    path_params: Mapping[str, Any] = request.path_params
    mission_id = path_params.get("mission_id")
    approval_id = path_params.get("approval_id")
    step_header = request.headers.get("X-ORION-Step-ID", "").strip()
    run_header = request.headers.get("X-ORION-Run-ID", "").strip()
    approval = None
    if approval_id is not None:
        from core.approvals import get_approval_request

        approval = get_approval_request(int(approval_id))
        if approval:
            mission_id = approval.get("mission_id")
            step_header = str(approval.get("step_id") or "")
            run_header = str(approval.get("run_id") or "")
    context = CapabilityContext(
        actor="approval_executor" if capability == "execute_approved_action" else "aurora_api",
        source=f"api:{request.method}:{request.url.path}",
        session_id=str(
            getattr(getattr(request, "state", None), "orion_session_id", "")
        ),
        mission_id=int(mission_id) if mission_id is not None else None,
        step_id=int(step_header) if step_header.isdigit() else None,
        run_id=int(run_header) if run_header.isdigit() else None,
        approval_id=int(approval_id) if approval_id is not None else None,
    )
    try:
        with authorized(capability, context):
            yield
    except CapabilityDeniedError as error:
        from fastapi import HTTPException

        raise HTTPException(status_code=403, detail=str(error)) from error
