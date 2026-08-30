#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_ROOT="${ORION_APP_ROOT:-$PROJECT_ROOT/frontend/src-tauri/target/release/bundle/macos/O.R.I.O.N. Aurora OS.app}"
APP_BINARY="$APP_ROOT/Contents/MacOS/orion-aurora-os"
BACKEND_PATTERN="$APP_ROOT/Contents/MacOS/orion-backend"
APP_PID=""
LOG_FILE="$(mktemp /private/tmp/orion-supervisor.XXXXXX.log)"

cleanup() {
  if [ -n "$APP_PID" ]; then
    kill "$APP_PID" 2>/dev/null || true
    wait "$APP_PID" 2>/dev/null || true
  fi
  while read -r backend_pid; do
    if [ -n "$backend_pid" ]; then
      kill "$backend_pid" 2>/dev/null || true
    fi
  done < <(pgrep -f "$BACKEND_PATTERN" 2>/dev/null || true)
  rm -f "$LOG_FILE"
}
trap cleanup EXIT

if [ ! -x "$APP_BINARY" ]; then
  echo "Packaged app executable not found: $APP_BINARY"
  exit 1
fi

"$APP_BINARY" >"$LOG_FILE" 2>&1 &
APP_PID="$!"

wait_for_bootloader() {
  local excluded_pid="${1:-}"
  for _ in $(seq 1 240); do
    if ! kill -0 "$APP_PID" 2>/dev/null; then
      echo "Aurora OS exited before its backend became ready."
      return 1
    fi
    while read -r candidate; do
      if [ -n "$candidate" ] && [ "$candidate" != "$excluded_pid" ]; then
        if pgrep -P "$candidate" >/dev/null 2>&1; then
          echo "$candidate"
          return 0
        fi
      fi
    done < <(pgrep -P "$APP_PID" -f "$BACKEND_PATTERN" 2>/dev/null || true)
    sleep 0.25
  done
  return 1
}

FIRST_BACKEND="$(wait_for_bootloader)"
kill "$FIRST_BACKEND"
SECOND_BACKEND="$(wait_for_bootloader "$FIRST_BACKEND")"

test "$FIRST_BACKEND" != "$SECOND_BACKEND"
kill -0 "$APP_PID"
kill -0 "$SECOND_BACKEND"
echo "Desktop supervisor restarted the packaged backend exactly once after a crash."
