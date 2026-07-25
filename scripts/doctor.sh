#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

if [[ ! -x .venv/bin/python ]]; then
  echo "Missing .venv. Run ./scripts/setup_orion.sh first." >&2
  exit 1
fi

PYTHONPATH=backend .venv/bin/python - <<'PY'
from core.system_doctor import render_system_doctor_report
print(render_system_doctor_report())
PY
