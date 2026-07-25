from agents import function_tool

from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission
from core.ui_polish import render_ui_polish_report, save_ui_polish_report as save_report


@function_tool
@instrument_tool("get_ui_polish_report")
@enforce_tool_permission("get_ui_polish_report")
def get_ui_polish_report() -> str:
    """Generate the responsive UI readiness report."""
    return render_ui_polish_report()


@function_tool
@instrument_tool("save_ui_polish_report")
@enforce_tool_permission("save_ui_polish_report")
def save_ui_polish_report() -> str:
    """Save the responsive UI readiness report locally."""
    result = save_report()
    return f"UI polish report saved.\n\nPath: {result['path']}\nGenerated At: {result['generated_at']}"
