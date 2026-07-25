from agents import function_tool
from core.roadmap_planner import add_future_feature as add_core, generate_roadmap_package as package_core, render_roadmap_report, save_roadmap_report as save_core
from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission
@function_tool
@instrument_tool("get_roadmap_report")
@enforce_tool_permission("get_roadmap_report")
def get_roadmap_report() -> str: return render_roadmap_report()
@function_tool
@instrument_tool("save_roadmap_report")
@enforce_tool_permission("save_roadmap_report")
def save_roadmap_report() -> str: return str(save_core())
@function_tool
@instrument_tool("add_future_feature")
@enforce_tool_permission("add_future_feature")
def add_future_feature(title: str, description: str = "", source: str = "manual") -> str: return str(add_core(title, description, source))
@function_tool
@instrument_tool("generate_roadmap_package")
@enforce_tool_permission("generate_roadmap_package")
def generate_roadmap_package() -> str: return str(package_core())
