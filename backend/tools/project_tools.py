import json
from datetime import datetime
from pathlib import Path
from agents import function_tool
from core.tool_logger import instrument_tool


PROJECTS_FILE = Path("backend/data/projects.json")
ROADMAPS_DIR = Path("backend/data/project_roadmaps")
SUMMARIES_DIR = Path("backend/data/portfolio_summaries")

PROJECTS_FILE.parent.mkdir(parents=True, exist_ok=True)
ROADMAPS_DIR.mkdir(parents=True, exist_ok=True)
SUMMARIES_DIR.mkdir(parents=True, exist_ok=True)


def _load_projects() -> dict:
    if not PROJECTS_FILE.exists():
        return {}

    try:
        return json.loads(PROJECTS_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def _save_projects(projects: dict) -> None:
    PROJECTS_FILE.write_text(
        json.dumps(projects, indent=2),
        encoding="utf-8"
    )


def _safe_name(name: str) -> str:
    return (
        name.lower()
        .strip()
        .replace(" ", "_")
        .replace("/", "_")
        .replace("\\", "_")
    )


@function_tool
@instrument_tool("register_project")
def register_project(
    name: str,
    project_type: str,
    description: str,
    status: str = "active"
) -> str:
    """
    Register a new project in O.R.I.O.N.'s project memory.
    """
    projects = _load_projects()
    key = _safe_name(name)

    projects[key] = {
        "name": name,
        "type": project_type,
        "description": description,
        "status": status,
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "updated_at": datetime.now().isoformat(timespec="seconds"),
        "notes": []
    }

    _save_projects(projects)

    return f"Project registered: {name}"


@function_tool
@instrument_tool("list_projects")
def list_projects() -> str:
    """
    List all registered projects.
    """
    projects = _load_projects()

    if not projects:
        return "No projects registered yet."

    lines = []

    for project in projects.values():
        lines.append(
            f"- {project['name']} | {project['type']} | Status: {project['status']}"
        )

    return "\n".join(lines)


@function_tool
@instrument_tool("read_project")
def read_project(name: str) -> str:
    """
    Read full details of a registered project.
    """
    projects = _load_projects()
    key = _safe_name(name)

    if key not in projects:
        return f"No project found called {name}."

    project = projects[key]

    notes = project.get("notes", [])
    notes_text = "\n".join(f"- {note}" for note in notes) if notes else "No notes yet."

    return f"""
Project: {project['name']}
Type: {project['type']}
Status: {project['status']}

Description:
{project['description']}

Created:
{project['created_at']}

Updated:
{project['updated_at']}

Notes:
{notes_text}
""".strip()


@function_tool
@instrument_tool("update_project_status")
def update_project_status(name: str, status: str, note: str = "") -> str:
    """
    Update the status of a registered project and optionally add a note.
    """
    projects = _load_projects()
    key = _safe_name(name)

    if key not in projects:
        return f"No project found called {name}."

    projects[key]["status"] = status
    projects[key]["updated_at"] = datetime.now().isoformat(timespec="seconds")

    if note:
        projects[key].setdefault("notes", []).append(
            f"{datetime.now().isoformat(timespec='seconds')} — {note}"
        )

    _save_projects(projects)

    return f"Project status updated: {name} → {status}"


@function_tool
@instrument_tool("add_project_note")
def add_project_note(name: str, note: str) -> str:
    """
    Add a note to a registered project.
    """
    projects = _load_projects()
    key = _safe_name(name)

    if key not in projects:
        return f"No project found called {name}."

    projects[key].setdefault("notes", []).append(
        f"{datetime.now().isoformat(timespec='seconds')} — {note}"
    )
    projects[key]["updated_at"] = datetime.now().isoformat(timespec="seconds")

    _save_projects(projects)

    return f"Note added to project: {name}"


@function_tool
@instrument_tool("save_project_roadmap")
def save_project_roadmap(name: str, roadmap: str) -> str:
    """
    Save a roadmap markdown file for a project.
    """
    safe = _safe_name(name)
    file_path = ROADMAPS_DIR / f"{safe}_roadmap.md"

    content = f"# {name} Roadmap\n\n{roadmap}\n"
    file_path.write_text(content, encoding="utf-8")

    return f"Roadmap saved: {file_path}"


@function_tool
@instrument_tool("save_portfolio_summary")
def save_portfolio_summary(name: str, summary: str) -> str:
    """
    Save a portfolio summary markdown file for a project.
    """
    safe = _safe_name(name)
    file_path = SUMMARIES_DIR / f"{safe}_portfolio_summary.md"

    content = f"# {name} Portfolio Summary\n\n{summary}\n"
    file_path.write_text(content, encoding="utf-8")

    return f"Portfolio summary saved: {file_path}"
