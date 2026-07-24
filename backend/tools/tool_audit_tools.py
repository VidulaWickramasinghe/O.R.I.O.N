from agents import function_tool

from core.tool_audit import (
    get_tool_audit_metrics,
    list_tool_audit_events,
    render_tool_audit_report,
)
from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission


@function_tool
@instrument_tool("get_tool_audit_report")
@enforce_tool_permission("get_tool_audit_report")
def get_tool_audit_report() -> str:
    """
    Generate O.R.I.O.N. Tool Audit Center report.
    """
    return render_tool_audit_report()


@function_tool
@instrument_tool("list_tool_audit_events")
@enforce_tool_permission("list_tool_audit_events")
def list_tool_audit_events_tool(limit: int = 30, decision: str = "") -> str:
    """
    List recent tool audit events.
    """
    clean_decision = decision.strip() or None
    events = list_tool_audit_events(limit=limit, decision=clean_decision)
    if not events:
        return "No tool audit events found."
    return "\n".join(
        f"[{event['id']}] {event['decision']} | {event['tool_name']} | "
        f"Plugin: {event['plugin_key'] or 'unmapped'} | Risk: {event['risk_level']} | "
        f"{event['created_at']} | {event['reason']}"
        for event in events
    )


@function_tool
@instrument_tool("get_tool_audit_metrics")
@enforce_tool_permission("get_tool_audit_metrics")
def get_tool_audit_metrics_tool() -> str:
    """
    Get Tool Audit Center metrics.
    """
    metrics = get_tool_audit_metrics()
    return "\n".join(f"{key}: {value}" for key, value in metrics.items())
