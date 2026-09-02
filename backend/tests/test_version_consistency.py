"""Active version surfaces must resolve to the canonical release manifest."""

from __future__ import annotations

import json
import subprocess
import sys
import unittest
from pathlib import Path

import api_main
from core.version import VERSION, VERSION_LABEL


ROOT = Path(__file__).resolve().parents[2]


class VersionConsistencyTests(unittest.TestCase):
    def test_backend_and_api_surfaces_use_manifest_version(self) -> None:
        manifest = json.loads(
            (ROOT / "release-manifest.json").read_text(encoding="utf-8")
        )
        expected = manifest["version"]
        self.assertEqual(VERSION, expected)
        self.assertEqual(VERSION_LABEL, f"v{expected}")
        self.assertEqual(api_main.app.version, expected)
        self.assertEqual(api_main.root()["version"], expected)
        self.assertEqual(api_main.status().version, expected)
        self.assertEqual(api_main.health()["version"], expected)

    def test_generated_version_surfaces_are_current(self) -> None:
        result = subprocess.run(
            [sys.executable, "scripts/sync_release_manifest.py", "--check"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_readme_distinguishes_current_and_historical_versions(self) -> None:
        manifest = json.loads(
            (ROOT / "release-manifest.json").read_text(encoding="utf-8")
        )
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn(
            f"active product version is **O.R.I.O.N. v{manifest['version']}**",
            readme,
        )
        self.assertIn("Evidence-based capability matrix", readme)
        self.assertIn("**COMPLETE**", readme)
        self.assertIn("**PARTIAL**", readme)
        self.assertIn("**PLANNED**", readme)


if __name__ == "__main__":
    unittest.main()
