"""Regression coverage for evidence-backed CI and release gating."""

from backend.tests import TEST_DATA_DIR as _TEST_DATA_DIR

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from core import release_candidate, release_verification
from core.release_evidence import REQUIRED_CI_CHECKS, validate_release_evidence
from scripts.create_release_evidence import create_evidence


class ReleaseEvidenceTests(unittest.TestCase):
    def test_release_report_evidence_lists_exact_run_commit_and_artifact_hash(self) -> None:
        digest = "d" * 64
        rendered = release_candidate.render_ci_evidence_summary(
            {
                "run_url": "https://github.com/example/O.R.I.O.N/actions/runs/12345",
                "commit_sha": "a" * 40,
                "artifacts": [{"name": "ORION.dmg", "sha256": digest}],
            }
        )
        self.assertIn("actions/runs/12345", rendered)
        self.assertIn("a" * 40, rendered)
        self.assertIn("ORION.dmg", rendered)
        self.assertIn(digest, rendered)

    def test_evidence_contains_exact_run_and_artifact_hashes(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            artifact_root = root / "artifacts"
            artifact_root.mkdir()
            artifact = artifact_root / "ORION.dmg"
            artifact.write_bytes(b"signed-package-fixture")
            evidence_path = root / "evidence.json"
            create_evidence(
                checks=list(REQUIRED_CI_CHECKS),
                artifact_root=artifact_root,
                output=evidence_path,
                run_url="https://github.com/example/O.R.I.O.N/actions/runs/12345",
                commit_sha="a" * 40,
            )

            evidence = validate_release_evidence(evidence_path)

        self.assertEqual(evidence["commit_sha"], "a" * 40)
        self.assertEqual(evidence["artifacts"][0]["name"], "ORION.dmg")
        self.assertRegex(evidence["artifacts"][0]["sha256"], r"^[0-9a-f]{64}$")

    def test_one_failed_required_check_invalidates_release_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "evidence.json"
            payload = {
                "schema_version": 1,
                "run_url": "https://github.com/example/O.R.I.O.N/actions/runs/12345",
                "commit_sha": "b" * 40,
                "checks": [
                    {
                        "name": name,
                        "status": "failed" if name == "api-security" else "passed",
                    }
                    for name in REQUIRED_CI_CHECKS
                ],
                "artifacts": [{"name": "ORION.dmg", "sha256": "c" * 64}],
            }
            path.write_text(json.dumps(payload), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "not passed.*api-security"):
                validate_release_evidence(path)

    def test_required_gate_failure_cannot_be_reported_as_passed(self) -> None:
        verification = {"status": "passed", "checks": []}
        with patch.object(
            release_verification,
            "_run_script",
            return_value={"ok": False, "returncode": 1, "command": "quality_gate"},
        ):
            result = release_verification.run_quality_gate_snapshot(
                run_builds=True, verification=verification
            )
        self.assertEqual(result["status"], "failed")
        self.assertFalse(result["required_gate"]["ok"])

    def test_release_package_fails_before_writing_without_valid_ci_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir, patch.object(
            release_candidate, "DB_PATH", Path(temp_dir) / "release.sqlite"
        ), patch.object(
            release_candidate, "get_freeze_state", return_value={"frozen": True}
        ), patch.object(
            release_candidate,
            "validate_release_evidence",
            side_effect=ValueError("missing CI evidence"),
        ), patch.object(release_candidate, "_write_artifact") as write:
            with self.assertRaisesRegex(ValueError, "missing CI evidence"):
                release_candidate.generate_release_candidate_package.__wrapped__()
        write.assert_not_called()

    def test_workflow_requires_every_release_gate_before_evidence(self) -> None:
        workflow = (
            Path(__file__).resolve().parents[2]
            / ".github"
            / "workflows"
            / "required-release-gates.yml"
        ).read_text(encoding="utf-8")
        for check in REQUIRED_CI_CHECKS:
            self.assertIn(check, workflow)
        self.assertIn("needs:", workflow)
        self.assertIn("create_release_evidence.py", workflow)


if __name__ == "__main__":
    unittest.main()
