from agents import function_tool

from core.tool_logger import instrument_tool
from core.tool_permissions import (
    get_tool_permission_matrix,
    get_tool_permission_metrics,
    is_tool_allowed,
    render_tool_permission_report,
)


@function_tool
@instrument_tool("get_tool_permission_report")
def get_tool_permission_report() -> str:
    """
    Generate the O.R.I.O.N. tool permission enforcement report.
    """
    return render_tool_permission_report()


@function_tool
@instrument_tool("check_tool_permission")
def check_tool_permission(tool_name: str) -> str:
    """
    Check whether a tool is currently allowed by plugin enforcement.
    """
    decision = is_tool_allowed(tool_name)
    return f"""
Tool Permission Check
Tool: {decision['tool_name']}
Plugin: {decision['plugin_key'] or 'unmapped'}
Allowed: {decision['allowed']}
Reason: {decision['reason']}
""".strip()


@function_tool
@instrument_tool("get_tool_permission_metrics")
def get_tool_permission_metrics_tool() -> str:
    """
    Get tool permission enforcement metrics.
    """
    metrics = get_tool_permission_metrics()
    return "\n".join(f"{key}: {value}" for key, value in metrics.items())


@function_tool
@instrument_tool("list_tool_permission_matrix")
def list_tool_permission_matrix() -> str:
    """
    List the mapped tool-to-plugin permission matrix.
    """
    matrix = get_tool_permission_matrix()
    return "\n".join(
        f"{item['tool_name']} -> {item['plugin_key']} | "
        f"Enabled: {item['enabled']} | Protected: {item['protected']} | "
        f"Risk: {item['risk_level']}"
        for item in matrix
    )
