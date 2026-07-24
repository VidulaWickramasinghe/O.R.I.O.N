import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BACKEND_DIR = Path(__file__).resolve().parent

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

load_dotenv(dotenv_path=BACKEND_DIR / ".env")

from agents import Agent, Runner, SQLiteSession

from core.prompt import ORION_SYSTEM_PROMPT

from core.activity import log_activity, get_recent_activity, clear_activity

from core.persistent_memory import (
    init_memory_db,
    list_recent_memory,
    search_memory_items,
)

from core.mission_planner import (
    init_mission_db,
    list_mission_records,
    get_mission_record,
)

from core.mission_run_history import (
    init_mission_run_db,
    start_mission_run,
    complete_mission_run,
    fail_mission_run,
    list_mission_runs,
    list_runs_for_mission,
    generate_mission_report,
)

from core.approvals import (
    init_approval_db,
    list_approval_requests,
    update_approval_status,
)

from core.workspace_manager import (
    init_workspace_db,
    register_workspace_record,
    list_workspace_records,
    inspect_workspace_tree,
    detect_workspace_stack,
    summarize_workspace as summarize_workspace_record,
)

from core.github_release_assistant import (
    inspect_release_readiness,
    generate_github_release_notes,
    generate_release_checklist,
    generate_commit_message,
)

from core.desktop_control import (
    execute_approved_desktop_action,
    ALLOWED_DESKTOP_ACTIONS,
    request_open_workspace_in_vscode,
    request_open_workspace_folder,
    request_open_url_in_browser,
    request_start_workspace_dev_server,
)

from core.portfolio_demo import (
    load_demo_state,
    update_demo_mode,
    generate_demo_readiness_report,
    generate_release_pack,
)

try:
    from core.browser_research import (
        research_public_page,
        compare_web_pages,
        save_web_research_report,
    )
except ImportError:
    from core.browser_research import research_public_page

    def compare_web_pages(urls: List[str]) -> str:
        return "Browser comparison is not available in the current browser_research module."

    def save_web_research_report(
        title: str,
        url: str,
        summary: str,
        notes: str = "",
    ) -> str:
        return ""


from core.voice_state import load_voice_state, update_voice_state

from core.context_engine import (
    prepare_context_enriched_input,
    get_context_preview,
)

from core.knowledge_base import (
    init_knowledge_db,
    index_document,
    index_knowledge_folder,
    list_knowledge_documents,
    search_knowledge,
    summarize_knowledge_document,
)

from core.vector_memory import (
    init_vector_db,
    rebuild_vector_index,
    semantic_search,
    list_vector_items,
)

from core.workflow_blueprints import (
    list_blueprints,
    get_blueprint,
    render_blueprint,
    create_mission_from_blueprint,
)

from core.developer_agent import (
    init_developer_agent_db,
    inspect_workspace_for_development,
    diagnose_workspace_issue,
    create_patch_plan,
    list_developer_reports,
    request_workspace_file_patch,
    execute_approved_workspace_patch,
)

from core.dashboard_intelligence import (
    generate_dashboard_intelligence,
    render_dashboard_intelligence_report,
)

from core.notification_engine import (
    init_notification_db,
    create_reminder_record,
    get_reminder,
    list_reminders,
    update_reminder_status,
    refresh_due_reminders,
    list_notification_events,
    generate_startup_briefing,
)

from core.user_settings import (
    init_user_settings_db,
    list_user_settings,
    get_user_settings_map,
    update_user_setting,
    reset_user_settings,
    render_user_profile_summary,
)

from core.plugin_registry import (
    init_plugin_registry_db,
    list_plugins,
    get_plugin,
    set_plugin_enabled,
    get_plugin_metrics,
    render_plugin_registry_report,
)

from core.backend_sidecar import (
    get_sidecar_status,
    start_backend_sidecar,
    stop_backend_sidecar,
    restart_backend_sidecar,
    render_sidecar_report,
)

from core.tool_permissions import (
    get_tool_permission_matrix,
    get_tool_permission_metrics,
    is_tool_allowed,
    render_tool_permission_report,
)

from core.tool_audit import (
    get_tool_audit_metrics,
    init_tool_audit_db,
    list_tool_audit_events,
    render_tool_audit_report,
)

from core.security_policy import (
    apply_security_profile,
    get_active_security_policy,
    get_security_profile,
    init_security_policy_db,
    list_security_policy_events,
    list_security_profiles,
    render_security_policy_report,
)

from core.release_candidate import (
    freeze_system,
    generate_release_candidate_package,
    generate_release_checklist as generate_release_candidate_checklist,
    get_freeze_state,
    init_release_candidate_db,
    list_release_events,
    render_release_candidate_report,
    unfreeze_system,
)

from core.stabilization_manager import (
    render_stabilization_report,
    run_stabilization_scan,
    save_stabilization_report,
)

from tools.safe_tools import (
    create_note,
    read_note,
    save_activity_log,
    list_notes,
)

from tools.project_tools import (
    register_project,
    list_projects,
    read_project,
    update_project_status,
    add_project_note,
    save_project_roadmap,
    save_portfolio_summary,
)

from tools.dev_tools import (
    get_system_status,
    list_directory,
    read_project_file,
    write_project_file,
    run_safe_command,
    execute_approved_dev_action,
)

from tools.memory_tools import (
    remember_information,
    search_persistent_memory,
    list_recent_persistent_memory,
)

from tools.mission_tools import (
    create_mission,
    list_missions,
    read_mission,
    update_mission_status,
    update_mission_step_status,
    add_mission_step,
)

from tools.workspace_tools import (
    register_workspace,
    list_workspaces,
    read_workspace,
    inspect_workspace,
    read_workspace_key_file,
    detect_workspace_tech_stack,
    summarize_workspace as summarize_workspace_tool,
)

from tools.system_doctor_tools import run_system_doctor_tool

from tools.knowledge_tools import (
    index_knowledge_document,
    index_knowledge_folder_tool,
    list_knowledge_documents_tool,
    search_local_knowledge,
    summarize_knowledge_document_tool,
)

from tools.vector_memory_tools import (
    rebuild_vector_memory_index,
    semantic_memory_search,
    list_vector_memory_items,
)

from tools.workflow_blueprint_tools import (
    list_workflow_blueprints,
    read_workflow_blueprint,
    create_mission_from_workflow_blueprint,
)

from tools.developer_agent_tools import (
    inspect_workspace_for_development_tool,
    diagnose_workspace_issue_tool,
    create_workspace_patch_plan,
    request_workspace_file_patch_tool,
    list_developer_reports_tool,
)

from tools.dashboard_intelligence_tools import (
    get_dashboard_intelligence_report,
)

from tools.notification_tools import (
    create_local_reminder,
    list_local_reminders,
    complete_local_reminder,
    refresh_due_reminders_tool,
    generate_startup_briefing_tool,
)

from tools.user_settings_tools import (
    list_user_profile_settings,
    update_user_profile_setting,
    reset_user_profile_settings,
    get_user_profile_summary,
)

from tools.plugin_registry_tools import (
    list_orion_plugins,
    inspect_orion_plugin,
    set_orion_plugin_enabled,
    get_plugin_registry_report,
)

from tools.backend_sidecar_tools import (
    get_backend_sidecar_status,
    start_backend_sidecar_tool,
    stop_backend_sidecar_tool,
    restart_backend_sidecar_tool,
)

from tools.tool_permission_tools import (
    get_tool_permission_report,
    check_tool_permission,
    get_tool_permission_metrics_tool,
    list_tool_permission_matrix,
)

from tools.tool_audit_tools import (
    get_tool_audit_report,
    list_tool_audit_events_tool,
    get_tool_audit_metrics_tool,
)

from tools.security_policy_tools import (
    list_security_profiles_tool,
    get_active_security_policy_tool,
    apply_security_profile_tool,
    get_security_policy_report,
)

from tools.release_candidate_tools import (
    get_release_candidate_status,
    freeze_release_candidate,
    unfreeze_release_candidate,
    generate_release_candidate_package_tool,
    get_release_candidate_report,
)

from tools.stabilization_tools import (
    get_stabilization_report,
    run_stabilization_scan_tool,
    save_stabilization_report as save_stabilization_report_tool,
)


