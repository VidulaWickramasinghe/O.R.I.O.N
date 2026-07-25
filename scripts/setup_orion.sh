#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

command -v python3 >/dev/null || { echo "Python 3 is required." >&2; exit 1; }
command -v npm >/dev/null || { echo "npm is required. Install Node.js LTS." >&2; exit 1; }

echo "[1/5] Preparing Python virtual environment"
if [[ ! -d .venv ]]; then python3 -m venv .venv; fi
# shellcheck disable=SC1091
source .venv/bin/activate

echo "[2/5] Installing Python dependencies"
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

echo "[3/5] Installing Aurora OS dependencies"
npm ci --prefix frontend

echo "[4/5] Preparing local environment"
if [[ ! -f backend/.env ]]; then
  cp backend/.env.example backend/.env
  echo "Created backend/.env. Add your OPENAI_API_KEY before using AI features."
fi

echo "[5/5] Running compile diagnostics"
./scripts/test_backend.sh

echo "Setup complete. Run ./scripts/doctor.sh, then ./scripts/start_orion.sh."
