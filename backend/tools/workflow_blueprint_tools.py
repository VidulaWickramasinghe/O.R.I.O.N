from typing import Optional

from agents import function_tool

from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission
from core.workflow_blueprints import (
    create_mission_from_blueprint,
    list_blueprints,
    render_blueprint,
)


@function_tool
@instrument_tool("list_workflow_blueprints")
@enforce_tool_permission("list_workflow_blueprints")
def list_workflow_blueprints() -> str:
    """
    List available O.R.I.O.N. workflow blueprints.
    """
    blueprints = list_blueprints()

    if not blueprints:
        return "No workflow blueprints available."

    return "\n".join(
        f"{item['key']} — {item['name']} | Priority {item['priority']} | "
        f"{item['step_count']} steps | {item['description']}"
        for item in blueprints
    )


@function_tool
@instrument_tool("read_workflow_blueprint")
@enforce_tool_permission("read_workflow_blueprint")
def read_workflow_blueprint(blueprint_key: str) -> str:
    """
    Read a workflow blueprint by key.
    """
    return render_blueprint(blueprint_key)


@function_tool
@instrument_tool("create_mission_from_workflow_blueprint")
@enforce_tool_permission("create_mission_from_workflow_blueprint")
def create_mission_from_workflow_blueprint(
    blueprint_key: str,
    mission_title: str = "",
    custom_goal: str = "",
    workspace_id: Optional[int] = None,
) -> str:
    """
    Create a mission from a reusable workflow blueprint.
    """
    try:
        result = create_mission_from_blueprint(
            blueprint_key=blueprint_key,
            mission_title=mission_title,
            custom_goal=custom_goal,
            workspace_id=workspace_id,
        )

        return f"""
Mission created from workflow blueprint.

Mission ID: {result['mission_id']}
Blueprint: {result['blueprint_key']}
Title: {result['title']}
Goal: {result['goal']}
Steps: {result['step_count']}
Created: {result['created_at']}
""".strip()

    except Exception as error:
        return f"Mission blueprint creation failed: {error}"
