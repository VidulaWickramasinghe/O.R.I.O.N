from typing import List, Optional

from agents import function_tool

from core.developer_agent import (
    create_patch_plan,
    diagnose_workspace_issue,
    inspect_workspace_for_development,
    list_developer_reports,
    request_workspace_file_patch,
)
from core.tool_logger import instrument_tool


@function_tool
@instrument_tool("inspect_workspace_for_development")
def inspect_workspace_for_development_tool(workspace_id: int) -> str:
    """
    Inspect a registered workspace for developer-agent work.
    """
    return inspect_workspace_for_development(workspace_id)


@function_tool
@instrument_tool("diagnose_workspace_issue")
def diagnose_workspace_issue_tool(workspace_id: int, issue_description: str) -> str:
    """
    Diagnose a workspace issue using project structure and key file previews.
    """
    return diagnose_workspace_issue(
        workspace_id=workspace_id,
        issue_description=issue_description,
    )


@function_tool
@instrument_tool("create_workspace_patch_plan")
def create_workspace_patch_plan(
    workspace_id: int,
    issue_description: str,
    target_files: Optional[List[str]] = None,
) -> str:
    """
    Create a safe approval-gated patch plan for a workspace issue.
    """
    return create_patch_plan(
        workspace_id=workspace_id,
        issue_description=issue_description,
        target_files=target_files,
    )


@function_tool
@instrument_tool("request_workspace_file_patch")
def request_workspace_file_patch_tool(
    workspace_id: int,
    relative_path: str,
    new_content: str,
    reason: str,
) -> str:
    """
    Request approval to replace or create a workspace file with new content.
    """
    try:
        approval_id = request_workspace_file_patch(
            workspace_id=workspace_id,
            relative_path=relative_path,
            new_content=new_content,
            reason=reason,
        )

        return (
            "Approval required to patch workspace file. "
            f"Approval Request ID: {approval_id}."
        )
    except Exception as error:
        return f"Workspace patch request failed: {error}"


@function_tool
@instrument_tool("list_developer_reports")
def list_developer_reports_tool(workspace_id: Optional[int] = None, limit: int = 20) -> str:
    """
    List developer-agent reports.
    """
    reports = list_developer_reports(workspace_id=workspace_id, limit=limit)

    if not reports:
        return "No developer reports found."

    return "\n".join(
        f"[{report['id']}] Workspace {report['workspace_id']} | "
        f"{report['report_type']} | {report['title']} | {report['artifact_path']}"
        for report in reports
    )
