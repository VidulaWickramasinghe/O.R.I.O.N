from agents import function_tool
from core.ui_polish import render_ui_polish_report,save_ui_polish_report
from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission
@function_tool
@instrument_tool('get_ui_polish_report')
@enforce_tool_permission('get_ui_polish_report')
def get_ui_polish_report():return render_ui_polish_report()
@function_tool
@instrument_tool('save_ui_polish_report')
@enforce_tool_permission('save_ui_polish_report')
def save_ui_polish_report_tool():return str(save_ui_polish_report())
