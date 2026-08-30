#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_root"
python_bin="${ORION_PYTHON_BIN:-python3}"
PYTHONPATH=backend "$python_bin" -m unittest \
  backend.tests.test_upgrade_safety \
  backend.tests.test_audit_events.AuditSchemaMigrationTests \
  backend.tests.test_persistence_recovery \
  backend.tests.test_release_gates.ReleaseEvidenceTests
