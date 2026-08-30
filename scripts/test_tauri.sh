#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_root"
if [[ -z "${ORION_PYTHON:-}" && -n "${ORION_PYTHON_BIN:-}" ]]; then
  export ORION_PYTHON="$ORION_PYTHON_BIN"
fi
cargo test --locked --manifest-path frontend/src-tauri/Cargo.toml
if [[ "${ORION_TAURI_PACKAGE:-0}" == "1" ]]; then
  npm --prefix frontend run desktop:build
  if [[ "$(uname -s)" == "Darwin" ]]; then
    ./scripts/smoke_desktop_package.sh
    ./scripts/test_desktop_supervisor.sh
  fi
fi
