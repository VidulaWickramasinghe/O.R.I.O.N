from agents import function_tool
from core.demo_walkthrough import render_demo_walkthrough_report, save_demo_walkthrough_report as save_demo_walkthrough_report_core
from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission

@function_tool
@instrument_tool("get_demo_walkthrough_report")
@enforce_tool_permission("get_demo_walkthrough_report")
def get_demo_walkthrough_report() -> str:
    """Generate the presentation-only O.R.I.O.N. v5.3 walkthrough report."""
    return render_demo_walkthrough_report()

@function_tool
@instrument_tool("save_demo_walkthrough_report")
@enforce_tool_permission("save_demo_walkthrough_report")
def save_demo_walkthrough_report() -> str:
    """Save the presentation-only O.R.I.O.N. v5.3 walkthrough report."""
    result = save_demo_walkthrough_report_core()
    return f"Demo walkthrough report saved.\n\nPath: {result['path']}\nGenerated At: {result['generated_at']}"
