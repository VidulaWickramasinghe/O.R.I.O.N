from agents import function_tool

from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission
from core.github_release_assistant import (
    inspect_release_readiness,
    generate_github_release_notes,
    generate_release_checklist,
    generate_commit_message,
)


@function_tool
@instrument_tool("inspect_github_release_readiness")
@enforce_tool_permission("inspect_github_release_readiness")
def inspect_github_release_readiness(workspace_id: int) -> str:
    """
    Inspect a registered workspace and generate a GitHub release readiness report.
    """
    return inspect_release_readiness(workspace_id=workspace_id)


@function_tool
@instrument_tool("generate_github_release_notes")
@enforce_tool_permission("generate_github_release_notes_tool")
def generate_github_release_notes_tool(
    workspace_id: int,
    release_version: str,
) -> str:
    """
    Generate GitHub release notes for a registered workspace.
    """
    result = generate_github_release_notes(
        workspace_id=workspace_id,
        release_version=release_version,
    )

    return f"""
GitHub release notes generated.

Artifact:
{result['artifact_path']}

Content:
{result['content']}
""".strip()


@function_tool
@instrument_tool("generate_github_release_checklist")
@enforce_tool_permission("generate_github_release_checklist")
def generate_github_release_checklist(
    workspace_id: int,
    release_version: str,
) -> str:
    """
    Generate a release checklist for a registered workspace.
    """
    result = generate_release_checklist(
        workspace_id=workspace_id,
        release_version=release_version,
    )

    return f"""
GitHub release checklist generated.

Artifact:
{result['artifact_path']}

Content:
{result['content']}
""".strip()


@function_tool
@instrument_tool("suggest_release_commit_message")
@enforce_tool_permission("suggest_release_commit_message")
def suggest_release_commit_message(
    release_version: str,
    change_summary: str,
) -> str:
    """
    Suggest a safe Git commit message for the release.
    """
    return generate_commit_message(
        release_version=release_version,
        change_summary=change_summary,
    )
