from agents import function_tool

from core.backend_sidecar import (
    render_sidecar_report,
    restart_backend_sidecar,
    start_backend_sidecar,
    stop_backend_sidecar,
)
from core.tool_logger import instrument_tool


@function_tool
@instrument_tool("get_backend_sidecar_status")
def get_backend_sidecar_status() -> str:
    """
    Get local O.R.I.O.N. backend sidecar status.
    """
    return render_sidecar_report()


@function_tool
@instrument_tool("start_backend_sidecar")
def start_backend_sidecar_tool() -> str:
    """
    Start the local O.R.I.O.N. backend sidecar.
    """
    status = start_backend_sidecar()
    return f"Backend sidecar start requested. Status: {status['status']}. URL: {status['backend_url']}"


@function_tool
@instrument_tool("stop_backend_sidecar")
def stop_backend_sidecar_tool() -> str:
    """
    Stop the local O.R.I.O.N. backend sidecar.
    """
    status = stop_backend_sidecar()
    return f"Backend sidecar stop requested. Status: {status['status']}."


@function_tool
@instrument_tool("restart_backend_sidecar")
def restart_backend_sidecar_tool() -> str:
    """
    Restart the local O.R.I.O.N. backend sidecar.
    """
    status = restart_backend_sidecar()
    return f"Backend sidecar restart requested. Status: {status['status']}. URL: {status['backend_url']}"
