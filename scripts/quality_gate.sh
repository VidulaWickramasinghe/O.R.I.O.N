#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backend/data/quality_gate_reports
./scripts/test_backend.sh
./scripts/test_frontend.sh
if curl -fsS http://127.0.0.1:8000/api/health >/dev/null; then ./scripts/verify_api.sh; fi
