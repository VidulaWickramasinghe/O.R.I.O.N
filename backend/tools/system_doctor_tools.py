from agents import function_tool

from core.system_doctor import render_system_doctor_report
from core.tool_logger import instrument_tool


@function_tool
@instrument_tool("run_system_doctor")
def run_system_doctor_tool() -> str:
    """
    Run O.R.I.O.N. system diagnostics and readiness checks.
    """
    return render_system_doctor_report()
