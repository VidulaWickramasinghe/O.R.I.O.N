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
echo "[1/3] Checking backend port..."
if python - <<'PY'
import socket
try:
    socket.create_connection(("127.0.0.1", 8000), timeout=0.5).close()
    raise SystemExit(0)
except OSError:
    raise SystemExit(1)
PY
then
  echo "Backend already running at http://127.0.0.1:8000"
else
  echo "Backend not running. Starting sidecar..."
  python - <<'PY'
from backend.core.backend_sidecar import start_backend_sidecar
print(start_backend_sidecar())
PY
fi

echo ""
echo "[2/3] Waiting for backend..."
python - <<'PY'
import socket
import time
for _ in range(30):
    try:
        socket.create_connection(("127.0.0.1", 8000), timeout=0.5).close()
        print("Backend is online.")
        raise SystemExit(0)
    except OSError:
        time.sleep(0.5)
print("Backend did not start in time.")
raise SystemExit(1)
PY

echo ""
echo "[3/3] Starting Aurora OS desktop shell..."
cd frontend
npm run desktop:dev
