"""Read-only compatibility status for the Tauri-owned backend process.

Process launch, health recovery, and shutdown belong exclusively to the Rust
supervisor. The backend deliberately has no PID, signal, or subprocess control.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def get_sidecar_status() -> Dict[str, Any]:
    port = int(os.getenv("ORION_BACKEND_PORT", "8000"))
    packaged = bool(os.getenv("ORION_CAPABILITY_TOKEN", "").strip())
    return {
        "managed_by": "Tauri Rust Supervisor",
        "status": "running_under_tauri" if packaged else "development_backend",
        "pid": None,
        "host": "127.0.0.1",
        "port": port,
        "backend_url": f"http://127.0.0.1:{port}",
        "started_at": "",
        "updated_at": _now(),
        "last_error": "",
        "pid_running": packaged,
        "managed_process": packaged,
        "port_open": True,
        "log_file": "",
        "state_file": "",
        "supervisor_owned": packaged,
    }


def render_sidecar_report(status: Optional[Dict[str, Any]] = None) -> str:
    status = status or get_sidecar_status()
    return f"""# O.R.I.O.N. Backend Supervisor

- Owner: {status['managed_by']}
- Status: {status['status']}
- Backend URL: {status['backend_url']}
- Supervisor Owned: {status['supervisor_owned']}
- Updated: {status['updated_at']}

The backend cannot start, stop, signal, or restart itself. Tauri retains the
only live child-process handle and performs generation-safe health recovery.
"""
