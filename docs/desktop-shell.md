# O.R.I.O.N. v3.5 — Packaged Desktop App Shell

## Overview

O.R.I.O.N. v3.5 adds a Tauri desktop shell for Aurora OS. The desktop shell packages the Aurora OS frontend as a native desktop window and connects to the local FastAPI backend.

## Architecture

```text
Tauri Desktop Window
↓
Aurora OS Static Frontend
↓
FastAPI Backend at 127.0.0.1:8000
↓
O.R.I.O.N. Tools, Memory, Missions, Plugins, and Developer Mode
```

## Development Run

```bash
./scripts/run_desktop_dev.sh
```

## Production Desktop Build

```bash
./scripts/build_desktop_app.sh
```

Generated bundles are located under:

```text
frontend/src-tauri/target/release/bundle/
```

## Safety

- The Tauri shell is a local desktop wrapper.
- Backend actions remain approval-gated.
- No unsafe third-party plugin execution is added.
- No broad filesystem permissions are granted to the frontend.
- Sensitive actions still route through O.R.I.O.N.’s Command Approval System.

## Current Limitation

The backend must be started locally before or with the desktop shell. Future versions may package the backend as a controlled sidecar.
