import json
import os
import signal
import socket
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional


PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
DATA_DIR = BACKEND_DIR / "data"
SIDECAR_DIR = DATA_DIR / "sidecar"
SIDECAR_STATE_FILE = SIDECAR_DIR / "backend_sidecar_state.json"
SIDECAR_LOG_FILE = SIDECAR_DIR / "backend_sidecar.log"

SIDECAR_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_STATE = {
    "managed_by": "O.R.I.O.N. Backend Sidecar",
    "status": "unknown",
    "pid": None,
    "host": "127.0.0.1",
    "port": 8000,
    "backend_url": "http://127.0.0.1:8000",
    "started_at": "",
    "updated_at": "",
    "last_error": "",
}


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def load_sidecar_state() -> Dict[str, Any]:
    if not SIDECAR_STATE_FILE.exists():
        save_sidecar_state(DEFAULT_STATE.copy())

    try:
        loaded = json.loads(SIDECAR_STATE_FILE.read_text(encoding="utf-8"))
        if not isinstance(loaded, dict):
            raise TypeError("Sidecar state must be a JSON object.")
        return {**DEFAULT_STATE, **loaded}
    except (json.JSONDecodeError, OSError, TypeError):
        save_sidecar_state(DEFAULT_STATE.copy())
        return DEFAULT_STATE.copy()


def save_sidecar_state(state: Dict[str, Any]) -> None:
    SIDECAR_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        key: state.get(key, default)
        for key, default in DEFAULT_STATE.items()
    }
    payload["updated_at"] = _now()
    state.update(payload)
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=SIDECAR_DIR, delete=False
    ) as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")
        temporary_path = Path(handle.name)
    temporary_path.replace(SIDECAR_STATE_FILE)


def _validate_endpoint(host: str, port: int) -> tuple[str, int]:
    clean_host = str(host).strip()
    if clean_host not in {"127.0.0.1", "localhost", "::1"}:
        raise ValueError("Backend sidecar must bind to a loopback host.")
    clean_port = int(port)
    if not 1 <= clean_port <= 65535:
        raise ValueError("Backend sidecar port must be between 1 and 65535.")
    return clean_host, clean_port


def is_port_open(host: str = "127.0.0.1", port: int = 8000, timeout: float = 0.5) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (OSError, TypeError, ValueError):
        return False


def is_pid_running(pid: Optional[int]) -> bool:
    if not pid:
        return False
    try:
        os.kill(int(pid), 0)
        return True
    except (OSError, TypeError, ValueError):
        return False


def is_managed_backend_process(pid: Optional[int]) -> bool:
    """Return true only when a live PID matches this sidecar's uvicorn command."""
    if not is_pid_running(pid):
        return False
    proc_cmdline = Path(f"/proc/{int(pid)}/cmdline")
    if not proc_cmdline.exists():
        return False
    try:
        command = proc_cmdline.read_bytes().replace(b"\0", b" ").decode(errors="ignore")
    except OSError:
        return False
    return "uvicorn" in command and "backend.api_main:app" in command


def get_sidecar_status() -> Dict[str, Any]:
    state = load_sidecar_state()
    try:
        host, port = _validate_endpoint(
            state.get("host", "127.0.0.1"), state.get("port", 8000)
        )
    except (TypeError, ValueError):
        host, port = "127.0.0.1", 8000
        state.update(
            {"host": host, "port": port, "backend_url": f"http://{host}:{port}"}
        )
    pid_running = is_pid_running(state.get("pid"))
    managed_process = is_managed_backend_process(state.get("pid"))
    port_open = is_port_open(host=host, port=port)

    if managed_process and port_open:
        status = "running"
    elif port_open:
        status = "external_backend_detected"
    elif pid_running:
        status = "starting_or_unhealthy"
    else:
        status = "stopped"

    state["status"] = status
    save_sidecar_state(state)

    return {
        **state,
        "pid_running": pid_running,
        "managed_process": managed_process,
        "port_open": port_open,
        "log_file": str(SIDECAR_LOG_FILE),
        "state_file": str(SIDECAR_STATE_FILE),
    }


