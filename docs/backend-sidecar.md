# O.R.I.O.N. v3.6 — Backend Sidecar + One-Click Desktop Launch

## Overview

v3.6 adds a local backend sidecar manager for O.R.I.O.N. The sidecar starts and monitors the FastAPI backend at:

```text
http://127.0.0.1:8000
```

## Main Launcher

```bash
./scripts/orion_desktop.sh
```

This script:

1. Checks whether the backend is already running.
2. Starts the backend sidecar if needed.
3. Waits for the backend port to become available.
4. Starts the Aurora OS Tauri desktop shell.

## Desktop Shortcut

Install the Linux desktop shortcut:

```bash
./scripts/install_linux_desktop_shortcut.sh
```

Then search for **O.R.I.O.N. Aurora OS** in your app launcher.

## Sidecar Files

```text
backend/data/sidecar/backend_sidecar_state.json
backend/data/sidecar/backend_sidecar.log
```

These are generated local state files and are intentionally ignored by git.

## API Endpoints

```text
GET  /api/sidecar/status
POST /api/sidecar/start
POST /api/sidecar/stop
POST /api/sidecar/restart
```

## Safety

The sidecar only manages the local FastAPI backend. It does not bypass O.R.I.O.N.'s Command Approval System, does not execute arbitrary commands, and keeps the backend bound to `127.0.0.1`.
