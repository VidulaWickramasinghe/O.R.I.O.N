#!/usr/bin/env bash
# Sourced by local launch/check commands. Never loads or prints credentials.
project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
python_bin="${ORION_PYTHON_BIN:-$project_root/.venv/bin/python}"
if [[ ! -x "$python_bin" ]]; then
  echo "Python environment missing. From ~/O.R.I.O.N run ./scripts/setup_orion.sh first." >&2
  exit 1
fi
cd "$project_root"
