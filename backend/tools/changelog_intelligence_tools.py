from agents import function_tool
from core.changelog_intelligence import render_changelog_intelligence_report, save_changelog_intelligence_artifacts as save_core
from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission
@function_tool
@instrument_tool("get_changelog_intelligence_report")
@enforce_tool_permission("get_changelog_intelligence_report")
def get_changelog_intelligence_report() -> str: return render_changelog_intelligence_report()
@function_tool
@instrument_tool("save_changelog_intelligence_artifacts")
@enforce_tool_permission("save_changelog_intelligence_artifacts")
def save_changelog_intelligence_artifacts() -> str: return str(save_core())
