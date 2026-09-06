#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_root"
if [[ -z "${ORION_PYTHON:-}" && -n "${ORION_PYTHON_BIN:-}" ]]; then
  export ORION_PYTHON="$ORION_PYTHON_BIN"
fi
# Tauri validates externalBin even during cargo test. Build the real sidecar,
# never a placeholder, before invoking Cargo in a clean checkout.
npm --prefix frontend run desktop:prepare
cargo test --locked --manifest-path frontend/src-tauri/Cargo.toml
if [[ "${ORION_TAURI_PACKAGE:-0}" == "1" ]]; then
  case "$(uname -s)" in
    Darwin) platform="macos"; bundles="app,dmg" ;;
    Linux) platform="linux"; bundles="deb,appimage" ;;
    *) platform="windows"; bundles="msi,nsis" ;;
  esac
  npm --prefix frontend run desktop:build -- --config "src-tauri/tauri.${platform}.conf.json" --bundles "$bundles"
  if [[ "$platform" == "macos" ]]; then
    ./scripts/smoke_desktop_package.sh
    ./scripts/test_desktop_supervisor.sh
  fi
  package_evidence="$(mktemp)"
  python3 scripts/verify_desktop_bundle.py \
    --platform "$platform" \
    --bundle-root frontend/src-tauri/target/release/bundle \
    --output "$package_evidence"
  rm -f "$package_evidence"
fi
