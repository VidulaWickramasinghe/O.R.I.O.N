from agents import function_tool
from core.portfolio_showcase import render_portfolio_showcase_report, save_portfolio_showcase_report as save_core
from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission
@function_tool
@instrument_tool("get_portfolio_showcase_report")
@enforce_tool_permission("get_portfolio_showcase_report")
def get_portfolio_showcase_report() -> str:
    """Generate a presentation-only portfolio showcase report."""
    return render_portfolio_showcase_report()
@function_tool
@instrument_tool("save_portfolio_showcase_report")
@enforce_tool_permission("save_portfolio_showcase_report")
def save_portfolio_showcase_report() -> str:
    """Save a local portfolio showcase report."""
    return save_core()["report"]
