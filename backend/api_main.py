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

from tools.knowledge_tools import (
    index_knowledge_document,
    index_knowledge_folder_tool,
    list_knowledge_documents_tool,
    search_local_knowledge,
    summarize_knowledge_document_tool,
)


app = FastAPI(
    title="O.R.I.O.N. API",
    description="Operational Response and Intelligent Orchestration Network backend API.",
    version="2.7.0",
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
        index_knowledge_document,
        index_knowledge_folder_tool,
        list_knowledge_documents_tool,
        search_local_knowledge,
        summarize_knowledge_document_tool,
    ],
)

session = SQLiteSession("orion_core_v27_knowledge")


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


@app.on_event("startup")
def startup_event():
    init_memory_db()
    init_mission_db()
    init_approval_db()
    init_mission_run_db()
    init_workspace_db()
    init_knowledge_db()

    log_activity(
        "SYSTEM_START",
        "O.R.I.O.N. API v2.7.0 started with Local Knowledge Base + Document Intelligence enabled.",
        "API",
    )


@app.get("/")
def root():
    return {
        "name": "O.R.I.O.N.",
        "version": "2.7.0",
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
        version="2.7",
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
        ],
    )


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "system": "O.R.I.O.N.",
        "version": "2.7.0",
        "message": "O.R.I.O.N. Mission Control backend is operational.",
    }


@app.get("/api/mission")
def mission():
    return {
        "name": "O.R.I.O.N.",
        "full_name": "Operational Response and Intelligent Orchestration Network",
        "interface": "Aurora OS",
        "tagline": "Think. Plan. Act. Learn.",
        "release": "v2.7 Local Knowledge Base + Document Intelligence",
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


