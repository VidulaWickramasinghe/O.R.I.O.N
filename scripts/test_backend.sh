#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo 'O.R.I.O.N. Backend Test Runner'
python -m py_compile backend/api_main.py backend/main.py backend/voice_main.py backend/wake_main.py backend/core/*.py backend/tools/*.py backend/voice/*.py
echo 'Backend compile check passed.'
