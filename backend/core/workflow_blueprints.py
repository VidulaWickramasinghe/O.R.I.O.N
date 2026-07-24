from datetime import datetime
from typing import Any, Dict, List, Optional

from core.mission_planner import create_mission_record


WORKFLOW_BLUEPRINTS: Dict[str, Dict[str, Any]] = {
    "github_release": {
        "name": "GitHub Release Workflow",
        "description": "Prepare a project workspace for GitHub release and portfolio presentation.",
        "priority": 5,
        "steps": [
            "Inspect the selected workspace structure.",
            "Detect the workspace technology stack.",
            "Run System Doctor and identify production readiness issues.",
            "Inspect GitHub release readiness for the workspace.",
            "Generate a GitHub release checklist.",
            "Generate GitHub release notes.",
            "Generate a suggested release commit message.",
            "Generate portfolio release pack.",
            "Confirm screenshots and demo assets are ready.",
            "Summarize final release readiness and next manual action.",
        ],
    },
    "bug_fix": {
        "name": "Bug Fix Workflow",
        "description": "Investigate, isolate, and prepare a safe fix plan for a project bug.",
        "priority": 4,
        "steps": [
            "Summarize the reported bug and expected behavior.",
            "Inspect the relevant workspace files and project structure.",
            "Search local knowledge and recent activity for related errors.",
            "Identify likely files or modules involved.",
            "Create a safe fix plan before editing files.",
            "Request approval before any file modification.",
            "Run approved compile or build checks.",
            "Summarize the fix result and remaining risks.",
        ],
    },
    "research": {
        "name": "Research Workflow",
        "description": "Research a topic using browser research and local knowledge.",
        "priority": 3,
        "steps": [
            "Clarify the research question and output format.",
            "Search local knowledge for existing related notes.",
            "Research selected public documentation or web pages.",
            "Compare relevant sources.",
            "Summarize key findings.",
            "Save a web research report.",
            "Create final recommendations and next actions.",
        ],
    },
    "portfolio_project": {
        "name": "Portfolio Project Workflow",
        "description": "Prepare a project for portfolio, resume, and demo presentation.",
        "priority": 5,
        "steps": [
            "Summarize the project purpose and target audience.",
            "Inspect workspace and detect tech stack.",
            "Generate project case study draft.",
            "Generate screenshot checklist.",
            "Generate demo script.",
            "Generate GitHub README summary.",
            "Check release readiness.",
            "Summarize what is missing before publishing.",
        ],
    },
    "assignment_report": {
        "name": "Assignment / Report Workflow",
        "description": "Plan and organize an academic or professional report workflow.",
        "priority": 4,
        "steps": [
            "Clarify assignment topic, marking criteria, and required structure.",
            "Index or search local assignment documents.",
            "Create report outline.",
            "Identify research sources and evidence needed.",
            "Draft section-by-section writing plan.",
            "Check referencing and academic integrity requirements.",
            "Prepare final review checklist.",
        ],
    },
    "workspace_development": {
        "name": "Workspace Development Workflow",
        "description": "Plan and execute safe development improvements for a workspace.",
        "priority": 4,
        "steps": [
            "Inspect workspace structure.",
            "Detect technology stack and key files.",
            "Summarize current project state.",
            "Identify the next best development improvement.",
            "Create an implementation plan.",
            "Request approval before file or command actions.",
            "Run approved build or compile checks.",
            "Generate a development summary.",
        ],
    },
    "demo_recording": {
        "name": "Demo Recording Workflow",
        "description": "Prepare and run a clean demo recording for O.R.I.O.N.",
        "priority": 5,
        "steps": [
            "Enable portfolio demo mode.",
            "Run System Doctor.",
            "Generate demo readiness report.",
            "Generate demo script.",
            "Check screenshot checklist.",
            "Open Aurora OS dashboard.",
            "Run one controlled mission step.",
            "Show approval system behavior.",
            "Generate final demo recording checklist.",
        ],
    },
    "system_cleanup": {
        "name": "System Cleanup Workflow",
        "description": "Audit generated artifacts, caches, temporary files, and repository hygiene safely.",
        "priority": 4,
        "steps": [
            "Inspect repository status and generated artifact locations.",
            "Identify build caches, temporary screenshots, logs, and database outputs.",
            "Confirm ignore rules protect generated files from source-control changes.",
            "Request approval before deleting or restoring files.",
            "Run safe cleanup commands after approval.",
            "Verify git status and build outputs remain clean.",
            "Summarize cleanup actions and remaining manual checks.",
        ],
    },
}


def list_blueprints() -> List[Dict[str, Any]]:
    return [
        {
            "key": key,
            "name": value["name"],
            "description": value["description"],
            "priority": value["priority"],
            "step_count": len(value["steps"]),
        }
        for key, value in WORKFLOW_BLUEPRINTS.items()
    ]


def get_blueprint(key: str) -> Optional[Dict[str, Any]]:
    blueprint = WORKFLOW_BLUEPRINTS.get(key)

    if not blueprint:
        return None

    return {
        "key": key,
        **blueprint,
    }


def render_blueprint(key: str) -> str:
    blueprint = get_blueprint(key)

    if not blueprint:
        return "Workflow blueprint not found."

    steps = "\n".join(
        f"{index + 1}. {step}"
        for index, step in enumerate(blueprint["steps"])
    )

    return f"""
# {blueprint['name']}

Key: {blueprint['key']}
Priority: {blueprint['priority']}

Description:
{blueprint['description']}

Steps:
{steps}
""".strip()


def create_mission_from_blueprint(
    blueprint_key: str,
    mission_title: str = "",
    custom_goal: str = "",
    workspace_id: Optional[int] = None,
) -> Dict[str, Any]:
    blueprint = get_blueprint(blueprint_key)

    if not blueprint:
        raise ValueError(f"Blueprint not found: {blueprint_key}")

    title = mission_title.strip() or blueprint["name"]
    workspace_note = f" Workspace ID: {workspace_id}." if workspace_id else ""
    goal = custom_goal.strip() or (
        f"Run the {blueprint['name']} safely using O.R.I.O.N. workflows."
        f"{workspace_note}"
    )

    steps = blueprint["steps"]

    if workspace_id:
        steps = [
            step.replace("selected workspace", f"workspace {workspace_id}")
            for step in steps
        ]

    mission_id = create_mission_record(
        title=title,
        goal=goal,
        steps=steps,
        priority=int(blueprint["priority"]),
        status="planned",
    )

    return {
        "mission_id": mission_id,
        "blueprint_key": blueprint_key,
        "title": title,
        "goal": goal,
        "step_count": len(steps),
        "created_at": datetime.now().isoformat(timespec="seconds"),
    }
