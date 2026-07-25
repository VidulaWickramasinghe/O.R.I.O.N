from agents import function_tool

from core.public_landing import render_public_landing_report, save_public_landing_report as save_report
from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission


@function_tool
@instrument_tool("get_public_landing_report")
@enforce_tool_permission("get_public_landing_report")
def get_public_landing_report() -> str:
    """Generate the local public landing readiness report."""
    return render_public_landing_report()


@function_tool
@instrument_tool("save_public_landing_report")
@enforce_tool_permission("save_public_landing_report")
def save_public_landing_report() -> str:
    """Save the local public landing readiness report."""
    result = save_report()
    return f"Public landing report saved.\n\nPath: {result['path']}\nGenerated At: {result['generated_at']}"
