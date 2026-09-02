"""Platform claims must match explicit package and release evidence."""

import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class PlatformSupportContractTests(unittest.TestCase):
    def test_only_macos_is_advertised_and_requires_release_security(self) -> None:
        support = json.loads((ROOT / "platform-support.json").read_text(encoding="utf-8"))
        platforms = support["platforms"]
        advertised = [key for key, value in platforms.items() if value["advertised"]]

        self.assertEqual(advertised, ["macos"])
        self.assertEqual(platforms["macos"]["status"], "supported")
        self.assertTrue(platforms["macos"]["productionSignatureRequired"])
        self.assertTrue(platforms["macos"]["notarizationRequired"])
        self.assertFalse(platforms["windows"]["advertised"])
        self.assertFalse(platforms["linux"]["advertised"])
        self.assertTrue(platforms["windows"]["promotionBlockers"])
        self.assertTrue(platforms["linux"]["promotionBlockers"])

    def test_each_platform_has_explicit_tauri_targets_and_ci_runner(self) -> None:
        support = json.loads((ROOT / "platform-support.json").read_text(encoding="utf-8"))
        workflow = (ROOT / ".github/workflows/desktop-platform-matrix.yml").read_text(encoding="utf-8")
        for platform, contract in support["platforms"].items():
            config = json.loads(
                (ROOT / f"frontend/src-tauri/tauri.{platform}.conf.json").read_text(encoding="utf-8")
            )
            self.assertEqual(config["bundle"]["targets"], contract["bundles"])
            self.assertIn(contract["runner"], workflow)
            self.assertIn(f"platform: {platform}", workflow)

    def test_base_tauri_config_does_not_force_ad_hoc_signing_or_all_targets(self) -> None:
        config = json.loads(
            (ROOT / "frontend/src-tauri/tauri.conf.json").read_text(encoding="utf-8")
        )
        self.assertNotEqual(config["bundle"]["targets"], "all")
        self.assertNotIn("signingIdentity", config["bundle"].get("macOS", {}))

    def test_macos_release_workflow_enforces_signature_and_notarization(self) -> None:
        workflow = (ROOT / ".github/workflows/macos-production-package.yml").read_text(encoding="utf-8")
        self.assertIn("--require-production-signature", workflow)
        self.assertIn("--require-notarization", workflow)
        self.assertIn("APPLE_SIGNING_IDENTITY", workflow)
        self.assertIn("APPLE_PASSWORD", workflow)


if __name__ == "__main__":
    unittest.main()
