#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_root"
command -v cargo-audit >/dev/null 2>&1 || { echo "cargo-audit is required." >&2; exit 1; }

if [[ -n "${ORION_PIP_AUDIT_BIN:-}" && -x "${ORION_PIP_AUDIT_BIN}" ]]; then
  pip_audit=("${ORION_PIP_AUDIT_BIN}")
elif command -v pip-audit >/dev/null 2>&1; then
  pip_audit=("$(command -v pip-audit)")
elif [[ -n "${ORION_PYTHON_BIN:-}" ]] && "$ORION_PYTHON_BIN" -m pip_audit --version >/dev/null 2>&1; then
  pip_audit=("$ORION_PYTHON_BIN" -m pip_audit)
else
  echo "pip-audit is required (set ORION_PIP_AUDIT_BIN or install it in ORION_PYTHON_BIN)." >&2
  exit 1
fi

"${pip_audit[@]}" --requirement requirements.txt
npm --prefix frontend audit --omit=dev --audit-level=high
cargo audit --file frontend/src-tauri/Cargo.lock
