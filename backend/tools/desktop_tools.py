from agents import function_tool

from core.tool_logger import instrument_tool
from core.desktop_control import (
    request_open_workspace_in_vscode,
    request_open_workspace_folder,
    request_open_url_in_browser,
    request_start_workspace_dev_server,
)


@function_tool
@instrument_tool("open_workspace_in_vscode")
def open_workspace_in_vscode(workspace_id: int) -> str:
    """
    Request approval to open a registered workspace in VS Code.
    """
    try:
        approval_id = request_open_workspace_in_vscode(workspace_id)
        return (
            f"Approval required to open workspace {workspace_id} in VS Code. "
            f"Approval Request ID: {approval_id}."
        )
    except Exception as error:
        return f"VS Code open request failed: {error}"


@function_tool
@instrument_tool("open_workspace_folder")
def open_workspace_folder(workspace_id: int) -> str:
    """
    Request approval to open a registered workspace folder.
    """
    try:
        approval_id = request_open_workspace_folder(workspace_id)
        return (
            f"Approval required to open workspace folder {workspace_id}. "
            f"Approval Request ID: {approval_id}."
        )
    except Exception as error:
        return f"Folder open request failed: {error}"


@function_tool
@instrument_tool("open_url_in_browser")
def open_url_in_browser(url: str) -> str:
    """
    Request approval to open a URL in the default browser.
    """
    try:
        approval_id = request_open_url_in_browser(url)
        return (
            f"Approval required to open URL in browser. "
            f"Approval Request ID: {approval_id}."
        )
    except Exception as error:
        return f"Browser open request failed: {error}"


@function_tool
@instrument_tool("start_workspace_dev_server")
def start_workspace_dev_server(workspace_id: int) -> str:
    """
    Request approval to start a workspace development server using npm run dev.
    """
    try:
        approval_id = request_start_workspace_dev_server(workspace_id)
        return (
            f"Approval required to start dev server for workspace {workspace_id}. "
            f"Approval Request ID: {approval_id}."
        )
    except Exception as error:
        return f"Dev server start request failed: {error}"
