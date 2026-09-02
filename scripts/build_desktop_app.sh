#!/usr/bin/env bash
set -e
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"
cd frontend
echo "Building authenticated backend sidecar, Aurora OS static export, and desktop package..."
case "$(uname -s)" in
  Darwin) platform="macos"; bundles="app,dmg" ;;
  Linux) platform="linux"; bundles="deb,appimage" ;;
  *) platform="windows"; bundles="msi,nsis" ;;
esac
npm run desktop:build -- --config "src-tauri/tauri.${platform}.conf.json" --bundles "$bundles"
echo ""
echo "Desktop build complete."
echo "Check:"
echo "frontend/src-tauri/target/release/bundle/"
