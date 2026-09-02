# O.R.I.O.N. versioning

[`release-manifest.json`](../release-manifest.json) is the only editable source for
the active O.R.I.O.N. product version. It identifies the product, Aurora OS
interface, semantic version, channel, and release name.

Run the synchronizer after changing the manifest:

```bash
cd ~/O.R.I.O.N
python3 scripts/sync_release_manifest.py
```

The synchronizer updates and verifies:

- frontend package and lockfile versions;
- Tauri configuration;
- Rust package and lockfile versions;
- the generated backend version module;
- the generated Aurora UI build module.

Use `python3 scripts/sync_release_manifest.py --check` in local validation or CI.
The command exits non-zero if any generated surface differs from the manifest.

Historical release identifiers in the changelog, archived release reports, and
legacy governance workflows remain unchanged because they identify the release
that produced that evidence. They must not be used as the active API, desktop,
or UI version.
