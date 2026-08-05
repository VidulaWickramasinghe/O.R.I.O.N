#!/usr/bin/env bash
set -uo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_root"

report_dir="$project_root/backend/data/quality_gate_reports"
mkdir -p "$report_dir"
timestamp="$(date -u +%Y%m%d_%H%M%S)_$$"
report="$report_dir/orion_quality_gate_${timestamp}.md"
temporary_report="$(mktemp "$report_dir/.quality-gate.XXXXXX")"
trap 'rm -f "$temporary_report"' EXIT

printf '# O.R.I.O.N. v6.5 Quality Gate Report\n\nGenerated: %s\n\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >"$temporary_report"

failed=0
run_step() {
  local title="$1"
  shift
  printf '## %s\n\n```text\n' "$title" >>"$temporary_report"
  if "$@" >>"$temporary_report" 2>&1; then
    printf '```\n\nResult: Passed\n\n' >>"$temporary_report"
    echo "PASS: $title"
  else
    printf '```\n\nResult: Failed\n\n' >>"$temporary_report"
    echo "FAIL: $title" >&2
    failed=1
  fi
}

run_step "Backend compile and regression tests" ./scripts/test_backend.sh
run_step "Frontend production build" ./scripts/test_frontend.sh

api_base="${ORION_API_BASE:-http://127.0.0.1:8000}"
api_base="${api_base%/}"
if curl --connect-timeout 2 --max-time 5 --fail --silent \
  "$api_base/api/health" >/dev/null; then
  run_step "Live API verification" ./scripts/verify_api.sh
else
  printf '## Live API verification\n\nResult: Skipped\n\nReason: backend is not reachable.\n\n' \
    >>"$temporary_report"
fi

if (( failed )); then
  printf '## Final result\n\nFailed. Review the checks above.\n' >>"$temporary_report"
else
  printf '## Final result\n\nPassed.\n' >>"$temporary_report"
fi

mv "$temporary_report" "$report"
trap - EXIT
echo "Quality Gate report: $report"
exit "$failed"
