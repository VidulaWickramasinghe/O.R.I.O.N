"""Scope, provenance, exclusion, and deletion regressions for ORION-011."""

from backend.tests import TEST_DATA_DIR as _TEST_DATA_DIR

import sqlite3
import tempfile
import unittest
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import patch

from core import capability_gateway, context_engine, knowledge_base, persistent_memory, vector_memory


@contextmanager
def gateway(capability: str):
    with patch.object(capability_gateway, "_policy_snapshot", return_value=("test", set())), patch.object(
        capability_gateway, "_plugin_decision", return_value=(True, "allowed", "medium", "test")
    ), patch.object(capability_gateway, "_audit"):
        with capability_gateway.authorized(capability, capability_gateway.test_context(capability)):
            yield


class MemoryContextControlTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        self.patches = [
            patch.object(persistent_memory, "DB_PATH", root / "memory.sqlite"),
            patch.object(knowledge_base, "DB_PATH", root / "knowledge.sqlite"),
            patch.object(vector_memory, "DB_PATH", root / "vectors.sqlite"),
            patch.object(context_engine, "CONTEXT_HISTORY_FILE", root / "context.json"),
            patch.object(context_engine, "PROJECTS_FILE", root / "projects.json"),
        ]
        for item in self.patches:
            item.start()

    def tearDown(self) -> None:
        for item in reversed(self.patches):
            item.stop()
        self.temp.cleanup()

    def save_memory(self, **values):
        with gateway("remember_information"):
            return persistent_memory.save_memory_item(
                category="test", title=values.pop("title"), content=values.pop("content"), **values
            )

    def test_memory_scope_sensitivity_expiry_edit_exclude_and_delete(self) -> None:
        global_id = self.save_memory(title="global", content="needle global")
        scoped_id = self.save_memory(title="scoped", content="needle scoped", workspace_id=7, project_key="orion")
        self.save_memory(title="other", content="needle other", workspace_id=8, project_key="other")
        self.save_memory(title="secret", content="needle secret", workspace_id=7, project_key="orion", sensitivity="sensitive")
        self.save_memory(title="expired", content="needle expired", expires_at="2000-01-01T00:00:00+00:00")

        results = persistent_memory.search_memory_items("needle", workspace_id=7, project_key="orion")
        self.assertEqual({item["id"] for item in results}, {global_id, scoped_id})
        self.assertTrue(all(item["retrieval_reason"] and isinstance(item["provenance"], dict) for item in results))

        with gateway("update_memory"):
            updated = persistent_memory.update_memory_item(scoped_id, content="corrected memory")
        self.assertEqual(updated["content"], "corrected memory")

        with gateway("exclude_memory"):
            persistent_memory.set_memory_excluded(scoped_id, True, "incorrect")
        self.assertEqual(persistent_memory.search_memory_items("corrected", workspace_id=7, project_key="orion"), [])

        with gateway("delete_memory"):
            self.assertTrue(persistent_memory.delete_memory_item(scoped_id))
        self.assertIsNone(persistent_memory.get_memory_item(scoped_id))

    def _seed_knowledge(self, workspace_id: int, title: str, content: str) -> int:
        knowledge_base.init_knowledge_db()
        now = knowledge_base._now()
        with knowledge_base.get_connection() as connection:
            cursor = connection.execute(
                """INSERT INTO knowledge_documents
                (title, source_path, extension, size_bytes, summary, workspace_id,
                 relative_path, source_consent, sensitivity, expires_at, excluded,
                 exclusion_reason, provenance_json, indexed_at, updated_at)
                VALUES (?, ?, '.txt', ?, '', ?, 'doc.txt', 1, 'internal', '', 0, '',
                        '{"method":"test_fixture"}', ?, ?)""",
                (title, f"workspace:{workspace_id}/doc.txt", len(content), workspace_id, now, now),
            )
            document_id = int(cursor.lastrowid)
            connection.execute(
                "INSERT INTO knowledge_chunks (document_id, chunk_index, content, created_at) VALUES (?, 0, ?, ?)",
                (document_id, content, now),
            )
        return document_id

    def test_knowledge_requires_exact_workspace_and_live_consent(self) -> None:
        first = self._seed_knowledge(1, "one", "workspace needle")
        self._seed_knowledge(2, "two", "workspace needle")
        self.assertEqual(knowledge_base.search_knowledge("needle"), [])
        results = knowledge_base.search_knowledge("needle", workspace_id=1)
        self.assertEqual([item["document_id"] for item in results], [first])
        self.assertIn("explicitly selected workspace", results[0]["retrieval_reason"])
        with gateway("exclude_knowledge_document"):
            knowledge_base.set_knowledge_document_excluded(first, True, "user removed")
        self.assertEqual(knowledge_base.search_knowledge("needle", workspace_id=1), [])

    def test_stale_vector_cannot_restore_excluded_source(self) -> None:
        memory_id = self.save_memory(title="vector", content="semantic source", workspace_id=3)
        with patch.object(vector_memory, "create_embedding", return_value=[1.0, 0.0]), gateway("rebuild_vector_memory_index"):
            vector_memory.upsert_vector_item(
                "persistent_memory", str(memory_id), "vector", "semantic source", workspace_id=3
            )
        with patch.object(vector_memory, "create_embedding", return_value=[1.0, 0.0]):
            self.assertEqual(len(vector_memory.semantic_search("semantic", workspace_id=3)), 1)
        with gateway("exclude_memory"):
            persistent_memory.set_memory_excluded(memory_id, True, "do not retrieve")
        with patch.object(vector_memory, "create_embedding", return_value=[1.0, 0.0]):
            self.assertEqual(vector_memory.semantic_search("semantic", workspace_id=3), [])

    def test_context_prompt_contains_explanation_and_never_excluded_content(self) -> None:
        self.save_memory(title="included", content="trusted phrase", workspace_id=5)
        excluded_id = self.save_memory(title="excluded", content="forbidden phrase", workspace_id=5)
        with gateway("exclude_memory"):
            persistent_memory.set_memory_excluded(excluded_id, True, "incorrect")
        mocks = {
            "semantic_search": [], "search_knowledge": [], "list_knowledge_documents": [],
            "list_workspace_records": [], "list_mission_runs": [], "list_approval_requests": [],
            "get_recent_activity": [], "get_user_settings_map": {}, "render_user_profile_summary": "none",
            "get_plugin_metrics": {}, "list_plugins": [],
        }
        patchers = [patch.object(context_engine, name, return_value=value) for name, value in mocks.items()]
        for item in patchers:
            item.start()
        try:
            with gateway("retrieve_project_context"):
                prompt = context_engine.get_context_preview("phrase", workspace_id=5)
        finally:
            for item in reversed(patchers):
                item.stop()
        self.assertIn("trusted phrase", prompt)
        self.assertIn("Retrieval:", prompt)
        self.assertIn("Provenance:", prompt)
        self.assertNotIn("forbidden phrase", prompt)


if __name__ == "__main__":
    unittest.main()
