#!/usr/bin/env bash
set -e
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"
if [ ! -d ".venv" ]; then
  echo "Missing .venv. Run ./scripts/setup_orion.sh first."
  exit 1
fi
source .venv/bin/activate
echo "Starting O.R.I.O.N. backend..."
uvicorn backend.api_main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!
cleanup() {
  echo ""
  echo "Stopping O.R.I.O.N. backend..."
  kill "$BACKEND_PID" 2>/dev/null || true
}
trap cleanup EXIT
echo "Starting Aurora OS desktop shell..."
cd frontend
npm run desktop:dev
