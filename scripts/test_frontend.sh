#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../frontend"
node --version
npm --version
npm run build
