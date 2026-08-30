# O.R.I.O.N. Backend Supervisor

## Overview

The packaged desktop application bundles the FastAPI backend as a Tauri sidecar. The Rust supervisor owns the live child-process handle, generates the per-launch API capability token, selects a loopback port, monitors health, performs one bounded crash restart, and terminates the child during application shutdown.

```text
http://127.0.0.1:<per-launch-port>
```

## Main Launcher

```bash
./scripts/orion_desktop.sh
```

This script starts Tauri development mode. Tauri starts and supervises the backend; Python never starts, stops, signals, or restarts itself.

## Desktop Shortcut

Install the Linux desktop shortcut:

```bash
./scripts/install_linux_desktop_shortcut.sh
```

Then search for **O.R.I.O.N. Aurora OS** in your app launcher.

## Status interfaces

```text
GET  /api/sidecar/status
Tauri command: get_backend_supervisor_status
```

## Safety

There are no backend lifecycle mutation endpoints or agent tools. The Rust supervisor retains the exact `CommandChild`; it does not trust PID files, `/proc`, or platform-specific signal conventions. A stale process identifier therefore cannot terminate an unrelated process.
