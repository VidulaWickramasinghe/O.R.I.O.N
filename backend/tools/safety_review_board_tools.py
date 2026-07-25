from agents import function_tool
from core.safety_review_board import create_feature_review as create_review, generate_safety_review_package as generate_package, render_safety_review_report, save_safety_review_report as save_report
from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission
def deco(name):return lambda fn:function_tool(instrument_tool(name)(enforce_tool_permission(name)(fn)))
@deco('get_safety_review_report')
def get_safety_review_report()->str:return render_safety_review_report()
@deco('save_safety_review_report')
def save_safety_review_report()->str:
 result=save_report();return f"Safety review saved.\nPath: {result['path']}"
@deco('create_feature_review')
def create_feature_review(feature_id:str,reviewer:str='O.R.I.O.N. Safety Review Board',decision:str='auto_recommend',notes:str='')->str:
 review=create_review(feature_id,reviewer,decision,notes);return f"Review created.\nDecision: {review['decision']}\nRisk: {review['risk_level']}\nEligible: {review['development_eligible']}"
@deco('generate_safety_review_package')
def generate_safety_review_package()->str:
 result=generate_package();return f"Safety package generated.\nSummary: {result['summary_path']}"
