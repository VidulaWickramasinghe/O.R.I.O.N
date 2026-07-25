#!/usr/bin/env bash
set -euo pipefail
base="${ORION_API_BASE:-http://127.0.0.1:8000}"
base="${base%/}"
response_file="$(mktemp "${TMPDIR:-/tmp}/orion-api-verify.XXXXXX")"
trap 'rm -f "$response_file"' EXIT

for path in /api/health /api/status /api/mission /api/dashboard/intelligence /api/plugins /api/tools/permissions /api/tools/audit /api/security/policy /api/release-candidate/status /api/frontend/refactor /api/sidecar/status; do
  curl --connect-timeout 3 --max-time 15 --fail --silent --show-error \
    "$base$path" >"$response_file"
  python -m json.tool "$response_file" >/dev/null
  echo "OK $path"
done
