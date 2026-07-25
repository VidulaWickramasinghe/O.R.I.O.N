from agents import function_tool
from core.roadmap_planner import add_future_feature as add_feature, generate_roadmap_package as generate_package, render_roadmap_report, save_roadmap_report as save_report
from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission
def deco(name):return lambda fn:function_tool(instrument_tool(name)(enforce_tool_permission(name)(fn)))
@deco('get_roadmap_report')
def get_roadmap_report()->str:return render_roadmap_report()
@deco('save_roadmap_report')
def save_roadmap_report()->str:
 result=save_report();return f"Roadmap report saved.\nPath: {result['path']}"
@deco('add_future_feature')
def add_future_feature(title:str,description:str='',source:str='manual')->str:
 feature=add_feature(title,description,source);return f"Feature added.\nID: {feature['id']}\nSafety: {feature['safety_level']}\nBucket: {feature['release_bucket']}"
@deco('generate_roadmap_package')
def generate_roadmap_package()->str:
 result=generate_package();return f"Roadmap package generated.\nSummary: {result['summary_path']}"