def start_backend_sidecar(host: str = "127.0.0.1", port: int = 8000) -> Dict[str, Any]:
    host, port = _validate_endpoint(host, port)
    current = get_sidecar_status()
    requested_port_open = is_port_open(host, port)
    if current.get("managed_process") or requested_port_open:
        current["status"] = "already_running"
        current["last_error"] = ""
        if requested_port_open:
            current.update(
                {"host": host, "port": port, "backend_url": f"http://{host}:{port}"}
            )
        save_sidecar_state(current)
        return current

    command = [
        sys.executable,
        "-m",
        "uvicorn",
        "backend.api_main:app",
        "--host",
        host,
        "--port",
        str(port),
    ]

    try:
        SIDECAR_DIR.mkdir(parents=True, exist_ok=True)
        with SIDECAR_LOG_FILE.open("a", encoding="utf-8") as log_file:
            process = subprocess.Popen(
                command,
                cwd=PROJECT_ROOT,
                stdout=log_file,
                stderr=log_file,
                stdin=subprocess.DEVNULL,
                start_new_session=True,
            )
        state = load_sidecar_state()
        state.update(
            {
                "status": "starting",
                "pid": process.pid,
                "host": host,
                "port": port,
                "backend_url": f"http://{host}:{port}",
                "started_at": _now(),
                "last_error": "",
            }
        )
        save_sidecar_state(state)
        return {
            **state,
            "pid_running": is_pid_running(process.pid),
            "port_open": is_port_open(host, port),
            "log_file": str(SIDECAR_LOG_FILE),
            "state_file": str(SIDECAR_STATE_FILE),
        }
    except Exception as error:
        state = load_sidecar_state()
        state["status"] = "failed"
        state["last_error"] = str(error)
        save_sidecar_state(state)
        return get_sidecar_status()


def stop_backend_sidecar() -> Dict[str, Any]:
    state = load_sidecar_state()
    pid = state.get("pid")
    if not pid:
        state["status"] = "stopped"
        save_sidecar_state(state)
        return get_sidecar_status()

    try:
        if is_pid_running(pid) and not is_managed_backend_process(pid):
            state["status"] = "stop_blocked"
            state["last_error"] = (
                "Stored PID is not a verified O.R.I.O.N. backend process."
            )
            save_sidecar_state(state)
            result = get_sidecar_status()
            return {
                **result,
                "status": "stop_blocked",
                "last_error": state["last_error"],
            }
        if int(pid) == os.getpid():
            state["status"] = "stop_blocked"
            state["last_error"] = "The backend cannot stop itself through its own API response."
            save_sidecar_state(state)
            return {
                **get_sidecar_status(),
                "status": "stop_blocked",
                "last_error": state["last_error"],
            }
        if is_pid_running(pid):
            os.killpg(os.getpgid(int(pid)), signal.SIGTERM)
        state["status"] = "stopped"
        state["pid"] = None
        state["last_error"] = ""
        save_sidecar_state(state)
    except Exception as error:
        state["status"] = "stop_failed"
        state["last_error"] = str(error)
        save_sidecar_state(state)
    return get_sidecar_status()


def restart_backend_sidecar() -> Dict[str, Any]:
    stopped = stop_backend_sidecar()
    if stopped.get("status") == "stop_blocked":
        return stopped
    return start_backend_sidecar()


def render_sidecar_report(status: Optional[Dict[str, Any]] = None) -> str:
    status = status or get_sidecar_status()
    return f"""# O.R.I.O.N. Backend Sidecar Report

## Status

- Status: {status['status']}
- PID: {status.get('pid')}
- PID Running: {status['pid_running']}
- Port Open: {status['port_open']}
- Backend URL: {status['backend_url']}
- Started At: {status.get('started_at') or 'Not started'}
- Updated At: {status.get('updated_at')}

## Files

- State File: {status['state_file']}
- Log File: {status['log_file']}

## Last Error

{status.get('last_error') or 'No error recorded.'}

## Safety

The backend sidecar starts only the local FastAPI backend at 127.0.0.1.
Sensitive O.R.I.O.N. actions remain approval-gated.
"""
