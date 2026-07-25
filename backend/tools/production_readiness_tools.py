from agents import function_tool
from core.production_readiness import generate_final_release_candidate_v2 as generate_rc, render_production_readiness_report, save_production_readiness_report as save_report
from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission
@function_tool
@instrument_tool("get_production_readiness_report")
@enforce_tool_permission("get_production_readiness_report")
def get_production_readiness_report()->str: return render_production_readiness_report()
@function_tool
@instrument_tool("save_production_readiness_report")
@enforce_tool_permission("save_production_readiness_report")
def save_production_readiness_report()->str:
    result=save_report(); return f"Production readiness report saved.\nPath: {result['path']}"
@function_tool
@instrument_tool("generate_final_release_candidate_v2")
@enforce_tool_permission("generate_final_release_candidate_v2")
def generate_final_release_candidate_v2()->str:
    result=generate_rc(); return f"Final Release Candidate v2 generated.\nStatus: {result['status']}\nSummary: {result['summary_path']}"
