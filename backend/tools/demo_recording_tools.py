from agents import function_tool
from core.demo_recording import render_demo_recording_report, save_demo_recording_report as save_demo_recording_report_core
from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission
@function_tool
@instrument_tool("get_demo_recording_report")
@enforce_tool_permission("get_demo_recording_report")
def get_demo_recording_report() -> str: return render_demo_recording_report()
@function_tool
@instrument_tool("save_demo_recording_report")
@enforce_tool_permission("save_demo_recording_report")
def save_demo_recording_report() -> str:
    result=save_demo_recording_report_core(); return f"Demo recording report saved.\n\nPath: {result['path']}\nGenerated At: {result['generated_at']}"
