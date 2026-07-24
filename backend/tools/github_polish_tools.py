from agents import function_tool
from core.github_polish import render_github_polish_report, save_github_polish_artifacts as save_artifacts
from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission

@function_tool
@instrument_tool("get_github_polish_report")
@enforce_tool_permission("get_github_polish_report")
def get_github_polish_report() -> str:
    """Generate a local-only GitHub repository-polish report."""
    return render_github_polish_report()

@function_tool
@instrument_tool("save_github_polish_artifacts")
@enforce_tool_permission("save_github_polish_artifacts")
def save_github_polish_artifacts() -> str:
    """Save local-only GitHub launch-preparation artifacts."""
    result = save_artifacts()
    return "GitHub polish artifacts saved.\n" + "\n".join(f"- {key}: {value}" for key, value in result["artifacts"].items())
