"""Release scanner tests for runtime artifacts and credentials."""

import importlib.util
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "check_tracked_artifacts.py"
SPEC = importlib.util.spec_from_file_location("check_tracked_artifacts", SCRIPT)
scanner = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(scanner)


class TrackedArtifactScannerTests(unittest.TestCase):
    def test_forbidden_runtime_and_archive_paths_are_rejected(self) -> None:
        self.assertIsNotNone(scanner.forbidden_path_reason("backend/data/orion.sqlite"))
        self.assertIsNotNone(scanner.forbidden_path_reason("frontendLatest.zip"))
        self.assertIsNone(
            scanner.forbidden_path_reason(
                "backend/tests/fixtures/sanitized_workspace/docs/guide.md"
            )
        )

    def test_secret_and_personal_path_content_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "leak.txt").write_text(
                "workspace=/Users/" + "example/private-project/\n"
                "credential=sk-" + "exampleExampleExample12345\n",
                encoding="utf-8",
            )
            violations = scanner.scan_repository(root, ["leak.txt"])

        self.assertTrue(any("personal macOS path" in item for item in violations))
        self.assertTrue(any("OpenAI-style key" in item for item in violations))

    def test_sanitized_fixture_passes(self) -> None:
        repository = Path(__file__).resolve().parents[2]
        relative = "backend/tests/fixtures/sanitized_workspace/docs/guide.md"
        self.assertEqual(scanner.scan_repository(repository, [relative]), [])


if __name__ == "__main__":
    unittest.main()
