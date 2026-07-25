#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../frontend"
node --version
npm --version
if [[ ! -x node_modules/.bin/next ]]; then
  echo "Missing frontend dependencies. Run npm ci from ~/O.R.I.O.N/frontend." >&2
  exit 1
fi
npm run build
