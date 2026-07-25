from agents import function_tool
from core.final_launch import freeze_final_launch as freeze_core, unfreeze_final_launch as unfreeze_core, generate_final_launch_package as package_core, render_final_launch_report, save_final_launch_report as save_core
from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission
def _tool(name): return lambda fn: function_tool(instrument_tool(name)(enforce_tool_permission(name)(fn)))
@_tool("get_final_launch_report")
def get_final_launch_report()->str: return render_final_launch_report()
@_tool("save_final_launch_report")
def save_final_launch_report()->str: return str(save_core())
@_tool("freeze_final_launch")
def freeze_final_launch(reason: str="Final public portfolio launch preparation.")->str: return str(freeze_core(reason))
@_tool("unfreeze_final_launch")
def unfreeze_final_launch(reason: str="Final launch freeze lifted.")->str: return str(unfreeze_core(reason))
@_tool("generate_final_launch_package")
def generate_final_launch_package()->str: return str(package_core())
