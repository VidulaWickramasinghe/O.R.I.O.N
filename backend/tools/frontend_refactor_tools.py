from agents import function_tool

from core.frontend_refactor import (
    inspect_frontend_architecture,
    render_frontend_refactor_report,
    save_frontend_refactor_report as save_frontend_refactor_report_core,
)
from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission


@function_tool
@instrument_tool("inspect_frontend_architecture")
@enforce_tool_permission("inspect_frontend_architecture")
def inspect_frontend_architecture_tool() -> str:
    """Inspect Aurora OS frontend component architecture."""
    scan = inspect_frontend_architecture()
    return f"Frontend architecture inspection complete.\n\nStatus: {scan['status']}\npage.tsx Lines: {scan['page_lines']}\nComponent Count: {scan['component_count']}\nMissing Directories: {len(scan['missing_directories'])}\nMissing Files: {len(scan['missing_files'])}"


@function_tool
@instrument_tool("get_frontend_refactor_report")
@enforce_tool_permission("get_frontend_refactor_report")
def get_frontend_refactor_report() -> str:
    """Generate the Aurora OS frontend refactor report."""
    return render_frontend_refactor_report()


@function_tool
@instrument_tool("save_frontend_refactor_report")
@enforce_tool_permission("save_frontend_refactor_report")
def save_frontend_refactor_report() -> str:
    """Save a local Aurora OS frontend refactor report."""
    result = save_frontend_refactor_report_core()
    return f"Frontend refactor report saved.\n\nPath: {result['path']}\nGenerated At: {result['generated_at']}"