app = FastAPI(
    title="O.R.I.O.N. API",
    description="Operational Response and Intelligent Orchestration Network backend API.",
    version="4.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


orion = Agent(
    name="O.R.I.O.N.",
    instructions=ORION_SYSTEM_PROMPT,
    tools=[
        create_note,
        read_note,
        save_activity_log,
        list_notes,
        register_project,
        list_projects,
        read_project,
        update_project_status,
        add_project_note,
        save_project_roadmap,
        save_portfolio_summary,
        get_system_status,
        list_directory,
        read_project_file,
        write_project_file,
        run_safe_command,
        remember_information,
        search_persistent_memory,
        list_recent_persistent_memory,
        create_mission,
        list_missions,
        read_mission,
        update_mission_status,
        update_mission_step_status,
        add_mission_step,
        register_workspace,
        list_workspaces,
        read_workspace,
        inspect_workspace,
        read_workspace_key_file,
        detect_workspace_tech_stack,
        summarize_workspace_tool,
        run_system_doctor_tool,
        index_knowledge_document,
        index_knowledge_folder_tool,
        list_knowledge_documents_tool,
        search_local_knowledge,
        summarize_knowledge_document_tool,
        rebuild_vector_memory_index,
        semantic_memory_search,
        list_vector_memory_items,
        list_workflow_blueprints,
        read_workflow_blueprint,
        create_mission_from_workflow_blueprint,
        inspect_workspace_for_development_tool,
        diagnose_workspace_issue_tool,
        create_workspace_patch_plan,
        request_workspace_file_patch_tool,
        list_developer_reports_tool,
        get_dashboard_intelligence_report,
        create_local_reminder,
        list_local_reminders,
        complete_local_reminder,
        refresh_due_reminders_tool,
        generate_startup_briefing_tool,
        list_user_profile_settings,
        update_user_profile_setting,
        reset_user_profile_settings,
        get_user_profile_summary,
        list_orion_plugins,
        inspect_orion_plugin,
        set_orion_plugin_enabled,
        get_plugin_registry_report,
        get_backend_sidecar_status,
        start_backend_sidecar_tool,
        stop_backend_sidecar_tool,
        restart_backend_sidecar_tool,
        get_tool_permission_report,
        check_tool_permission,
        get_tool_permission_metrics_tool,
        list_tool_permission_matrix,
        get_tool_audit_report,
        list_tool_audit_events_tool,
        get_tool_audit_metrics_tool,
        list_security_profiles_tool,
        get_active_security_policy_tool,
        apply_security_profile_tool,
        get_security_policy_report,
        get_release_candidate_status,
        freeze_release_candidate,
        unfreeze_release_candidate,
        generate_release_candidate_package_tool,
        get_release_candidate_report,
        run_stabilization_scan_tool,
        get_stabilization_report,
        save_stabilization_report_tool,
    ],
)

session = SQLiteSession("orion_core_v38_tool_audit_center")


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str


class SystemStatusResponse(BaseModel):
    name: str
    version: str
    mode: str
    status: str
    tagline: str
    modules: List[str]


class ActivityEvent(BaseModel):
    id: int
    timestamp: str
    type: str
    source: str
    message: str


class ActivityResponse(BaseModel):
    events: List[ActivityEvent]


class ProjectItem(BaseModel):
    key: str
    name: str
    type: str
    status: str
    description: str
    updated_at: Optional[str] = None


class ProjectsResponse(BaseModel):
    projects: List[ProjectItem]


class MemoryItem(BaseModel):
    id: int
    category: str
    title: str
    content: str
    source: str
    importance: int
    created_at: str
    updated_at: str


class MemoryResponse(BaseModel):
    items: List[MemoryItem]


class MissionStepItem(BaseModel):
    id: int
    mission_id: int
    position: int
    title: str
    details: str
    status: str
    created_at: str
    updated_at: str


class MissionItem(BaseModel):
    id: int
    title: str
    goal: str
    status: str
    priority: int
    created_at: str
    updated_at: str


class MissionDetailItem(MissionItem):
    steps: List[MissionStepItem] = Field(default_factory=list)


class MissionsResponse(BaseModel):
    missions: List[MissionItem]


class MissionRunResponse(BaseModel):
    mission_id: int
    step_id: Optional[int] = None
    status: str
    output: str
    result: Optional[str] = None


class MultiStepMissionRunRequest(BaseModel):
    max_steps: int = 3


class MultiStepMissionRunResponse(BaseModel):
    mission_id: int
    requested_steps: int
    completed_cycles: int
    status: str
    stop_reason: str
    cycles: List[MissionRunResponse]


class MissionRunItem(BaseModel):
    id: int
    mission_id: int
    step_id: Optional[int] = None
    mission_title: str
    step_title: str
    status: str
    output: str
    error: str
    started_at: str
    completed_at: Optional[str] = None
    created_at: str


class MissionRunsResponse(BaseModel):
    runs: List[MissionRunItem]


class MissionReportResponse(BaseModel):
    version: str = "2.5"
    mission_id: int
    report_path: str
    status: str


class ApprovalItem(BaseModel):
    id: int
    action_type: str
    title: str
    description: str
    payload: Dict[str, Any]
    risk_level: str
    status: str
    result: str
    source: str
    created_at: str
    updated_at: str


class ApprovalsResponse(BaseModel):
    approvals: List[ApprovalItem]


class WorkspaceItem(BaseModel):
    id: int
    name: str
    path: str
    description: str
    status: str
    created_at: str
    updated_at: str


class WorkspacesResponse(BaseModel):
    workspaces: List[WorkspaceItem]


class WorkspaceSummaryResponse(BaseModel):
    workspace_id: int
    name: str
    path: str
    description: str = ""
    status: str = ""
    summary: str
    detected_stack: List[str]
    key_files: List[str]


class WorkspaceStackResponse(BaseModel):
    workspace_id: int
    name: Optional[str] = None
    path: Optional[str] = None
    summary: str
    detected_stack: List[str]
    key_files: List[str]


class WorkspaceTreeResponse(BaseModel):
    workspace_id: int
    tree: str


class WorkspaceRegisterRequest(BaseModel):
    name: str
    path: str
    description: str = ""


class GitHubReleaseRequest(BaseModel):
    release_version: str = "v1.9"
    change_summary: str = ""


class GitHubReleaseResponse(BaseModel):
    workspace_id: int
    status: str
    content: str
    artifact_path: Optional[str] = None


class BrowserResearchRequest(BaseModel):
    url: str


class BrowserCompareRequest(BaseModel):
    urls: List[str]


class BrowserResearchSaveRequest(BaseModel):
    title: str
    url: str
    summary: str
    notes: str = ""


class BrowserResearchResponse(BaseModel):
    status: str = "success"
    url: str = ""
    final_url: str = ""
    status_code: int = 0
    title: str = ""
    summary: str = ""
    headings: List[str] = Field(default_factory=list)
    links: List[Dict[str, str]] = Field(default_factory=list)
    content_preview: str = ""
    content: str = ""
    artifact_path: Optional[str] = None
    created_at: str = ""


class VoiceStatusResponse(BaseModel):
    mode: str
    wake_phrase: str
    listening: bool
    last_transcript: str
    last_response: str
    last_event: str
    updated_at: str


class ContextPreviewRequest(BaseModel):
    message: str


class ContextPreviewResponse(BaseModel):
    message: str
    context: str


class DesktopUrlRequest(BaseModel):
    url: str


class DesktopActionResponse(BaseModel):
    status: str
    approval_id: Optional[int] = None
    message: str


class DesktopShellStatusResponse(BaseModel):
    status: str
    app_name: str
    shell_version: str
    backend_url: str
    frontend_mode: str
    message: str


class BackendSidecarStatusResponse(BaseModel):
    managed_by: str
    status: str
    pid: Optional[int] = None
    host: str
    port: int
    backend_url: str
    started_at: str
    updated_at: str
    last_error: str
    pid_running: bool
    port_open: bool
    log_file: str
    state_file: str
    report: str


class BackendSidecarActionResponse(BaseModel):
    status: str
    message: str
    sidecar: BackendSidecarStatusResponse


class ToolPermissionItem(BaseModel):
    tool_name: str
    plugin_key: str
    plugin_name: str
    enabled: bool
    risk_level: str
    category: str
    permissions: List[str]
    protected: bool


class ToolPermissionResponse(BaseModel):
    metrics: Dict[str, Any]
    matrix: List[ToolPermissionItem]
    report: str


class ToolPermissionCheckResponse(BaseModel):
    allowed: bool
    tool_name: str
    plugin_key: str
    reason: str


class ToolAuditEventItem(BaseModel):
    id: int
    tool_name: str
    plugin_key: str
    decision: str
    reason: str
    risk_level: str
    category: str
    source: str
    created_at: str


class ToolAuditResponse(BaseModel):
    metrics: Dict[str, Any]
    events: List[ToolAuditEventItem]
    report: str




class SecurityProfileItem(BaseModel):
    key: str
    name: str
    description: str
    safety_level: str
    enabled_plugin_count: int
    disabled_plugin_count: int


class SecurityProfileDetail(BaseModel):
    key: str
    name: str
    description: str
    safety_level: str
    enabled_plugins: List[str]
    disabled_plugins: List[str]


class SecurityPolicyEventItem(BaseModel):
    id: int
    profile_key: str
    profile_name: str
    summary: str
    enabled_count: int
    disabled_count: int
    source: str
    created_at: str


class SecurityPolicyResponse(BaseModel):
    active_policy: Dict[str, Any]
    profiles: List[SecurityProfileItem]
    events: List[SecurityPolicyEventItem]
    report: str


class SecurityPolicyApplyRequest(BaseModel):
    profile_key: str


class SecurityPolicyApplyResponse(BaseModel):
    status: str
    profile_key: str
    profile_name: str
    summary: str
    enabled_count: int
    disabled_count: int
    unchanged_count: int
    applied_at: str
    active_policy: Dict[str, Any]


class ReleaseFreezeState(BaseModel):
    frozen: bool
    release_version: str
    release_name: str
    freeze_reason: str
    frozen_at: str
    unfrozen_at: str
    updated_at: str


class ReleaseFreezeRequest(BaseModel):
    reason: str = "Preparing O.R.I.O.N. v4.0 release candidate."


class ReleaseChecklistItem(BaseModel):
    item: str
    ok: bool
    details: str


class ReleaseChecklistResponse(BaseModel):
    passed: int
    failed: int
    items: List[ReleaseChecklistItem]


class ReleaseEventItem(BaseModel):
    id: int
    event_type: str
    title: str
    message: str
    artifact_path: str
    created_at: str


class ReleaseCandidateStatusResponse(BaseModel):
    freeze_state: ReleaseFreezeState
    checklist: ReleaseChecklistResponse
    events: List[ReleaseEventItem]
    report: str


class ReleaseCandidatePackageResponse(BaseModel):
    status: str
    generated_at: str
    summary_path: str
    artifacts: Dict[str, str]
    checklist: Dict[str, Any]


class StabilizationRunRequest(BaseModel):
    run_build: bool = False


class StabilizationActionResponse(BaseModel):
    status: str
    generated_at: str
    scan: Dict[str, Any]
    report: str
    path: str = ""


class DemoStatusResponse(BaseModel):
    demo_mode: bool
    release_version: str
    project_name: str
    interface_name: str
    tagline: str
    last_generated_pack: str
    updated_at: str
    readiness_report: str


class DemoModeRequest(BaseModel):
    enabled: bool


class DemoReleasePackResponse(BaseModel):
    status: str
    generated_at: str
    files: List[str]


class KnowledgeIndexRequest(BaseModel):
    path: str
    summary: str = ""


class KnowledgeFolderIndexRequest(BaseModel):
    folder_path: str


class KnowledgeSearchRequest(BaseModel):
    query: str
    limit: int = 10


class KnowledgeDocumentItem(BaseModel):
    id: int
    title: str
    source_path: str
    extension: str
    size_bytes: int
    summary: str
    indexed_at: str
    updated_at: str


class KnowledgeDocumentsResponse(BaseModel):
    documents: List[KnowledgeDocumentItem]


class KnowledgeSearchItem(BaseModel):
    chunk_id: int
    document_id: int
    chunk_index: int
    content: str
    title: str
    source_path: str
    extension: str


class KnowledgeSearchResponse(BaseModel):
    results: List[KnowledgeSearchItem]


class KnowledgeActionResponse(BaseModel):
    status: str
    message: str
    data: Dict[str, Any] = Field(default_factory=dict)


class VectorRebuildResponse(BaseModel):
    status: str
    data: Dict[str, Any]


class VectorItem(BaseModel):
    id: int
    source_type: str
    source_id: str
    title: str
    content: str
    metadata: Dict[str, Any]
    created_at: str
    updated_at: str


class VectorItemsResponse(BaseModel):
    items: List[VectorItem]


class SemanticSearchRequest(BaseModel):
    query: str
    limit: int = 8


class SemanticSearchItem(BaseModel):
    id: int
    source_type: str
    source_id: str
    title: str
    content: str
    metadata: Dict[str, Any]
    score: float
    created_at: str
    updated_at: str


class SemanticSearchResponse(BaseModel):
    results: List[SemanticSearchItem]


class WorkflowBlueprintItem(BaseModel):
    key: str
    name: str
    description: str
    priority: int
    step_count: int


class WorkflowBlueprintsResponse(BaseModel):
    blueprints: List[WorkflowBlueprintItem]


class WorkflowBlueprintDetailResponse(BaseModel):
    key: str
    name: str
    description: str
    priority: int
    steps: List[str]
    rendered: str


class CreateMissionFromBlueprintRequest(BaseModel):
    mission_title: str = ""
    custom_goal: str = ""
    workspace_id: Optional[int] = None


class CreateMissionFromBlueprintResponse(BaseModel):
    status: str
    mission_id: Optional[int] = None
    blueprint_key: str
    title: str = ""
    goal: str = ""
    step_count: int = 0
    created_at: str = ""
    message: str = ""


class DeveloperInspectResponse(BaseModel):
    workspace_id: int
    status: str
    content: str


class DeveloperIssueRequest(BaseModel):
    issue_description: str
    target_files: List[str] = Field(default_factory=list)


class DeveloperPatchRequest(BaseModel):
    relative_path: str
    new_content: str
    reason: str


class DeveloperPatchResponse(BaseModel):
    status: str
    approval_id: Optional[int] = None
    message: str


class DeveloperReportItem(BaseModel):
    id: int
    workspace_id: int
    report_type: str
    title: str
    content: str
    artifact_path: str
    created_at: str


class DeveloperReportsResponse(BaseModel):
    reports: List[DeveloperReportItem]


class ReminderCreateRequest(BaseModel):
    title: str
    description: str = ""
    due_at: str
    priority: str = "medium"


class ReminderStatusRequest(BaseModel):
    status: str


class ReminderItem(BaseModel):
    id: int
    title: str
    description: str
    due_at: str
    status: str
    priority: str
    source: str
    created_at: str
    updated_at: str


class RemindersResponse(BaseModel):
    reminders: List[ReminderItem]


class NotificationEventItem(BaseModel):
    id: int
    event_type: str
    title: str
    message: str
    source: str
    created_at: str


class NotificationEventsResponse(BaseModel):
    events: List[NotificationEventItem]


class StartupBriefingResponse(BaseModel):
    status: str
    briefing: str


class UserSettingItem(BaseModel):
    key: str
    value: str
    description: str
    updated_at: str
    options: List[str] = Field(default_factory=list)


class UserSettingsResponse(BaseModel):
    settings: List[UserSettingItem]
    settings_map: Dict[str, str]
    profile_summary: str


class UserSettingUpdateRequest(BaseModel):
    value: str


class UserSettingUpdateResponse(BaseModel):
    status: str
    setting: Optional[UserSettingItem] = None
    message: str


class PluginItem(BaseModel):
    key: str
    name: str
    description: str
    category: str
    risk_level: str
    permissions: List[str]
    enabled: bool
    built_in: bool
    created_at: str
    updated_at: str


class PluginsResponse(BaseModel):
    plugins: List[PluginItem]
    metrics: Dict[str, Any]
    report: str


class PluginStatusUpdateRequest(BaseModel):
    enabled: bool


class PluginStatusUpdateResponse(BaseModel):
    status: str
    plugin: Optional[PluginItem] = None
    message: str


class DashboardIntelligenceResponse(BaseModel):
    intelligence_score: int
    readiness_label: str
    mission_metrics: Dict[str, Any]
    workspace_metrics: Dict[str, Any]
    memory_metrics: Dict[str, Any]
    risk_metrics: Dict[str, Any]
    activity_metrics: Dict[str, Any]
    developer_metrics: Dict[str, Any]
    notification_metrics: Dict[str, Any]
    user_settings: Dict[str, str]
    plugin_metrics: Dict[str, Any]
    tool_permission_metrics: Dict[str, Any]
    tool_audit_metrics: Dict[str, Any]
    security_policy: Dict[str, Any]
    release_candidate: Dict[str, Any]
    stabilization: Dict[str, Any]
    recommendations: List[str]
    report: str


@app.on_event("startup")
def startup_event():
    init_memory_db()
    init_mission_db()
    init_approval_db()
    init_mission_run_db()
    init_workspace_db()
    init_knowledge_db()
    init_vector_db()
    init_developer_agent_db()
    init_notification_db()
    init_user_settings_db()
    init_plugin_registry_db()
    init_tool_audit_db()
    init_security_policy_db()
    init_release_candidate_db()

    log_activity(
        "SYSTEM_START",
        "O.R.I.O.N. API v4.1.0 started with Stabilization Manager enabled.",
        "API",
    )


@app.get("/")
def root():
    return {
        "name": "O.R.I.O.N.",
        "version": "4.1.0",
        "status": "online",
        "mode": "Aurora OS API Bridge",
    }


def load_project_items() -> List[ProjectItem]:
    projects_file = BACKEND_DIR / "data" / "projects.json"

    if not projects_file.exists():
        return []

    try:
        projects_data = json.loads(projects_file.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []

    items: List[ProjectItem] = []

    for key, project in projects_data.items():
        items.append(
            ProjectItem(
                key=key,
                name=project.get("name", key),
                type=project.get("type", "Unknown"),
                status=project.get("status", "unknown"),
                description=project.get("description", ""),
                updated_at=project.get("updated_at"),
            )
        )

    return items


def get_next_actionable_step(mission: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    steps = mission.get("steps", [])

    for step in steps:
        if step.get("status") in ["pending", "in_progress", "waiting_approval"]:
            return step

    return None


def get_pending_approval_ids() -> Set[int]:
    try:
        approvals = list_approval_requests(limit=50, status="pending")
    except TypeError:
        approvals = [
            approval
            for approval in list_approval_requests(limit=50)
            if approval.get("status") == "pending"
        ]

    return {int(approval["id"]) for approval in approvals}


@app.get("/api/status", response_model=SystemStatusResponse)
def status():
    return SystemStatusResponse(
        name="O.R.I.O.N.",
        version="4.1",
        mode="Aurora OS Dashboard",
        status="online",
        tagline="Think. Plan. Act. Learn.",
        modules=[
            "AI Brain",
            "Safe Tools",
            "Project Memory",
            "Developer Command Center",
            "Voice Mode",
            "Wake Phrase Mode",
            "Aurora OS API",
            "Live Activity Timeline",
            "Tool-Level Instrumentation",
            "Project Launcher Panel",
            "Mission Control Release",
            "UI Polish + Screenshot Showcase",
            "Persistent Memory Upgrade",
            "Command Approval System",
            "Controlled Autonomous Mission Execution Loop",
            "Mission Run History + Execution Reports",
            "Project Workspace Manager",
            "GitHub Release Assistant",
            "Browser Research + Web Automation Layer",
            "Voice + Wake Phrase Polish",
            "Smarter Memory + Project Context Retrieval",
            "Controlled Multi-Step Mission Mode",
            "Desktop Control Layer",
            "Portfolio Release + Demo Mode",
            "Local Knowledge Base + Document Intelligence",
            "Vector Memory + Semantic Search",
            "Workflow Templates + Mission Blueprints",
            "Agentic Workspace Developer Mode",
            "Visual Dashboard Intelligence",
            "Notification + Reminder Engine",
            "Secure User Profiles + Settings",
            "Plugin System + Tool Registry",
            "Packaged Desktop App Shell",
            "Backend Sidecar + One-Click Desktop Launch",
            "Tool Permission Enforcement Layer",
            "Tool Permission Enforcement Expansion + Audit Center",
            "Security Policy Profiles + Risk Modes",
            "Autonomous Release Candidate + System Freeze",
            "Stabilization, Bug Fixing + Codebase Cleanup",
        ],
    )


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "system": "O.R.I.O.N.",
        "version": "4.1.0",
        "message": "O.R.I.O.N. Mission Control backend is operational.",
    }


@app.get("/api/mission")
def mission():
    return {
        "name": "O.R.I.O.N.",
        "full_name": "Operational Response and Intelligent Orchestration Network",
        "interface": "Aurora OS",
        "tagline": "Think. Plan. Act. Learn.",
        "release": "v4.1 Stabilization, Bug Fixing + Codebase Cleanup",
        "capabilities": [
            "AI chat console",
            "Project memory",
            "Safe developer tools",
            "Voice mode",
            "Wake phrase mode",
            "Live activity timeline",
            "Tool-level instrumentation",
            "Project launcher",
            "Mission Planner System",
            "Command Approval System",
            "Controlled Autonomous Mission Execution Loop",
            "Mission Run History",
            "Mission Execution Reports",
            "Workspace context retrieval",
            "Project context retrieval",
            "Memory context retrieval",
            "Mission context retrieval",
            "Controlled multi-step mission execution",
            "Desktop control approvals",
            "Open workspace in VS Code",
            "Open workspace folder",
            "Start workspace development server",
            "Open approved URLs in browser",
            "Portfolio demo mode",
            "Demo readiness report",
            "Portfolio release pack generation",
            "Local Knowledge Base",
            "Document indexing and search",
            "Knowledge-aware context retrieval",
            "Aurora OS Knowledge Base panel",
            "Vector Memory",
            "Semantic search",
            "Embedding-based context retrieval",
            "Meaning-aware memory and knowledge search",
            "Workflow Blueprints",
            "Reusable mission templates",
            "Blueprint-to-mission generation",
            "Standard release, research, bug-fix, and portfolio workflows",
            "Agentic Workspace Developer Mode",
            "Workspace inspection and diagnosis",
            "Approval-gated patch planning",
            "Developer report generation",
            "Safe workspace file patching with backup",
            "Dashboard Intelligence",
            "System intelligence score",
            "Mission and workspace analytics",
            "Memory, knowledge, vector, approval, and activity metrics",
            "Readiness recommendations",
            "Notification + Reminder Engine",
            "Secure User Profiles + Settings",
            "Plugin System + Tool Registry",
            "Local reminders",
            "Startup briefing",
            "Due task tracking",
            "Notification event log",
            "Secure local user profile settings",
            "Safety level configuration",
            "Default workspace preference",
            "Voice, theme, and model preferences",
            "Settings-aware context retrieval",
            "Plugin System + Tool Registry",
            "Plugin permissions and risk levels",
            "Enable/disable plugin state",
            "Plugin registry reports",
            "Modular tool architecture foundation",
            "Packaged desktop app shell",
            "Tauri desktop wrapper",
            "Static Aurora OS frontend export",
            "Desktop shell backend status",
            "Local desktop launch scripts",
            "Backend sidecar manager",
            "One-click desktop launch",
            "Sidecar status panel",
            "Local desktop shortcut installer",
            "Backend process health tracking",
            "Tool Permission Enforcement",
            "Plugin-controlled tool access",
            "Blocked tool logging",
            "Tool-to-plugin permission matrix",
            "High-risk tool visibility",
            "Tool Audit Center",
            "Allowed/blocked tool event history",
            "Security decision reports",
            "Expanded plugin enforcement coverage",
            "Audit-aware Dashboard Intelligence",
            "Security Policy Profiles",
            "Strict, Balanced, and Developer Lab risk modes",
            "Policy-controlled plugin states",
            "Security policy event history",
            "Risk-aware Dashboard Intelligence",
        ],
        "safety_model": [
            "No uncontrolled destructive commands",
            "Safe project directory access",
            "Approved developer command execution only",
            "Approved desktop actions only",
            "Activity and tool execution logging",
            "Mission run history records every controlled execution cycle",
            "Multi-step mission mode stops on approval, completion, error, or repeated step detection",
            "Desktop control actions must pass through the Command Approval System",
            "Portfolio demo mode uses generated release artifacts and readiness reporting",
            "Local knowledge indexing reads supported local files only and skips heavy folders",
            "Local reminders stay inside Aurora OS without external calendar, email, SMS, or push integrations",
        ],
    }


@app.get("/api/activity", response_model=ActivityResponse)
def activity():
    return ActivityResponse(events=get_recent_activity())


@app.post("/api/activity/clear")
def clear_activity_route():
    clear_activity()
    log_activity("SYSTEM", "Activity timeline cleared.", "Aurora OS")
    return {"status": "cleared"}


@app.get("/api/projects", response_model=ProjectsResponse)
def projects():
    log_activity(
        "PROJECTS_VIEW",
        "Aurora OS requested the project launcher list.",
        "Aurora OS",
    )
    return ProjectsResponse(projects=load_project_items())


@app.get("/api/projects/{project_key}", response_model=ProjectItem)
def project_detail(project_key: str):
    items = load_project_items()

    for item in items:
        if item.key == project_key:
            log_activity(
                "PROJECT_OPEN",
                f"Project opened in launcher: {item.name}",
                "Aurora OS",
            )
            return item

    return ProjectItem(
        key=project_key,
        name="Project not found",
        type="Unknown",
        status="missing",
        description="No project found with that key.",
        updated_at=None,
    )


@app.get("/api/memory", response_model=MemoryResponse)
def memory_items():
    log_activity(
        "MEMORY_VIEW",
        "Aurora OS requested persistent memory items.",
        "Aurora OS",
    )
    return MemoryResponse(items=list_recent_memory(limit=20))


@app.get("/api/memory/search", response_model=MemoryResponse)
def memory_search(q: str):
    log_activity(
        "MEMORY_SEARCH",
        f"Aurora OS searched memory for: {q}",
        "Aurora OS",
    )
    return MemoryResponse(items=search_memory_items(query=q, limit=20))


@app.get("/api/missions", response_model=MissionsResponse)
def missions():
    log_activity(
        "MISSIONS_VIEW",
        "Aurora OS requested mission planner records.",
        "Aurora OS",
    )
    return MissionsResponse(missions=list_mission_records(limit=20))


@app.get("/api/missions/{mission_id}", response_model=MissionDetailItem)
def mission_detail(mission_id: int):
    mission_record = get_mission_record(mission_id)

    if not mission_record:
        log_activity(
            "MISSION_OPEN_FAILED",
            f"Mission not found: {mission_id}",
            "Aurora OS",
        )

        return MissionDetailItem(
            id=mission_id,
            title="Mission not found",
            goal="No mission found with that ID.",
            status="missing",
            priority=0,
            created_at="",
            updated_at="",
            steps=[],
        )

    log_activity(
        "MISSION_OPEN",
        f"Mission opened: {mission_record['title']}",
        "Aurora OS",
    )

    return MissionDetailItem(**mission_record)


@app.get("/api/mission-runs", response_model=MissionRunsResponse)
def mission_runs():
    log_activity(
        "MISSION_RUNS_VIEW",
        "Aurora OS requested mission run history.",
        "Aurora OS",
    )
    return MissionRunsResponse(runs=list_mission_runs(limit=30))


@app.get("/api/missions/{mission_id}/runs", response_model=MissionRunsResponse)
def mission_runs_for_mission(mission_id: int):
    log_activity(
        "MISSION_RUNS_VIEW",
        f"Aurora OS requested run history for mission {mission_id}.",
        "Aurora OS",
    )
    return MissionRunsResponse(
        runs=list_runs_for_mission(
            mission_id=mission_id,
            limit=50,
        )
    )


@app.post("/api/missions/{mission_id}/report", response_model=MissionReportResponse)
def mission_report(mission_id: int):
    mission_record = get_mission_record(mission_id)

    if not mission_record:
        log_activity(
            "MISSION_REPORT_FAILED",
            f"Mission not found for report: {mission_id}",
            "O.R.I.O.N.",
        )

        return MissionReportResponse(
            mission_id=mission_id,
            report_path="",
            status="mission_not_found",
        )

    report_path = generate_mission_report(mission_record)

    log_activity(
        "MISSION_REPORT_CREATED",
        f"Mission execution report generated: {report_path}",
        "O.R.I.O.N.",
    )

    return MissionReportResponse(
        mission_id=mission_id,
        report_path=report_path,
        status="created",
    )


@app.get("/api/approvals", response_model=ApprovalsResponse)
def approvals():
    log_activity(
        "APPROVALS_VIEW",
        "Aurora OS requested command approval queue.",
        "Aurora OS",
    )
    return ApprovalsResponse(approvals=list_approval_requests(limit=30))


@app.post("/api/approvals/{approval_id}/approve")
def approve_request(approval_id: int):
    log_activity(
        "APPROVAL_APPROVE",
        f"Approval request approved: {approval_id}",
        "Aurora OS",
    )

    try:
        approval = next(
            (
                item
                for item in list_approval_requests(limit=100)
                if item["id"] == approval_id
            ),
            None,
        )

        if approval and approval["action_type"] in ALLOWED_DESKTOP_ACTIONS:
            result = execute_approved_desktop_action(approval_id)
        elif approval and approval["action_type"] == "APPLY_WORKSPACE_FILE_PATCH":
            result = execute_approved_workspace_patch(approval)
        else:
            result = execute_approved_dev_action(approval_id)

        update_approval_status(approval_id, "approved", result)

        log_activity(
            "APPROVAL_EXECUTED",
            f"Approval {approval_id} executed: {result}",
            "O.R.I.O.N.",
        )

        return {
            "status": "approved",
            "approval_id": approval_id,
            "result": result,
        }

    except Exception as error:
        update_approval_status(approval_id, "failed", str(error))

        log_activity(
            "APPROVAL_FAILED",
            f"Approval {approval_id} failed: {error}",
            "O.R.I.O.N.",
        )

        return {
            "status": "failed",
            "approval_id": approval_id,
            "result": str(error),
        }


@app.post("/api/approvals/{approval_id}/reject")
def reject_request(approval_id: int):
    update_approval_status(
        approval_id,
        "rejected",
        "Rejected by user.",
    )

    log_activity(
        "APPROVAL_REJECTED",
        f"Approval request rejected: {approval_id}",
        "Aurora OS",
    )

    return {
        "status": "rejected",
        "approval_id": approval_id,
        "result": "Rejected by user.",
    }


@app.post("/api/missions/{mission_id}/run-next", response_model=MissionRunResponse)
async def run_next_mission_step(mission_id: int):
    if not os.getenv("OPENAI_API_KEY"):
        log_activity(
            "MISSION_RUN_FAILED",
            "Missing OPENAI_API_KEY in backend/.env",
            "API",
        )

        output = "Missing OPENAI_API_KEY in backend/.env"

        return MissionRunResponse(
            mission_id=mission_id,
            step_id=None,
            status="missing_api_key",
            output=output,
            result=output,
        )

    mission_record = get_mission_record(mission_id)

    if not mission_record:
        log_activity(
            "MISSION_RUN_FAILED",
            f"Mission not found: {mission_id}",
            "O.R.I.O.N.",
        )

        output = "Mission not found."

        return MissionRunResponse(
            mission_id=mission_id,
            step_id=None,
            status="missing",
            output=output,
            result=output,
        )

    next_step = get_next_actionable_step(mission_record)

    if not next_step:
        log_activity(
            "MISSION_RUN_COMPLETE",
            f"No pending steps for mission: {mission_record['title']}",
            "O.R.I.O.N.",
        )

        output = "No pending mission steps found. Mission appears complete."

        return MissionRunResponse(
            mission_id=mission_id,
            step_id=None,
            status="complete",
            output=output,
            result=output,
        )

    step_id = int(next_step["id"])

    run_id = start_mission_run(
        mission_id=mission_id,
        mission_title=mission_record["title"],
        step_id=step_id,
        step_title=next_step["title"],
    )

    log_activity(
        "MISSION_STEP_START",
        f"Running mission {mission_id}, step {step_id}: {next_step['title']}",
        "O.R.I.O.N.",
    )

    internal_prompt = f"""
You are O.R.I.O.N. running a controlled mission execution cycle.

Mission:
ID: {mission_record['id']}
Title: {mission_record['title']}
Goal: {mission_record['goal']}
Status: {mission_record['status']}
Priority: {mission_record['priority']}

Current step:
Step ID: {next_step['id']}
Step title: {next_step['title']}
Step details: {next_step.get('details', '')}
Current step status: {next_step['status']}

Rules:
1. Execute only this one step.
2. Use available safe tools if needed.
3. If file writing or terminal command execution is needed, create an approval request through the existing tools.
4. Do not bypass the Command Approval System.
5. If you completed the step, update mission step {step_id} status to completed.
6. If approval is required, update mission step {step_id} status to waiting_approval.
7. If more user input is needed, update mission step {step_id} status to blocked.
8. Return a clear execution summary.
"""

    try:
        result = await Runner.run(
            orion,
            internal_prompt,
            session=session,
        )

        final_output = result.final_output or "Mission cycle completed."

        complete_mission_run(
            run_id=run_id,
            status="cycle_complete",
            output=final_output,
        )

        log_activity(
            "MISSION_STEP_COMPLETE",
            f"Mission {mission_id}, step {step_id} cycle completed.",
            "O.R.I.O.N.",
        )

        return MissionRunResponse(
            mission_id=mission_id,
            step_id=step_id,
            status="cycle_complete",
            output=final_output,
            result=final_output,
        )

    except Exception as error:
        error_message = str(error)

        fail_mission_run(
            run_id=run_id,
            error=error_message,
        )

        log_activity(
            "MISSION_STEP_ERROR",
            f"Mission {mission_id}, step {step_id} failed: {error_message}",
            "O.R.I.O.N.",
        )

        output = f"Mission execution failed: {error_message}"

        return MissionRunResponse(
            mission_id=mission_id,
            step_id=step_id,
            status="error",
            output=output,
            result=output,
        )


@app.post("/api/missions/{mission_id}/run-batch", response_model=MultiStepMissionRunResponse)
async def run_mission_batch(mission_id: int, request: MultiStepMissionRunRequest):
    """
    Run up to 3 controlled mission steps.
    Stops early if approval is required, mission completes, an error occurs,
    or the same step repeats without progress.
    """
    max_steps = max(1, min(request.max_steps, 3))
    cycles: List[MissionRunResponse] = []
    stop_reason = "max_steps_reached"
    last_step_id: Optional[int] = None

    log_activity(
        "MISSION_BATCH_START",
        f"Starting controlled multi-step mission run for mission {mission_id}. Max steps: {max_steps}",
        "O.R.I.O.N.",
    )

    for _ in range(max_steps):
        pending_before = get_pending_approval_ids()

        cycle = await run_next_mission_step(mission_id)
        cycles.append(cycle)

        if cycle.step_id is None:
            stop_reason = cycle.status
            break

        if cycle.status in ["missing", "complete", "error", "missing_api_key"]:
            stop_reason = cycle.status
            break

        pending_after = get_pending_approval_ids()
        new_pending_approvals = pending_after - pending_before

        if new_pending_approvals or "Approval required" in cycle.output:
            stop_reason = "waiting_approval"
            break

        if last_step_id == cycle.step_id:
            stop_reason = "same_step_repeated_no_progress"
            break

        last_step_id = cycle.step_id

    if stop_reason == "complete":
        final_status = "complete"
    elif stop_reason == "waiting_approval":
        final_status = "paused_waiting_approval"
    elif stop_reason in ["error", "missing_api_key"]:
        final_status = "error"
    else:
        final_status = "paused"

    log_activity(
        "MISSION_BATCH_COMPLETE",
        f"Multi-step mission run finished for mission {mission_id}. Status: {final_status}. Reason: {stop_reason}. Cycles: {len(cycles)}",
        "O.R.I.O.N.",
    )

    return MultiStepMissionRunResponse(
        mission_id=mission_id,
        requested_steps=max_steps,
        completed_cycles=len(cycles),
        status=final_status,
        stop_reason=stop_reason,
        cycles=cycles,
    )


@app.get("/api/workspaces", response_model=WorkspacesResponse)
def workspaces():
    log_activity("WORKSPACES_VIEW", "Aurora OS requested workspace records.", "Aurora OS")
    return WorkspacesResponse(workspaces=list_workspace_records(limit=30))


@app.post("/api/workspaces/register")
def register_workspace_api(request: WorkspaceRegisterRequest):
    workspace_id = register_workspace_record(
        name=request.name,
        path=request.path,
        description=request.description,
        status="active",
    )

    log_activity(
        "WORKSPACE_REGISTERED",
        f"Workspace registered: {request.name} → {request.path}",
        "Aurora OS",
    )

    return {
        "status": "registered",
        "workspace_id": workspace_id,
        "name": request.name,
        "path": request.path,
    }


@app.get("/api/workspaces/{workspace_id}/summary", response_model=WorkspaceSummaryResponse)
def workspace_summary(workspace_id: int):
    return WorkspaceSummaryResponse(**summarize_workspace_record(workspace_id))


@app.get("/api/workspaces/{workspace_id}/stack", response_model=WorkspaceStackResponse)
def workspace_stack(workspace_id: int):
    return WorkspaceStackResponse(**detect_workspace_stack(workspace_id))


@app.get("/api/workspaces/{workspace_id}/tree", response_model=WorkspaceTreeResponse)
def workspace_tree(workspace_id: int, max_depth: int = 2):
    return WorkspaceTreeResponse(
        workspace_id=workspace_id,
        tree=inspect_workspace_tree(workspace_id, max_depth=max_depth),
    )


@app.get("/api/workspaces/{workspace_id}/github-release/status", response_model=GitHubReleaseResponse)
def github_release_status(workspace_id: int):
    content = inspect_release_readiness(workspace_id)

    log_activity(
        "GITHUB_RELEASE_STATUS",
        f"GitHub release readiness inspected for workspace {workspace_id}.",
        "O.R.I.O.N.",
    )

    return GitHubReleaseResponse(
        workspace_id=workspace_id,
        status="generated",
        content=content,
        artifact_path=None,
    )


@app.post("/api/workspaces/{workspace_id}/github-release/notes", response_model=GitHubReleaseResponse)
def github_release_notes(workspace_id: int, request: GitHubReleaseRequest):
    result = generate_github_release_notes(
        workspace_id=workspace_id,
        release_version=request.release_version,
    )

    log_activity(
        "GITHUB_RELEASE_NOTES",
        f"GitHub release notes generated for workspace {workspace_id}.",
        "O.R.I.O.N.",
    )

    return GitHubReleaseResponse(
        workspace_id=workspace_id,
        status="generated",
        content=result["content"],
        artifact_path=result["artifact_path"],
    )


@app.post("/api/workspaces/{workspace_id}/github-release/checklist", response_model=GitHubReleaseResponse)
def github_release_checklist(workspace_id: int, request: GitHubReleaseRequest):
    result = generate_release_checklist(
        workspace_id=workspace_id,
        release_version=request.release_version,
    )

    log_activity(
        "GITHUB_RELEASE_CHECKLIST",
        f"GitHub release checklist generated for workspace {workspace_id}.",
        "O.R.I.O.N.",
    )

    return GitHubReleaseResponse(
        workspace_id=workspace_id,
        status="generated",
        content=result["content"],
        artifact_path=result["artifact_path"],
    )


@app.post("/api/workspaces/{workspace_id}/github-release/commit-message", response_model=GitHubReleaseResponse)
def github_release_commit_message(workspace_id: int, request: GitHubReleaseRequest):
    content = generate_commit_message(
        release_version=request.release_version,
        change_summary=request.change_summary,
    )

    log_activity(
        "GITHUB_COMMIT_MESSAGE",
        f"Release commit message suggested for workspace {workspace_id}.",
        "O.R.I.O.N.",
    )

    return GitHubReleaseResponse(
        workspace_id=workspace_id,
        status="generated",
        content=content,
        artifact_path=None,
    )


@app.post("/api/browser/compare", response_model=BrowserResearchResponse)
def browser_compare(request: BrowserCompareRequest):
    try:
        content = compare_web_pages(request.urls)

        log_activity(
            "BROWSER_COMPARE",
            f"Compared {len(request.urls)} web pages.",
            "O.R.I.O.N.",
        )

        return BrowserResearchResponse(
            status="success",
            content=content,
        )

    except Exception as error:
        log_activity(
            "BROWSER_COMPARE_FAILED",
            f"Browser comparison failed: {error}",
            "O.R.I.O.N.",
        )

        return BrowserResearchResponse(
            status="failed",
            content=str(error),
        )


@app.post("/api/browser/save", response_model=BrowserResearchResponse)
def browser_save(request: BrowserResearchSaveRequest):
    try:
        artifact_path = save_web_research_report(
            title=request.title,
            url=request.url,
            summary=request.summary,
            notes=request.notes,
        )

        log_activity(
            "BROWSER_RESEARCH_SAVED",
            f"Web research artifact saved: {artifact_path}",
            "O.R.I.O.N.",
        )

        return BrowserResearchResponse(
            status="saved",
            title=request.title,
            url=request.url,
            summary=request.summary,
            content=request.summary,
            artifact_path=artifact_path,
        )

    except Exception as error:
        return BrowserResearchResponse(
            status="failed",
            content=str(error),
        )


def run_browser_research_request(request: BrowserResearchRequest) -> BrowserResearchResponse:
    data = research_public_page(request.url)

    log_activity(
        "BROWSER_RESEARCH",
        f"Browser research completed for: {request.url}",
        "Aurora OS",
    )

    return BrowserResearchResponse(
        status="success",
        url=data.get("url", request.url),
        final_url=data.get("final_url", request.url),
        status_code=int(data.get("status_code", 0)),
        title=data.get("title", "Untitled page"),
        summary=data.get("summary", ""),
        headings=data.get("headings", []),
        links=data.get("links", []),
        content_preview=data.get("content_preview", ""),
        content=data.get("content_preview", ""),
        created_at=data.get("created_at", ""),
    )


@app.post("/api/browser/research", response_model=BrowserResearchResponse)
def browser_research_route(request: BrowserResearchRequest):
    return run_browser_research_request(request)


@app.post("/api/browser-research", response_model=BrowserResearchResponse)
def browser_research_legacy_route(request: BrowserResearchRequest):
    return run_browser_research_request(request)


@app.get("/api/voice/status", response_model=VoiceStatusResponse)
def voice_status():
    state = load_voice_state()

    return VoiceStatusResponse(
        mode=state.get("mode", "idle"),
        wake_phrase=state.get("wake_phrase", "Hey Orion"),
        listening=state.get("listening", False),
        last_transcript=state.get("last_transcript", ""),
        last_response=state.get("last_response", ""),
        last_event=state.get("last_event", ""),
        updated_at=state.get("updated_at", ""),
    )


@app.post("/api/voice/reset")
def voice_reset():
    state = update_voice_state(
        mode="idle",
        listening=False,
        last_transcript="",
        last_response="",
        last_event="Voice state reset from Aurora OS.",
    )

    log_activity("VOICE_RESET", "Voice state reset from Aurora OS.", "Aurora OS")

    return {
        "status": "reset",
        "voice_state": state,
    }


@app.post("/api/context/preview", response_model=ContextPreviewResponse)
def context_preview(request: ContextPreviewRequest):
    clean_message = request.message.strip()

    if not clean_message:
        return ContextPreviewResponse(
            message="",
            context="No message provided.",
        )

    context = get_context_preview(clean_message)

    log_activity(
        "CONTEXT_PREVIEW",
        "Aurora OS generated a context preview.",
        "O.R.I.O.N.",
    )

    return ContextPreviewResponse(
        message=clean_message,
        context=context,
    )


@app.post("/api/desktop/workspaces/{workspace_id}/open-vscode", response_model=DesktopActionResponse)
def desktop_open_vscode(workspace_id: int):
    try:
        approval_id = request_open_workspace_in_vscode(workspace_id)

        log_activity(
            "DESKTOP_APPROVAL_CREATED",
            f"Approval created to open workspace {workspace_id} in VS Code.",
            "O.R.I.O.N.",
        )

        return DesktopActionResponse(
            status="approval_required",
            approval_id=approval_id,
            message=f"Approval required to open workspace {workspace_id} in VS Code.",
        )

    except Exception as error:
        return DesktopActionResponse(
            status="failed",
            message=str(error),
        )


@app.post("/api/desktop/workspaces/{workspace_id}/open-folder", response_model=DesktopActionResponse)
def desktop_open_folder(workspace_id: int):
    try:
        approval_id = request_open_workspace_folder(workspace_id)

        log_activity(
            "DESKTOP_APPROVAL_CREATED",
            f"Approval created to open workspace folder {workspace_id}.",
            "O.R.I.O.N.",
        )

        return DesktopActionResponse(
            status="approval_required",
            approval_id=approval_id,
            message=f"Approval required to open workspace folder {workspace_id}.",
        )

    except Exception as error:
        return DesktopActionResponse(
            status="failed",
            message=str(error),
        )


@app.post("/api/desktop/workspaces/{workspace_id}/start-dev", response_model=DesktopActionResponse)
def desktop_start_dev(workspace_id: int):
    try:
        approval_id = request_start_workspace_dev_server(workspace_id)

        log_activity(
            "DESKTOP_APPROVAL_CREATED",
            f"Approval created to start dev server for workspace {workspace_id}.",
            "O.R.I.O.N.",
        )

        return DesktopActionResponse(
            status="approval_required",
            approval_id=approval_id,
            message=f"Approval required to start dev server for workspace {workspace_id}.",
        )

    except Exception as error:
        return DesktopActionResponse(
            status="failed",
            message=str(error),
        )


@app.post("/api/desktop/open-url", response_model=DesktopActionResponse)
def desktop_open_url(request: DesktopUrlRequest):
    try:
        approval_id = request_open_url_in_browser(request.url)

        log_activity(
            "DESKTOP_APPROVAL_CREATED",
            f"Approval created to open URL: {request.url}",
            "O.R.I.O.N.",
        )

        return DesktopActionResponse(
            status="approval_required",
            approval_id=approval_id,
            message=f"Approval required to open URL: {request.url}",
        )

    except Exception as error:
        return DesktopActionResponse(
            status="failed",
            message=str(error),
        )


@app.get("/api/demo/status", response_model=DemoStatusResponse)
def demo_status():
    state = load_demo_state()
    readiness_report = generate_demo_readiness_report()

    log_activity(
        "DEMO_STATUS_VIEW",
        "Aurora OS requested portfolio demo status.",
        "Aurora OS",
    )

    return DemoStatusResponse(
        demo_mode=state.get("demo_mode", False),
        release_version=state.get("release_version", "v2.5"),
        project_name=state.get("project_name", "O.R.I.O.N."),
        interface_name=state.get("interface_name", "Aurora OS"),
        tagline=state.get("tagline", "Think. Plan. Act. Learn."),
        last_generated_pack=state.get("last_generated_pack", ""),
        updated_at=state.get("updated_at", ""),
        readiness_report=readiness_report,
    )


@app.post("/api/demo/mode", response_model=DemoStatusResponse)
def demo_mode(request: DemoModeRequest):
    state = update_demo_mode(request.enabled)
    readiness_report = generate_demo_readiness_report()

    log_activity(
        "DEMO_MODE_UPDATED",
        f"Demo mode set to {request.enabled}.",
        "Aurora OS",
    )

    return DemoStatusResponse(
        demo_mode=state.get("demo_mode", False),
        release_version=state.get("release_version", "v2.5"),
        project_name=state.get("project_name", "O.R.I.O.N."),
        interface_name=state.get("interface_name", "Aurora OS"),
        tagline=state.get("tagline", "Think. Plan. Act. Learn."),
        last_generated_pack=state.get("last_generated_pack", ""),
        updated_at=state.get("updated_at", ""),
        readiness_report=readiness_report,
    )


@app.post("/api/demo/release-pack", response_model=DemoReleasePackResponse)
def demo_release_pack():
    result = generate_release_pack()

    log_activity(
        "DEMO_RELEASE_PACK",
        "Portfolio release pack generated.",
        "O.R.I.O.N.",
    )

    return DemoReleasePackResponse(
        status=result["status"],
        generated_at=result["generated_at"],
        files=result["files"],
    )


@app.get("/api/knowledge/documents", response_model=KnowledgeDocumentsResponse)
def knowledge_documents():
    log_activity(
        "KNOWLEDGE_DOCUMENTS_VIEW",
        "Aurora OS requested indexed knowledge documents.",
        "Aurora OS",
    )
    return KnowledgeDocumentsResponse(documents=list_knowledge_documents(limit=100))


@app.post("/api/knowledge/index", response_model=KnowledgeActionResponse)
def knowledge_index(request: KnowledgeIndexRequest):
    try:
        result = index_document(
            path=request.path,
            summary=request.summary,
        )
        log_activity(
            "KNOWLEDGE_INDEXED",
            f"Knowledge document indexed: {result['title']}",
            "O.R.I.O.N.",
        )
        return KnowledgeActionResponse(
            status="indexed",
            message="Knowledge document indexed successfully.",
            data=result,
        )
    except Exception as error:
        return KnowledgeActionResponse(
            status="failed",
            message=str(error),
            data={},
        )


@app.post("/api/knowledge/index-folder", response_model=KnowledgeActionResponse)
def knowledge_index_folder(request: KnowledgeFolderIndexRequest):
    try:
        result = index_knowledge_folder(request.folder_path)
        log_activity(
            "KNOWLEDGE_FOLDER_INDEXED",
            f"Knowledge folder indexed: {request.folder_path}",
            "O.R.I.O.N.",
        )
        return KnowledgeActionResponse(
            status="indexed",
            message="Knowledge folder indexed successfully.",
            data=result,
        )
    except Exception as error:
        return KnowledgeActionResponse(
            status="failed",
            message=str(error),
            data={},
        )


@app.post("/api/knowledge/search", response_model=KnowledgeSearchResponse)
def knowledge_search(request: KnowledgeSearchRequest):
    results = search_knowledge(
        query=request.query,
        limit=request.limit,
    )
    log_activity(
        "KNOWLEDGE_SEARCH",
        f"Knowledge search completed for query: {request.query}",
        "O.R.I.O.N.",
    )
    return KnowledgeSearchResponse(results=results)


@app.get(
    "/api/knowledge/documents/{document_id}/summary",
    response_model=KnowledgeActionResponse,
)
def knowledge_document_summary(document_id: int):
    summary = summarize_knowledge_document(document_id)
    log_activity(
        "KNOWLEDGE_SUMMARY",
        f"Knowledge document summary requested: {document_id}",
        "O.R.I.O.N.",
    )
    return KnowledgeActionResponse(
        status="generated",
        message="Knowledge document summary generated.",
        data={
            "document_id": document_id,
            "summary": summary,
        },
    )


@app.get("/api/vector/items", response_model=VectorItemsResponse)
def vector_items():
    log_activity(
        "VECTOR_ITEMS_VIEW",
        "Aurora OS requested vector memory items.",
        "Aurora OS",
    )
    return VectorItemsResponse(items=list_vector_items(limit=100))


@app.post("/api/vector/rebuild", response_model=VectorRebuildResponse)
def vector_rebuild():
    try:
        result = rebuild_vector_index()
        log_activity(
            "VECTOR_INDEX_REBUILT",
            "Vector memory index rebuilt.",
            "O.R.I.O.N.",
        )
        return VectorRebuildResponse(
            status="rebuilt",
            data=result,
        )
    except Exception as error:
        log_activity(
            "VECTOR_INDEX_FAILED",
            f"Vector memory rebuild failed: {error}",
            "O.R.I.O.N.",
        )
        return VectorRebuildResponse(
            status="failed",
            data={"error": str(error)},
        )


@app.post("/api/vector/search", response_model=SemanticSearchResponse)
def vector_search(request: SemanticSearchRequest):
    try:
        results = semantic_search(
            query=request.query,
            limit=request.limit,
        )
        log_activity(
            "SEMANTIC_SEARCH",
            f"Semantic search completed for query: {request.query}",
            "O.R.I.O.N.",
        )
        return SemanticSearchResponse(results=results)
    except Exception as error:
        log_activity(
            "SEMANTIC_SEARCH_FAILED",
            f"Semantic search failed: {error}",
            "O.R.I.O.N.",
        )
        return SemanticSearchResponse(results=[])


@app.get("/api/workflows/blueprints", response_model=WorkflowBlueprintsResponse)
def workflow_blueprints():
    log_activity(
        "WORKFLOW_BLUEPRINTS_VIEW",
        "Aurora OS requested workflow blueprints.",
        "Aurora OS",
    )

    return WorkflowBlueprintsResponse(blueprints=list_blueprints())


@app.get(
    "/api/workflows/blueprints/{blueprint_key}",
    response_model=WorkflowBlueprintDetailResponse,
)
def workflow_blueprint_detail(blueprint_key: str):
    blueprint = get_blueprint(blueprint_key)

    if not blueprint:
        return WorkflowBlueprintDetailResponse(
            key=blueprint_key,
            name="Blueprint not found",
            description="No workflow blueprint found with this key.",
            priority=0,
            steps=[],
            rendered="Workflow blueprint not found.",
        )

    log_activity(
        "WORKFLOW_BLUEPRINT_OPEN",
        f"Workflow blueprint opened: {blueprint_key}",
        "Aurora OS",
    )

    return WorkflowBlueprintDetailResponse(
        key=blueprint["key"],
        name=blueprint["name"],
        description=blueprint["description"],
        priority=blueprint["priority"],
        steps=blueprint["steps"],
        rendered=render_blueprint(blueprint_key),
    )


@app.post(
    "/api/workflows/blueprints/{blueprint_key}/create-mission",
    response_model=CreateMissionFromBlueprintResponse,
)
def workflow_create_mission(
    blueprint_key: str,
    request: CreateMissionFromBlueprintRequest,
):
    try:
        result = create_mission_from_blueprint(
            blueprint_key=blueprint_key,
            mission_title=request.mission_title,
            custom_goal=request.custom_goal,
            workspace_id=request.workspace_id,
        )

        log_activity(
            "WORKFLOW_MISSION_CREATED",
            f"Mission {result['mission_id']} created from blueprint {blueprint_key}.",
            "O.R.I.O.N.",
        )

        return CreateMissionFromBlueprintResponse(
            status="created",
            mission_id=result["mission_id"],
            blueprint_key=result["blueprint_key"],
            title=result["title"],
            goal=result["goal"],
            step_count=result["step_count"],
            created_at=result["created_at"],
            message="Mission created from workflow blueprint.",
        )

    except Exception as error:
        return CreateMissionFromBlueprintResponse(
            status="failed",
            mission_id=None,
            blueprint_key=blueprint_key,
            message=str(error),
        )


@app.get("/api/developer/reports", response_model=DeveloperReportsResponse)
def developer_reports():
    reports = list_developer_reports(limit=50)

    log_activity(
        "DEVELOPER_REPORTS_VIEW",
        "Aurora OS requested developer reports.",
        "Aurora OS",
    )

    return DeveloperReportsResponse(reports=reports)


@app.get(
    "/api/developer/workspaces/{workspace_id}/inspect",
    response_model=DeveloperInspectResponse,
)
def developer_inspect_workspace(workspace_id: int):
    content = inspect_workspace_for_development(workspace_id)

    log_activity(
        "DEVELOPER_WORKSPACE_INSPECT",
        f"Developer inspection generated for workspace {workspace_id}.",
        "O.R.I.O.N.",
    )

    return DeveloperInspectResponse(
        workspace_id=workspace_id,
        status="generated",
        content=content,
    )


@app.post(
    "/api/developer/workspaces/{workspace_id}/diagnose",
    response_model=DeveloperInspectResponse,
)
def developer_diagnose_workspace(workspace_id: int, request: DeveloperIssueRequest):
    content = diagnose_workspace_issue(
        workspace_id=workspace_id,
        issue_description=request.issue_description,
    )

    log_activity(
        "DEVELOPER_DIAGNOSIS",
        f"Developer diagnosis generated for workspace {workspace_id}.",
        "O.R.I.O.N.",
    )

    return DeveloperInspectResponse(
        workspace_id=workspace_id,
        status="generated",
        content=content,
    )


@app.post(
    "/api/developer/workspaces/{workspace_id}/patch-plan",
    response_model=DeveloperInspectResponse,
)
def developer_patch_plan(workspace_id: int, request: DeveloperIssueRequest):
    content = create_patch_plan(
        workspace_id=workspace_id,
        issue_description=request.issue_description,
        target_files=request.target_files or None,
    )

    log_activity(
        "DEVELOPER_PATCH_PLAN",
        f"Patch plan generated for workspace {workspace_id}.",
        "O.R.I.O.N.",
    )

    return DeveloperInspectResponse(
        workspace_id=workspace_id,
        status="generated",
        content=content,
    )


@app.post(
    "/api/developer/workspaces/{workspace_id}/request-patch",
    response_model=DeveloperPatchResponse,
)
def developer_request_patch(workspace_id: int, request: DeveloperPatchRequest):
    try:
        approval_id = request_workspace_file_patch(
            workspace_id=workspace_id,
            relative_path=request.relative_path,
            new_content=request.new_content,
            reason=request.reason,
        )

        log_activity(
            "DEVELOPER_PATCH_APPROVAL",
            f"Patch approval created for workspace {workspace_id}: {request.relative_path}",
            "O.R.I.O.N.",
        )

        return DeveloperPatchResponse(
            status="approval_required",
            approval_id=approval_id,
            message=f"Approval required to patch {request.relative_path}.",
        )

    except Exception as error:
        return DeveloperPatchResponse(
            status="failed",
            approval_id=None,
            message=str(error),
        )


@app.get("/api/notifications/reminders", response_model=RemindersResponse)
def notification_reminders():
    refresh_due_reminders()

    log_activity(
        "REMINDERS_VIEW",
        "Aurora OS requested local reminders.",
        "Aurora OS",
    )

    return RemindersResponse(reminders=list_reminders(limit=100))


@app.post("/api/notifications/reminders", response_model=ReminderItem)
def notification_create_reminder(request: ReminderCreateRequest):
    reminder = create_reminder_record(
        title=request.title,
        description=request.description,
        due_at=request.due_at,
        priority=request.priority,
        source="Aurora OS",
    )

    log_activity(
        "REMINDER_CREATED",
        f"Reminder created: {reminder['title']}",
        "Aurora OS",
    )

    return ReminderItem(**reminder)


@app.post("/api/notifications/reminders/{reminder_id}/status", response_model=ReminderItem)
def notification_update_reminder_status(
    reminder_id: int,
    request: ReminderStatusRequest,
):
    updated = update_reminder_status(
        reminder_id=reminder_id,
        status=request.status,
    )
    reminder = get_reminder(reminder_id)

    if not updated or not reminder:
        return ReminderItem(
            id=reminder_id,
            title="Reminder not found",
            description="",
            due_at="",
            status="missing",
            priority="medium",
            source="O.R.I.O.N.",
            created_at="",
            updated_at="",
        )

    log_activity(
        "REMINDER_STATUS_UPDATED",
        f"Reminder {reminder_id} marked {request.status}.",
        "Aurora OS",
    )

    return ReminderItem(**reminder)


@app.get("/api/notifications/events", response_model=NotificationEventsResponse)
def notification_events():
    return NotificationEventsResponse(events=list_notification_events(limit=100))


@app.get("/api/notifications/startup-briefing", response_model=StartupBriefingResponse)
def notification_startup_briefing():
    briefing = generate_startup_briefing()

    log_activity(
        "STARTUP_BRIEFING",
        "Startup briefing generated.",
        "O.R.I.O.N.",
    )

    return StartupBriefingResponse(status="generated", briefing=briefing)


@app.get("/api/dashboard/intelligence", response_model=DashboardIntelligenceResponse)
def dashboard_intelligence():
    data = generate_dashboard_intelligence()
    report = render_dashboard_intelligence_report()

    log_activity(
        "DASHBOARD_INTELLIGENCE",
        f"Dashboard intelligence generated. Score: {data['intelligence_score']}.",
        "O.R.I.O.N.",
    )

    return DashboardIntelligenceResponse(
        intelligence_score=data["intelligence_score"],
        readiness_label=data["readiness_label"],
        mission_metrics=data["mission_metrics"],
        workspace_metrics=data["workspace_metrics"],
        memory_metrics=data["memory_metrics"],
        risk_metrics=data["risk_metrics"],
        activity_metrics=data["activity_metrics"],
        developer_metrics=data["developer_metrics"],
        notification_metrics=data["notification_metrics"],
        user_settings=data["user_settings"],
        plugin_metrics=data["plugin_metrics"],
        tool_permission_metrics=data["tool_permission_metrics"],
        tool_audit_metrics=data["tool_audit_metrics"],
        security_policy=data["security_policy"],
        release_candidate=data["release_candidate"],
        stabilization=data["stabilization"],
        recommendations=data["recommendations"],
        report=report,
    )


@app.get("/api/settings/profile", response_model=UserSettingsResponse)
def settings_profile():
    log_activity(
        "USER_SETTINGS_VIEW",
        "Aurora OS requested user profile settings.",
        "Aurora OS",
    )

    return UserSettingsResponse(
        settings=list_user_settings(),
        settings_map=get_user_settings_map(),
        profile_summary=render_user_profile_summary(),
    )


@app.post("/api/settings/profile/reset", response_model=UserSettingsResponse)
def settings_reset():
    reset_user_settings()

    log_activity(
        "USER_SETTINGS_RESET",
        "User profile settings reset to defaults.",
        "Aurora OS",
    )

    return UserSettingsResponse(
        settings=list_user_settings(),
        settings_map=get_user_settings_map(),
        profile_summary=render_user_profile_summary(),
    )


@app.post("/api/settings/profile/{setting_key}", response_model=UserSettingUpdateResponse)
def settings_update(setting_key: str, request: UserSettingUpdateRequest):
    try:
        setting = update_user_setting(setting_key, request.value)

        log_activity(
            "USER_SETTING_UPDATED",
            f"User setting updated: {setting_key}",
            "Aurora OS",
        )

        return UserSettingUpdateResponse(
            status="updated",
            setting=UserSettingItem(**setting),
            message=f"Setting {setting_key} updated.",
        )
    except Exception as error:
        return UserSettingUpdateResponse(
            status="failed",
            setting=None,
            message=str(error),
        )


@app.get("/api/plugins", response_model=PluginsResponse)
def plugins_list():
    log_activity(
        "PLUGIN_REGISTRY_VIEW",
        "Aurora OS requested plugin registry.",
        "Aurora OS",
    )

    return PluginsResponse(
        plugins=list_plugins(limit=200),
        metrics=get_plugin_metrics(),
        report=render_plugin_registry_report(),
    )


@app.get("/api/plugins/{plugin_key}", response_model=PluginStatusUpdateResponse)
def plugins_get(plugin_key: str):
    plugin = get_plugin(plugin_key)
    if not plugin:
        return PluginStatusUpdateResponse(
            status="missing",
            plugin=None,
            message="Plugin not found.",
        )

    return PluginStatusUpdateResponse(
        status="found",
        plugin=PluginItem(**plugin),
        message="Plugin found.",
    )


@app.post("/api/plugins/{plugin_key}/status", response_model=PluginStatusUpdateResponse)
def plugins_update_status(plugin_key: str, request: PluginStatusUpdateRequest):
    try:
        plugin = set_plugin_enabled(plugin_key, request.enabled)

        log_activity(
            "PLUGIN_STATUS_UPDATED",
            f"Plugin {plugin_key} enabled set to {request.enabled}.",
            "Aurora OS",
        )

        return PluginStatusUpdateResponse(
            status="updated",
            plugin=PluginItem(**plugin),
            message=f"Plugin {plugin_key} updated.",
        )
    except Exception as error:
        return PluginStatusUpdateResponse(
            status="failed",
            plugin=None,
            message=str(error),
        )


@app.get("/api/tools/permissions", response_model=ToolPermissionResponse)
def tool_permissions():
    log_activity(
        "TOOL_PERMISSION_VIEW",
        "Aurora OS requested tool permission matrix.",
        "Aurora OS",
    )
    return ToolPermissionResponse(
        metrics=get_tool_permission_metrics(),
        matrix=get_tool_permission_matrix(),
        report=render_tool_permission_report(),
    )


@app.get("/api/tools/permissions/{tool_name}", response_model=ToolPermissionCheckResponse)
def tool_permission_check(tool_name: str):
    decision = is_tool_allowed(tool_name)
    return ToolPermissionCheckResponse(
        allowed=decision["allowed"],
        tool_name=decision["tool_name"],
        plugin_key=decision["plugin_key"],
        reason=decision["reason"],
    )


@app.get("/api/tools/audit", response_model=ToolAuditResponse)
def tool_audit():
    log_activity(
        "TOOL_AUDIT_VIEW",
        "Aurora OS requested Tool Audit Center.",
        "Aurora OS",
    )
    return ToolAuditResponse(
        metrics=get_tool_audit_metrics(),
        events=list_tool_audit_events(limit=120),
        report=render_tool_audit_report(),
    )



@app.get("/api/security/policy", response_model=SecurityPolicyResponse)
def security_policy_status():
    log_activity(
        "SECURITY_POLICY_VIEW",
        "Aurora OS requested security policy status.",
        "Aurora OS",
    )
    return SecurityPolicyResponse(
        active_policy=get_active_security_policy(),
        profiles=list_security_profiles(),
        events=list_security_policy_events(limit=50),
        report=render_security_policy_report(),
    )


@app.get("/api/security/policy/profiles/{profile_key}", response_model=SecurityProfileDetail)
def security_policy_profile_detail(profile_key: str):
    profile = get_security_profile(profile_key)
    if not profile:
        return SecurityProfileDetail(
            key=profile_key,
            name="Profile not found",
            description="No matching security profile.",
            safety_level="unknown",
            enabled_plugins=[],
            disabled_plugins=[],
        )
    return SecurityProfileDetail(**profile)


@app.post("/api/security/policy/apply", response_model=SecurityPolicyApplyResponse)
def security_policy_apply(request: SecurityPolicyApplyRequest):
    result = apply_security_profile(profile_key=request.profile_key, source="Aurora OS")
    log_activity("SECURITY_POLICY_APPLIED", result["summary"], "Aurora OS")
    return SecurityPolicyApplyResponse(
        status=result["status"],
        profile_key=result["profile_key"],
        profile_name=result["profile_name"],
        summary=result["summary"],
        enabled_count=result["enabled_count"],
        disabled_count=result["disabled_count"],
        unchanged_count=result["unchanged_count"],
        applied_at=result["applied_at"],
        active_policy=result["active_policy"],
    )


@app.get("/api/release-candidate/status", response_model=ReleaseCandidateStatusResponse)
def release_candidate_status():
    log_activity(
        "RELEASE_CANDIDATE_STATUS",
        "Aurora OS requested v4.0 release candidate status.",
        "Aurora OS",
    )
    return ReleaseCandidateStatusResponse(
        freeze_state=ReleaseFreezeState(**get_freeze_state()),
        checklist=ReleaseChecklistResponse(**generate_release_candidate_checklist()),
        events=list_release_events(limit=50),
        report=render_release_candidate_report(),
    )


@app.post("/api/release-candidate/freeze", response_model=ReleaseFreezeState)
def release_candidate_freeze(request: ReleaseFreezeRequest):
    state = freeze_system(reason=request.reason, release_version="v4.0")
    log_activity("SYSTEM_FREEZE_ENABLED", request.reason, "Aurora OS")
    return ReleaseFreezeState(**state)


@app.post("/api/release-candidate/unfreeze", response_model=ReleaseFreezeState)
def release_candidate_unfreeze(request: ReleaseFreezeRequest):
    state = unfreeze_system(reason=request.reason)
    log_activity("SYSTEM_FREEZE_DISABLED", request.reason, "Aurora OS")
    return ReleaseFreezeState(**state)


@app.post("/api/release-candidate/package", response_model=ReleaseCandidatePackageResponse)
def release_candidate_package():
    result = generate_release_candidate_package()
    log_activity(
        "RELEASE_CANDIDATE_PACKAGE",
        f"v4.0 release candidate package generated: {result['summary_path']}",
        "Aurora OS",
    )
    return ReleaseCandidatePackageResponse(
        status=result["status"],
        generated_at=result["generated_at"],
        summary_path=result["summary_path"],
        artifacts=result["artifacts"],
        checklist=result["checklist"],
    )


@app.post("/api/stabilization/scan", response_model=StabilizationActionResponse)
def stabilization_scan(request: StabilizationRunRequest):
    scan = run_stabilization_scan(run_build=request.run_build)
    report = render_stabilization_report(run_build=request.run_build)
    log_activity(
        "STABILIZATION_SCAN",
        f"v4.1 stabilization scan completed. Status: {scan['status']}.",
        "O.R.I.O.N.",
    )
    return StabilizationActionResponse(
        status=scan["status"], generated_at=scan["generated_at"], scan=scan, report=report
    )


@app.post("/api/stabilization/report/save", response_model=StabilizationActionResponse)
def stabilization_report_save(request: StabilizationRunRequest):
    result = save_stabilization_report(run_build=request.run_build)
    scan = run_stabilization_scan(run_build=False)
    log_activity("STABILIZATION_REPORT_SAVED", f"v4.1 stabilization report saved: {result['path']}", "O.R.I.O.N.")
    return StabilizationActionResponse(
        status=result["status"], generated_at=result["generated_at"], scan=scan,
        report=result["report"], path=result["path"],
    )


def _sidecar_response(status_data: Dict[str, Any]) -> BackendSidecarStatusResponse:
    return BackendSidecarStatusResponse(
        managed_by=status_data.get("managed_by", "O.R.I.O.N. Backend Sidecar"),
        status=status_data.get("status", "unknown"),
        pid=status_data.get("pid"),
        host=status_data.get("host", "127.0.0.1"),
        port=int(status_data.get("port", 8000)),
        backend_url=status_data.get("backend_url", "http://127.0.0.1:8000"),
        started_at=status_data.get("started_at", ""),
        updated_at=status_data.get("updated_at", ""),
        last_error=status_data.get("last_error", ""),
        pid_running=bool(status_data.get("pid_running", False)),
        port_open=bool(status_data.get("port_open", False)),
        log_file=status_data.get("log_file", ""),
        state_file=status_data.get("state_file", ""),
        report=render_sidecar_report(),
    )


@app.get("/api/sidecar/status", response_model=BackendSidecarStatusResponse)
def sidecar_status():
    status_data = get_sidecar_status()
    log_activity(
        "SIDECAR_STATUS",
        f"Backend sidecar status checked: {status_data['status']}.",
        "O.R.I.O.N.",
    )
    return _sidecar_response(status_data)


@app.post("/api/sidecar/start", response_model=BackendSidecarActionResponse)
def sidecar_start():
    status_data = start_backend_sidecar()
    log_activity(
        "SIDECAR_START",
        f"Backend sidecar start requested. Status: {status_data['status']}.",
        "O.R.I.O.N.",
    )
    return BackendSidecarActionResponse(
        status=status_data["status"],
        message="Backend sidecar start requested.",
        sidecar=_sidecar_response(status_data),
    )


@app.post("/api/sidecar/stop", response_model=BackendSidecarActionResponse)
def sidecar_stop():
    status_data = stop_backend_sidecar()
    log_activity(
        "SIDECAR_STOP",
        f"Backend sidecar stop requested. Status: {status_data['status']}.",
        "O.R.I.O.N.",
    )
    return BackendSidecarActionResponse(
        status=status_data["status"],
        message="Backend sidecar stop requested.",
        sidecar=_sidecar_response(status_data),
    )


@app.post("/api/sidecar/restart", response_model=BackendSidecarActionResponse)
def sidecar_restart():
    status_data = restart_backend_sidecar()
    log_activity(
        "SIDECAR_RESTART",
        f"Backend sidecar restart requested. Status: {status_data['status']}.",
        "O.R.I.O.N.",
    )
    return BackendSidecarActionResponse(
        status=status_data["status"],
        message="Backend sidecar restart requested.",
        sidecar=_sidecar_response(status_data),
    )


@app.get("/api/desktop-shell/status", response_model=DesktopShellStatusResponse)
def desktop_shell_status():
    log_activity(
        "DESKTOP_SHELL_STATUS",
        "Aurora OS desktop shell checked backend status.",
        "Aurora OS Desktop",
    )

    return DesktopShellStatusResponse(
        status="online",
        app_name="O.R.I.O.N. Aurora OS",
        shell_version="4.1.0",
        backend_url="http://127.0.0.1:8000",
        frontend_mode="tauri_static_shell",
        message="Desktop shell connected to O.R.I.O.N. backend with sidecar support.",
    )


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not os.getenv("OPENAI_API_KEY"):
        log_activity(
            "ERROR",
            "Missing OPENAI_API_KEY in backend/.env",
            "API",
        )

        return ChatResponse(
            response="Missing OPENAI_API_KEY in backend/.env"
        )

    clean_message = request.message.strip()

    if not clean_message:
        log_activity(
            "WARNING",
            "Empty message received.",
            "API",
        )

        return ChatResponse(
            response="No message received."
        )

    log_activity(
        "USER_REQUEST",
        clean_message,
        "Aurora OS Chat",
    )

    log_activity(
        "AGENT_START",
        "O.R.I.O.N. started processing the request.",
        "O.R.I.O.N.",
    )

    try:
        contextual_input = prepare_context_enriched_input(clean_message)

        log_activity(
            "CONTEXT_RETRIEVAL",
            "Relevant memory, project, workspace, mission, and activity context retrieved.",
            "O.R.I.O.N.",
        )

        result = await Runner.run(
            orion,
            contextual_input,
            session=session,
        )

        final_output = result.final_output or "No response generated."

        log_activity(
            "AGENT_COMPLETE",
            "O.R.I.O.N. generated a final response.",
            "O.R.I.O.N.",
        )

        return ChatResponse(response=final_output)

    except Exception as error:
        log_activity(
            "ERROR",
            f"Agent execution failed: {error}",
            "O.R.I.O.N.",
        )

        return ChatResponse(
            response=f"O.R.I.O.N. encountered an error: {error}"
        )
