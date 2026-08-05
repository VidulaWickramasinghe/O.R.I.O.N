#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -x ".venv/bin/python" ]; then
  PYTHON_BIN=".venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3)"
else
  echo "Python not found. Create the virtual environment first."
  exit 1
fi

echo "O.R.I.O.N. Backend Test Runner"

PYTHONPATH=backend "$PYTHON_BIN" -m compileall -q backend
echo "Backend compile check passed."

PYTHONPATH=backend "$PYTHON_BIN" -m unittest discover -s backend/tests -p "test_*.py"
echo "Backend regression tests passed."
