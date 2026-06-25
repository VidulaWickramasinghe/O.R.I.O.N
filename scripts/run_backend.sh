#!/usr/bin/env bash

cd "$(dirname "$0")/.."

source .venv/bin/activate

echo "Starting O.R.I.O.N. Mission Control Backend..."
uvicorn backend.api_main:app --reload --host 127.0.0.1 --port 8000
