#!/usr/bin/env bash

cd "$(dirname "$0")/.."

source .venv/bin/activate

echo "Starting O.R.I.O.N. Terminal Mode..."
python backend/main.py
