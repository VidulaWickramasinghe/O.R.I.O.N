# Desktop platform support

`platform-support.json` is the source of truth for desktop support claims. A platform is not advertised merely because Tauri can target it.

| Platform | Product status | Installer targets | Promotion evidence |
| --- | --- | --- | --- |
| macOS | Supported primary target | `.app`, `.dmg` | Rust supervisor tests, packaged sidecar authentication, prior-schema upgrade, Developer ID signature, and notarization are mandatory for production artifacts. |
| Windows | Preview; not advertised | MSI, NSIS | The packaging matrix must pass, then a signed installed-GUI lifecycle and prior-release in-place upgrade must be recorded before promotion. |
| Linux | Preview; not advertised | Debian package, AppImage | The packaging matrix must pass, then installed-GUI lifecycle, distribution coverage, signature policy, and prior-release in-place upgrade must be recorded before promotion. |

## Local macOS build

```bash
cd ~/O.R.I.O.N/
./scripts/build_desktop_app.sh
python3 scripts/verify_desktop_bundle.py \
  --platform macos \
  --bundle-root frontend/src-tauri/target/release/bundle \
  --output /tmp/orion-macos-evidence.json
```

This local command validates layout, backend isolation, authentication, and a prior-schema upgrade. It does not turn an unsigned or ad-hoc-signed build into a production artifact.

## Production macOS release

The `macOS production package` workflow fails closed unless the Developer ID certificate, signing identity, Apple account, app-specific password, and team ID are available as GitHub secrets. Its verifier rejects ad-hoc signatures and requires a stapled notarization ticket.

## Preview matrices

The `Desktop platform preview matrix` builds explicit bundles on fresh macOS, Windows, and Ubuntu runners. Each runner extracts the packaged backend from an installer, starts it without repository Python, verifies local API authentication, and upgrades a sanitized prior-schema fixture without losing its row. Rust supervisor lifecycle tests run on every platform.

Windows and Linux remain previews even after this matrix passes. Promotion requires the blockers in `platform-support.json` to be removed through recorded release evidence; documentation must not imply general availability before then.
