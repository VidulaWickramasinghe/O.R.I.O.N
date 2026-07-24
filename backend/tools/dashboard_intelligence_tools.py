from agents import function_tool

from core.dashboard_intelligence import render_dashboard_intelligence_report
from core.tool_logger import instrument_tool


@function_tool
@instrument_tool("get_dashboard_intelligence_report")
def get_dashboard_intelligence_report() -> str:
    """
    Generate Aurora OS dashboard intelligence report.
    """
    return render_dashboard_intelligence_report()
