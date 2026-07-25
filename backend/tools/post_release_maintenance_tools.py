from agents import function_tool
from core.post_release_maintenance import add_known_issue as add_issue, generate_patch_plan, render_maintenance_report, save_maintenance_report as save_report
from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission

def decorators(name):
 def apply(function): return function_tool(instrument_tool(name)(enforce_tool_permission(name)(function)))
 return apply
@decorators('get_post_release_maintenance_report')
def get_post_release_maintenance_report()->str: return render_maintenance_report()
@decorators('save_post_release_maintenance_report')
def save_post_release_maintenance_report()->str:
 result=save_report(); return f"Maintenance report saved.\nPath: {result['path']}"
@decorators('add_known_issue')
def add_known_issue(title:str,body:str='',source:str='manual')->str:
 issue=add_issue(title,body,source); return f"Known issue added.\nID: {issue['id']}\nCategory: {issue['category']}\nPriority: {issue['priority']}"
@decorators('get_patch_plan')
def get_patch_plan()->str:
 plan=generate_patch_plan(); return f"Patch plan: {plan['status']}\nRecommended: {plan['recommended_patch']}\nOpen: {plan['open_count']}"
