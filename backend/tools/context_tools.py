from agents import function_tool

from core.tool_logger import instrument_tool
from core.context_engine import get_context_preview


@function_tool
@instrument_tool("retrieve_project_context")
def retrieve_project_context(
    query: str,
    workspace_id: int | None = None,
    project_key: str = "",
    mission_id: int | None = None,
) -> str:
    """
    Retrieve relevant O.R.I.O.N. memory, project, workspace, mission, approval,
    and activity context for a query.
    """
    return get_context_preview(
        query,
        workspace_id=workspace_id,
        project_key=project_key,
        mission_id=mission_id,
    )
