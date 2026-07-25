#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

if [[ ! -x .venv/bin/uvicorn ]]; then
  echo "Backend dependencies are missing. Run ./scripts/setup_orion.sh first." >&2
  exit 1
fi
if [[ ! -d frontend/node_modules ]]; then
  echo "Frontend dependencies are missing. Run ./scripts/setup_orion.sh first." >&2
  exit 1
fi

backend_pid=""
frontend_pid=""
cleanup() {
  trap - EXIT INT TERM
  [[ -n "$backend_pid" ]] && kill "$backend_pid" 2>/dev/null || true
  [[ -n "$frontend_pid" ]] && kill "$frontend_pid" 2>/dev/null || true
  wait "$backend_pid" "$frontend_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

.venv/bin/uvicorn backend.api_main:app --host 127.0.0.1 --port 8000 &
backend_pid=$!
npm --prefix frontend run dev &
frontend_pid=$!

echo "O.R.I.O.N. backend: http://127.0.0.1:8000"
echo "Aurora OS frontend: http://localhost:3000"
echo "Press CTRL+C to stop both services."
wait -n "$backend_pid" "$frontend_pid"
