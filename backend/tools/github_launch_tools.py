from agents import function_tool
from core.github_launch import render_github_launch_report,save_github_launch_artifacts as save_core
from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission
@function_tool
@instrument_tool('get_github_launch_report')
@enforce_tool_permission('get_github_launch_report')
def get_github_launch_report():return render_github_launch_report()
@function_tool
@instrument_tool('save_github_launch_artifacts')
@enforce_tool_permission('save_github_launch_artifacts')
def save_github_launch_artifacts(write_templates:bool=True):return str(save_core(write_templates))
