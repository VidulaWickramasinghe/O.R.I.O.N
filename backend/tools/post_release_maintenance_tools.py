from agents import function_tool
from core.post_release_maintenance import *
from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission
def deco(n):return lambda f:function_tool(instrument_tool(n)(enforce_tool_permission(n)(f)))
@deco('get_post_release_maintenance_report')
def get_post_release_maintenance_report():return render_maintenance_report()
@deco('save_post_release_maintenance_report')
def save_post_release_maintenance_report():return str(save_maintenance_report())
@deco('add_known_issue')
def add_known_issue_tool(title,body='',source='manual'):return str(add_known_issue(title,body,source))
@deco('get_patch_plan')
def get_patch_plan():return str(generate_patch_plan())
