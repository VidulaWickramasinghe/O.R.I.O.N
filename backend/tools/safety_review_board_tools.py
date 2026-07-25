from agents import function_tool
from core.safety_review_board import create_feature_review as review_core, generate_safety_review_package as package_core, render_safety_review_report, save_safety_review_report as save_core
from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission
@function_tool
@instrument_tool("get_safety_review_report")
@enforce_tool_permission("get_safety_review_report")
def get_safety_review_report() -> str: return render_safety_review_report()
@function_tool
@instrument_tool("save_safety_review_report")
@enforce_tool_permission("save_safety_review_report")
def save_safety_review_report() -> str: return str(save_core())
@function_tool
@instrument_tool("create_feature_review")
@enforce_tool_permission("create_feature_review")
def create_feature_review(feature_id: str, reviewer: str = "O.R.I.O.N. Safety Review Board", decision: str = "auto_recommend", notes: str = "") -> str: return str(review_core(feature_id, reviewer, decision, notes))
@function_tool
@instrument_tool("generate_safety_review_package")
@enforce_tool_permission("generate_safety_review_package")
def generate_safety_review_package() -> str: return str(package_core())
