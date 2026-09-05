"""Security regression tests for trusted workspace and knowledge scopes."""

from backend.tests import TEST_DATA_DIR as _TEST_DATA_DIR

import tempfile
import unittest
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import patch

from core import capability_gateway, knowledge_base, workspace_manager
from core.capability_gateway import CapabilityDeniedError


@contextmanager
def allowed_capability(name: str):
    with patch.object(
        capability_gateway, "_policy_snapshot", return_value=("security-test", set())
    ), patch.object(
        capability_gateway,
        "_plugin_decision",
        return_value=(True, "allowed", "medium", "test"),
    ), patch.object(capability_gateway, "_audit"):
        with capability_gateway.authorized(name, capability_gateway.test_context(name)):
            yield


class WorkspacePathSyntaxTests(unittest.TestCase):
    def test_cross_platform_absolute_and_traversal_forms_are_rejected(self) -> None:
        unsafe_paths = (
            "/etc/passwd",
            "../secret.txt",
            "safe/../../secret.txt",
            r"..\secret.txt",
            r"C:\Users\alice\secret.txt",  # scanner: allow-secret
            r"C:relative-drive-path.txt",
            r"\\server\share\secret.txt",
        )
        for candidate in unsafe_paths:
            with self.subTest(candidate=candidate), self.assertRaises(PermissionError):
                workspace_manager.validate_relative_workspace_path(candidate)

    def test_relative_paths_and_root_marker_are_normalized(self) -> None:
        self.assertEqual(
            workspace_manager.validate_relative_workspace_path(r"docs\guide.md"),
            Path("docs/guide.md"),
        )
        self.assertEqual(
            workspace_manager.validate_relative_workspace_path(".", allow_root=True),
            Path("."),
        )


class TrustedWorkspaceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.base = Path(self.temporary_directory.name)
        self.root = self.base / "project"
        self.root.mkdir()
        self.workspace_db_patch = patch.object(
            workspace_manager, "DB_PATH", self.base / "workspaces.sqlite"
        )
        self.workspace_db_patch.start()

    def tearDown(self) -> None:
        self.workspace_db_patch.stop()
        self.temporary_directory.cleanup()

    def register(self) -> int:
        with allowed_capability("register_workspace"):
            return workspace_manager.register_workspace_record(
                name="Test workspace",
                path=str(self.root),
                trusted=True,
                source_consent=True,
                consent_source="test",
            )

    def test_registration_fails_without_explicit_trust_and_consent(self) -> None:
        with allowed_capability("register_workspace"):
            with self.assertRaises(PermissionError):
                workspace_manager.register_workspace_record(
                    name="Untrusted",
                    path=str(self.root),
                )

    def test_sibling_prefix_and_symlink_escapes_are_rejected(self) -> None:
        workspace_id = self.register()
        sibling = self.base / "project-private"
        sibling.mkdir()
        (sibling / "secret.txt").write_text("private", encoding="utf-8")

        with self.assertRaises(PermissionError):
            workspace_manager.resolve_workspace_path(
                workspace_id,
                "../project-private/secret.txt",
                require_file=True,
            )

        link = self.root / "external"
        try:
            link.symlink_to(sibling, target_is_directory=True)
        except OSError as error:
            self.skipTest(f"Symlink creation is unavailable: {error}")
        with self.assertRaises(PermissionError):
            workspace_manager.resolve_workspace_path(
                workspace_id,
                "external/secret.txt",
                require_file=True,
            )

    def test_sensitive_files_are_denied(self) -> None:
        workspace_id = self.register()
        for relative in (".env", ".env.local", ".ssh/id_rsa", "certs/client.pem"):
            with self.subTest(relative=relative), self.assertRaises(PermissionError):
                workspace_manager.resolve_workspace_path(
                    workspace_id,
                    relative,
                    must_exist=False,
                )

    def test_direct_side_effect_primitives_require_gateway(self) -> None:
        from tools import dev_tools

        with self.assertRaises(CapabilityDeniedError):
            dev_tools._write_project_file_now(1, "unsafe.txt", "blocked")
        with self.assertRaises(CapabilityDeniedError):
            knowledge_base._index_document_path(1, "unsafe.txt", self.root / "unsafe.txt")


class KnowledgeScopeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.base = Path(self.temporary_directory.name)
        self.root = self.base / "project"
        self.root.mkdir()
        (self.root / "docs").mkdir()
        (self.root / "docs" / "guide.md").write_text("Trusted guide", encoding="utf-8")
        (self.root / "docs" / ".env").write_text("TOKEN=secret", encoding="utf-8")
        self.workspace_db_patch = patch.object(
            workspace_manager, "DB_PATH", self.base / "workspaces.sqlite"
        )
        self.knowledge_db_patch = patch.object(
            knowledge_base, "DB_PATH", self.base / "knowledge.sqlite"
        )
        self.workspace_db_patch.start()
        self.knowledge_db_patch.start()
        with allowed_capability("register_workspace"):
            self.workspace_id = workspace_manager.register_workspace_record(
                name="Knowledge workspace",
                path=str(self.root),
                trusted=True,
                source_consent=True,
                consent_source="test",
            )

    def tearDown(self) -> None:
        self.knowledge_db_patch.stop()
        self.workspace_db_patch.stop()
        self.temporary_directory.cleanup()

    def test_document_indexing_requires_per_request_consent_and_relative_scope(self) -> None:
        with allowed_capability("index_knowledge_document"):
            with self.assertRaises(PermissionError):
                knowledge_base.index_document(
                    self.workspace_id,
                    "docs/guide.md",
                    source_consent=False,
                )
            with self.assertRaises(PermissionError):
                knowledge_base.index_document(
                    self.workspace_id,
                    str(self.root / "docs" / "guide.md"),
                    source_consent=True,
                )
            result = knowledge_base.index_document(
                self.workspace_id,
                "docs/guide.md",
                source_consent=True,
            )

        self.assertEqual(result["workspace_id"], self.workspace_id)
        self.assertEqual(result["source_path"], f"workspace:{self.workspace_id}/docs/guide.md")
        self.assertNotIn(str(self.root), result["source_path"])

    def test_folder_indexing_skips_sensitive_sources(self) -> None:
        with allowed_capability("index_knowledge_folder"):
            result = knowledge_base.index_knowledge_folder(
                self.workspace_id,
                "docs",
                source_consent=True,
            )

        self.assertEqual(result["indexed_count"], 1)
        documents = knowledge_base.list_knowledge_documents()
        self.assertEqual([item["relative_path"] for item in documents], ["docs/guide.md"])


if __name__ == "__main__":
    unittest.main()
