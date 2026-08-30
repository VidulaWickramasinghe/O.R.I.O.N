#!/usr/bin/env bash
set -e
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"
cd frontend
echo "Building authenticated backend sidecar, Aurora OS static export, and desktop package..."
npm run desktop:build
echo ""
echo "Desktop build complete."
echo "Check:"
echo "frontend/src-tauri/target/release/bundle/"
