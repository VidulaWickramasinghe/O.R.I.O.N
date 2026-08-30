#!/usr/bin/env bash
set -e
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"
if [ ! -d ".venv" ]; then
  echo "Missing .venv. Run ./scripts/setup_orion.sh first."
  exit 1
fi
source .venv/bin/activate

echo "======================================"
echo " O.R.I.O.N. Aurora OS Desktop Launcher"
echo "======================================"
echo ""
echo "Starting Aurora OS desktop shell..."
echo "Tauri owns backend launch, health recovery, and shutdown."
cd frontend
npm run desktop:dev
