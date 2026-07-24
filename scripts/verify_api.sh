#!/usr/bin/env bash
set -euo pipefail
base="${ORION_API_BASE:-http://127.0.0.1:8000}"
for path in /api/health /api/status /api/mission /api/dashboard/intelligence /api/plugins /api/tools/permissions /api/tools/audit /api/security/policy /api/release-candidate/status /api/frontend/refactor /api/sidecar/status; do curl -fsS "$base$path" >/dev/null; echo "OK $path"; done
