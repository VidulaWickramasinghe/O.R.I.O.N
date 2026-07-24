from agents import function_tool

from core.stabilization_manager import (
    render_stabilization_report,
    run_stabilization_scan,
    save_stabilization_report as save_stabilization_report_core,
)
from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission


@function_tool
@instrument_tool("run_stabilization_scan")
@enforce_tool_permission("run_stabilization_scan")
def run_stabilization_scan_tool(run_build: bool = False) -> str:
    """Run the O.R.I.O.N. v4.1 read-only stabilization scan."""
    scan = run_stabilization_scan(run_build=run_build)
    return f"""Stabilization scan complete.

Status: {scan['status']}
Generated At: {scan['generated_at']}
Required Files: {scan['required_files']['present_count']} present, {scan['required_files']['missing_count']} missing
Import Risks: {scan['import_risks']['risk_count']}
Code Findings: {scan['code_risks']['finding_count']}
Duplicate Groups: {scan['duplicate_risk_zones']['duplicate_group_count']}
Backend Compile OK: {scan['backend_compile']['ok']}
Frontend Build OK: {scan['frontend_build']['ok']}"""


@function_tool
@instrument_tool("get_stabilization_report")
@enforce_tool_permission("get_stabilization_report")
def get_stabilization_report(run_build: bool = False) -> str:
    """Generate the O.R.I.O.N. v4.1 stabilization report."""
    return render_stabilization_report(run_build=run_build)


@function_tool
@instrument_tool("save_stabilization_report")
@enforce_tool_permission("save_stabilization_report")
def save_stabilization_report(run_build: bool = False) -> str:
    """Save a local O.R.I.O.N. v4.1 stabilization report artifact."""
    result = save_stabilization_report_core(run_build=run_build)
    return f"Stabilization report saved.\n\nPath: {result['path']}\nGenerated At: {result['generated_at']}"
