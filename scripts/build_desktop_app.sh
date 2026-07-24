#!/usr/bin/env bash
set -e
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"
echo "Building Aurora OS frontend static export..."
cd frontend
npm run build
echo "Building O.R.I.O.N. desktop app..."
npm run desktop:build
echo ""
echo "Desktop build complete."
echo "Check:"
echo "frontend/src-tauri/target/release/bundle/"
