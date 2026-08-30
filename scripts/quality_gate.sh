#!/usr/bin/env bash
set -uo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_root"

report_dir="${ORION_QUALITY_GATE_DIR:-$project_root/backend/data/quality_gate_reports}"
mkdir -p "$report_dir"
timestamp="$(date -u +%Y%m%d_%H%M%S)_$$"
report="$report_dir/orion_quality_gate_${timestamp}.md"
temporary_report="$(mktemp "$report_dir/.quality-gate.XXXXXX")"
trap 'rm -f "$temporary_report"' EXIT

run_url="${ORION_CI_RUN_URL:-local-only; not valid RC evidence}"
commit_sha="${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo unavailable)}"
printf '# O.R.I.O.N. Required Release Gate\n\nGenerated: %s\nRun evidence: %s\nCommit: %s\n\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$run_url" "$commit_sha" >"$temporary_report"

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
run_step "API and security integration tests" ./scripts/test_api_security.sh
run_step "Persistence migration tests" ./scripts/test_migrations.sh
run_step "Frontend lint" npm --prefix frontend run lint
run_step "Frontend typecheck" npm --prefix frontend run typecheck
run_step "Frontend production build" npm --prefix frontend run build
run_step "Frontend cache/network integration" npm --prefix frontend run test:server-state
run_step "Aurora task-navigation UX regression" npm --prefix frontend run test:ux
run_step "Tauri tests and package build" env ORION_TAURI_PACKAGE=1 ./scripts/test_tauri.sh
run_step "Dependency vulnerability audits" ./scripts/dependency_audit.sh
run_step "Tracked artifact and secret scan" python3 scripts/check_tracked_artifacts.py

printf '## Artifact SHA-256\n\n```text\n' >>"$temporary_report"
artifact_count=0
while IFS= read -r artifact; do
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$artifact" >>"$temporary_report"
  else
    sha256sum "$artifact" >>"$temporary_report"
  fi
  artifact_count=$((artifact_count + 1))
done < <(find frontend/src-tauri/target/release/bundle -type f 2>/dev/null | sort)
if (( artifact_count == 0 )); then
  printf 'No packaged artifacts found.\n' >>"$temporary_report"
  failed=1
fi
printf '```\n\n' >>"$temporary_report"

if (( failed )); then
  printf '## Final result\n\nFailed. This run cannot certify a release candidate.\n' >>"$temporary_report"
else
  printf '## Final result\n\nPassed. CI evidence is still required for release-candidate generation.\n' >>"$temporary_report"
fi

mv "$temporary_report" "$report"
trap - EXIT
echo "Quality Gate report: $report"
exit "$failed"
