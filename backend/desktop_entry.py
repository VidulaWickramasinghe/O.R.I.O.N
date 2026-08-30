"""Frozen desktop entry point for the Aurora OS backend sidecar."""

from __future__ import annotations

import os
import threading
import time

import uvicorn

from api_main import app


def _watch_supervisor_process() -> None:
    """Stop the frozen child if its Tauri/PyInstaller supervisor disappears."""
    supervisor_pid = os.getppid()
    while True:
        time.sleep(1)
        if os.getppid() != supervisor_pid:
            os._exit(0)


def main() -> None:
    threading.Thread(
        target=_watch_supervisor_process,
        name="orion-supervisor-watchdog",
        daemon=True,
    ).start()
    port = int(os.getenv("ORION_BACKEND_PORT", "8000"))
    if port < 1024 or port > 65535:
        raise ValueError("ORION_BACKEND_PORT must be between 1024 and 65535.")
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        access_log=False,
        log_level=os.getenv("ORION_LOG_LEVEL", "warning"),
    )


if __name__ == "__main__":
    main()
