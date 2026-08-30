#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_ROOT="${ORION_APP_ROOT:-$PROJECT_ROOT/frontend/src-tauri/target/release/bundle/macos/O.R.I.O.N. Aurora OS.app}"
BACKEND_BINARY="$APP_ROOT/Contents/MacOS/orion-backend"

if [ ! -x "$BACKEND_BINARY" ]; then
  echo "Packaged backend not found: $BACKEND_BINARY"
  exit 1
fi

SMOKE_ROOT="$(mktemp -d)"
SMOKE_TOKEN="orion-smoke-token-00000000000000000000000000000000"
SMOKE_PORT="18765"
SMOKE_PID=""

cleanup() {
  if [ -n "$SMOKE_PID" ]; then
    kill "$SMOKE_PID" 2>/dev/null || true
    wait "$SMOKE_PID" 2>/dev/null || true
  fi
  rm -rf "$SMOKE_ROOT"
}
trap cleanup EXIT

ORION_DATA_DIR="$SMOKE_ROOT/data" \
ORION_CAPABILITY_TOKEN="$SMOKE_TOKEN" \
ORION_BACKEND_PORT="$SMOKE_PORT" \
"$BACKEND_BINARY" &
SMOKE_PID="$!"

BACKEND_READY="false"
for _ in $(seq 1 240); do
  if curl --silent --fail --max-time 1 "http://127.0.0.1:$SMOKE_PORT/api/health" >/dev/null; then
    BACKEND_READY="true"
    break
  fi
  sleep 0.25
done
if [ "$BACKEND_READY" != "true" ]; then
  echo "Packaged backend did not become ready within 60 seconds."
  exit 1
fi

UNAUTHORIZED_STATUS="$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 5 "http://127.0.0.1:$SMOKE_PORT/api/approvals")"
AUTHORIZED_STATUS="$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 5 -H "Authorization: Bearer $SMOKE_TOKEN" "http://127.0.0.1:$SMOKE_PORT/api/approvals")"

test "$UNAUTHORIZED_STATUS" = "401"
test "$AUTHORIZED_STATUS" = "200"
test -d "$SMOKE_ROOT/data"
echo "Packaged backend smoke test passed without repository Python or repository data."
