#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_root"
python_bin="${ORION_PYTHON_BIN:-python3}"
PYTHONPATH=backend "$python_bin" -m unittest \
  backend.tests.test_api_authentication \
  backend.tests.test_approval_transactions \
  backend.tests.test_audit_events \
  backend.tests.test_browser_research_security \
  backend.tests.test_capability_gateway \
  backend.tests.test_workspace_security
