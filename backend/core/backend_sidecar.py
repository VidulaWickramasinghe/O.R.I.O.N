import json
import os
import signal
import socket
import subprocess
import sys
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
        return json.loads(SIDECAR_STATE_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        save_sidecar_state(DEFAULT_STATE.copy())
        return DEFAULT_STATE.copy()


def save_sidecar_state(state: Dict[str, Any]) -> None:
    state["updated_at"] = _now()
    SIDECAR_STATE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")


def is_port_open(host: str = "127.0.0.1", port: int = 8000, timeout: float = 0.5) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def is_pid_running(pid: Optional[int]) -> bool:
    if not pid:
        return False
    try:
        os.kill(int(pid), 0)
        return True
    except OSError:
        return False


def get_sidecar_status() -> Dict[str, Any]:
    state = load_sidecar_state()
    pid_running = is_pid_running(state.get("pid"))
    port_open = is_port_open(
        host=state.get("host", "127.0.0.1"),
        port=int(state.get("port", 8000)),
    )

    if pid_running and port_open:
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
        "port_open": port_open,
        "log_file": str(SIDECAR_LOG_FILE),
        "state_file": str(SIDECAR_STATE_FILE),
    }


def start_backend_sidecar(host: str = "127.0.0.1", port: int = 8000) -> Dict[str, Any]:
    current = get_sidecar_status()
    if current["port_open"]:
        current["status"] = "already_running"
        current["last_error"] = ""
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
        log_file = SIDECAR_LOG_FILE.open("a", encoding="utf-8")
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
    stop_backend_sidecar()
    return start_backend_sidecar()


def render_sidecar_report() -> str:
    status = get_sidecar_status()
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
