#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/local_python.sh"
exec "$python_bin" scripts/local_web.py frontend "$@"
