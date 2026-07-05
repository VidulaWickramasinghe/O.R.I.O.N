import json
from pathlib import Path
from typing import Any, Dict, List

from core.persistent_memory import search_memory_items, list_recent_memory
from core.workspace_manager import list_workspace_records, detect_workspace_stack
from core.mission_planner import list_mission_records, get_mission_record
from core.mission_run_history import list_mission_runs
from core.approvals import list_approval_requests
from core.activity import get_recent_activity
from core.knowledge_base import search_knowledge, list_knowledge_documents
from core.vector_memory import semantic_search
from core.user_settings import get_user_settings_map, render_user_profile_summary


BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_DIR / "data"
PROJECTS_FILE = DATA_DIR / "projects.json"
CONTEXT_HISTORY_FILE = DATA_DIR / "context_history.json"

DATA_DIR.mkdir(parents=True, exist_ok=True)


def _shorten(text: Any, limit: int = 1200) -> str:
    clean = str(text).strip()

    if len(clean) <= limit:
        return clean

    return clean[:limit].rsplit(" ", 1)[0] + "..."


def _load_projects() -> List[Dict[str, Any]]:
    if not PROJECTS_FILE.exists():
        return []

    try:
        data = json.loads(PROJECTS_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []

    projects = []

    for key, project in data.items():
        projects.append(
            {
                "key": key,
                "name": project.get("name", key),
                "type": project.get("type", "Unknown"),
                "status": project.get("status", "unknown"),
                "description": project.get("description", ""),
                "updated_at": project.get("updated_at", ""),
            }
        )

    return projects


def _format_items(title: str, items: List[Any], formatter, empty: str) -> str:
    if not items:
        return f"## {title}\n\n{empty}"

    lines = [f"## {title}"]

    for item in items:
        lines.append(formatter(item))

    return "\n\n".join(lines)


def build_context_bundle(user_message: str) -> Dict[str, Any]:
    """
    Build a compact contextual bundle for O.R.I.O.N. before answering.
    """
    query = user_message.strip()

    relevant_memories = search_memory_items(query=query, limit=6) if query else []
    recent_memories = list_recent_memory(limit=6)
    knowledge_results = search_knowledge(query=query, limit=5) if query else []
    semantic_results = []
    try:
        semantic_results = semantic_search(query=query, limit=5) if query else []
    except Exception:
        semantic_results = []
    knowledge_documents = list_knowledge_documents(limit=8)
    projects = _load_projects()[:10]
    workspaces = list_workspace_records(limit=8)
    missions = list_mission_records(limit=8)
    mission_runs = list_mission_runs(limit=8)
    pending_approvals = list_approval_requests(limit=8, status="pending")
    recent_activity = get_recent_activity(limit=8)
    user_settings = get_user_settings_map()
    user_profile_summary = render_user_profile_summary()

    workspace_stack = []

    for workspace in workspaces[:5]:
        try:
            stack = detect_workspace_stack(workspace["id"])
            workspace_stack.append(stack)
        except Exception as error:
            workspace_stack.append(
                {
                    "workspace_id": workspace["id"],
                    "name": workspace["name"],
                    "error": str(error),
                }
            )

    bundle = {
        "query": query,
        "relevant_memories": relevant_memories,
        "recent_memories": recent_memories,
        "knowledge_results": knowledge_results,
        "semantic_results": semantic_results,
        "knowledge_documents": knowledge_documents,
        "projects": projects,
        "workspaces": workspaces,
        "workspace_stack": workspace_stack,
        "missions": missions,
        "mission_runs": mission_runs,
        "pending_approvals": pending_approvals,
        "recent_activity": recent_activity,
        "user_settings": user_settings,
        "user_profile_summary": user_profile_summary,
    }

    save_context_history(bundle)

    return bundle


def render_context_bundle(bundle: Dict[str, Any]) -> str:
    """
    Render retrieved context into a compact text block for the agent.
    """
    sections = []

    sections.append(
        "## User Profile Settings\n\n"
        + bundle.get("user_profile_summary", "No user profile settings found.")
    )

    sections.append(
        _format_items(
            "Relevant Persistent Memories",
            bundle.get("relevant_memories", []),
            lambda item: (
                f"- [{item['id']}] {item['title']} "
                f"({item['category']}, importance {item['importance']}): "
                f"{_shorten(item['content'], 420)}"
            ),
            "No relevant persistent memories found.",
        )
    )



    sections.append(
        _format_items(
            "Semantic Memory Results",
            bundle.get("semantic_results", []),
            lambda item: (
                f"- {item['title']} | Source: {item['source_type']}:{item['source_id']} | "
                f"Score: {item['score']:.4f} | {_shorten(item['content'], 420)}"
            ),
            "No semantic memory results found.",
        )
    )

    sections.append(
        _format_items(
            "Relevant Local Knowledge",
            bundle.get("knowledge_results", []),
            lambda item: (
                f"- Document {item['document_id']}: {item['title']} | "
                f"Chunk {item['chunk_index']} | "
                f"{_shorten(item['content'], 420)}"
            ),
            "No relevant local knowledge found.",
        )
    )

    sections.append(
        _format_items(
            "Indexed Knowledge Documents",
            bundle.get("knowledge_documents", []),
            lambda doc: (
                f"- Document {doc['id']}: {doc['title']} | "
                f"Type: {doc['extension']} | Path: {doc['source_path']}"
            ),
            "No indexed knowledge documents found.",
        )
    )

    sections.append(
        _format_items(
            "Recent Persistent Memories",
            bundle.get("recent_memories", []),
            lambda item: (
                f"- [{item['id']}] {item['title']} "
                f"({item['category']}): {_shorten(item['content'], 300)}"
            ),
            "No recent persistent memories found.",
        )
    )

    sections.append(
        _format_items(
            "Registered Projects",
            bundle.get("projects", []),
            lambda project: (
                f"- {project['name']} | Type: {project['type']} | "
                f"Status: {project['status']} | "
                f"Description: {_shorten(project['description'], 260)}"
            ),
            "No registered projects found.",
        )
    )

    sections.append(
        _format_items(
            "Registered Workspaces",
            bundle.get("workspaces", []),
            lambda workspace: (
                f"- Workspace {workspace['id']}: {workspace['name']} | "
                f"Status: {workspace['status']} | Path: {workspace['path']} | "
                f"Description: {_shorten(workspace['description'], 220)}"
            ),
            "No registered workspaces found.",
        )
    )

    sections.append(
        _format_items(
            "Detected Workspace Tech Stacks",
            bundle.get("workspace_stack", []),
            lambda stack: (
                f"- Workspace {stack.get('workspace_id')}: {stack.get('name')} | "
                f"Stack: {', '.join(stack.get('detected_stack', [])) or stack.get('error', 'Unknown')} | "
                f"Key files: {', '.join(stack.get('key_files', []))}"
            ),
            "No workspace tech stack detected.",
        )
    )

    sections.append(
        _format_items(
            "Recent Missions",
            bundle.get("missions", []),
            lambda mission: (
                f"- Mission {mission['id']}: {mission['title']} | "
                f"Status: {mission['status']} | Priority: {mission['priority']} | "
                f"Goal: {_shorten(mission['goal'], 280)}"
            ),
            "No missions found.",
        )
    )

    sections.append(
        _format_items(
            "Recent Mission Runs",
            bundle.get("mission_runs", []),
            lambda run: (
                f"- Run {run['id']} | Mission {run['mission_id']} | "
                f"Step {run.get('step_id')} | Status: {run['status']} | "
                f"Step: {_shorten(run.get('step_title', ''), 180)}"
            ),
            "No mission run history found.",
        )
    )

    sections.append(
        _format_items(
            "Pending Approvals",
            bundle.get("pending_approvals", []),
            lambda approval: (
                f"- Approval {approval['id']} | {approval['action_type']} | "
                f"Risk: {approval['risk_level']} | Title: {approval['title']}"
            ),
            "No pending approvals.",
        )
    )

    sections.append(
        _format_items(
            "Recent Activity",
            bundle.get("recent_activity", []),
            lambda event: (
                f"- [{event['timestamp']}] {event['type']} | "
                f"{event['source']}: {_shorten(event['message'], 220)}"
            ),
            "No recent activity recorded.",
        )
    )

    return "\n\n".join(sections)


def prepare_context_enriched_input(user_message: str) -> str:
    """
    Combine user message with retrieved project/memory context.
    """
    bundle = build_context_bundle(user_message)
    context_text = render_context_bundle(bundle)

    return f"""
User request:
{user_message}

Retrieved O.R.I.O.N. context:
{context_text}

Instructions:
- Use the retrieved context when it is relevant.
- Do not mention every context item unless useful.
- If context is missing, say what information is needed.
- Keep actions safe and approval-gated.
- For project questions, prefer concrete next steps.
""".strip()


def save_context_history(bundle: Dict[str, Any]) -> None:
    history = []

    if CONTEXT_HISTORY_FILE.exists():
        try:
            history = json.loads(CONTEXT_HISTORY_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            history = []

    history.append(
        {
            "query": bundle.get("query", ""),
            "memory_count": len(bundle.get("relevant_memories", [])),
            "knowledge_count": len(bundle.get("knowledge_results", [])),
            "semantic_count": len(bundle.get("semantic_results", [])),
            "project_count": len(bundle.get("projects", [])),
            "workspace_count": len(bundle.get("workspaces", [])),
            "mission_count": len(bundle.get("missions", [])),
            "approval_count": len(bundle.get("pending_approvals", [])),
            "user_profile_loaded": bool(bundle.get("user_settings")),
        }
    )

    CONTEXT_HISTORY_FILE.write_text(
        json.dumps(history[-100:], indent=2),
        encoding="utf-8",
    )


def get_context_preview(user_message: str) -> str:
    bundle = build_context_bundle(user_message)
    return render_context_bundle(bundle)
