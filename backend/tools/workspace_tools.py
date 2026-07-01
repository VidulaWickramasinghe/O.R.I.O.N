from agents import function_tool

from core.tool_logger import instrument_tool
from core.workspace_manager import (
    register_workspace_record,
    list_workspace_records,
    get_workspace_record,
    inspect_workspace_structure,
    read_workspace_file,
    detect_workspace_stack,
    summarize_workspace_record,
)


def _format_workspaces(workspaces):
    if not workspaces:
        return "No workspaces registered yet."

    return "\n".join(
        f"[{workspace['id']}] {workspace['name']} | "
        f"Status: {workspace['status']} | "
        f"Path: {workspace['path']}"
        for workspace in workspaces
    )


@function_tool
@instrument_tool("register_workspace")
def register_workspace(
    name: str,
    path: str,
    description: str = "",
    status: str = "active",
) -> str:
    """
    Register a local project workspace path for O.R.I.O.N. to inspect safely.
    """
    try:
        workspace_id = register_workspace_record(
            name=name,
            path=path,
            description=description,
            status=status,
        )
        return f"Workspace registered: {name} | Workspace ID: {workspace_id}"
    except Exception as error:
        return f"Workspace registration failed: {error}"


@function_tool
@instrument_tool("list_workspaces")
def list_workspaces(limit: int = 20) -> str:
    """
    List registered project workspaces.
    """
    workspaces = list_workspace_records(limit=limit)
    return _format_workspaces(workspaces)


@function_tool
@instrument_tool("read_workspace")
def read_workspace(workspace_id: int) -> str:
    """
    Read workspace metadata.
    """
    workspace = get_workspace_record(workspace_id)

    if not workspace:
        return "Workspace not found."

    return f"""
Workspace ID: {workspace['id']}
Name: {workspace['name']}
Path: {workspace['path']}
Status: {workspace['status']}

Description:
{workspace['description']}

Created:
{workspace['created_at']}

Updated:
{workspace['updated_at']}
""".strip()


@function_tool
@instrument_tool("inspect_workspace")
def inspect_workspace(workspace_id: int, max_depth: int = 2) -> str:
    """
    Inspect workspace folder structure safely.
    """
    return inspect_workspace_structure(workspace_id=workspace_id, max_depth=max_depth)


@function_tool
@instrument_tool("read_workspace_key_file")
def read_workspace_key_file(workspace_id: int, relative_path: str) -> str:
    """
    Read a safe text file inside a registered workspace.
    """
    return read_workspace_file(workspace_id=workspace_id, relative_path=relative_path)


@function_tool
@instrument_tool("detect_workspace_tech_stack")
def detect_workspace_tech_stack(workspace_id: int) -> str:
    """
    Detect project technology stack from key files.
    """
    stack = detect_workspace_stack(workspace_id=workspace_id)

    if "error" in stack:
        return stack["error"]

    return f"""
Workspace: {stack['name']}
Path: {stack['path']}

Detected Stack:
{', '.join(stack['detected_stack']) or 'No stack detected.'}

Key Files:
{', '.join(stack['key_files']) or 'No key files found.'}
""".strip()


@function_tool
@instrument_tool("summarize_workspace")
def summarize_workspace(workspace_id: int) -> str:
    """
    Generate a workspace summary using project structure and key files.
    """
    return summarize_workspace_record(workspace_id=workspace_id)
