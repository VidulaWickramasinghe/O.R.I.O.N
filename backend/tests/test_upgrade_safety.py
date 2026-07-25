"""Regression tests for semantic memory and approval-gated developer mode."""

import os
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

from core import developer_agent, vector_memory, workflow_blueprints


class VectorMemoryTests(unittest.TestCase):
    def test_placeholder_embedding_key_is_rejected_without_network_call(self) -> None:
        with patch.dict(os.environ, {"OPENAI_API_KEY": "<YOUR_API_KEY>"}, clear=False):
            with patch.object(vector_memory, "OpenAI") as openai:
                with self.assertRaisesRegex(ValueError, "OPENAI_API_KEY"):
                    vector_memory.create_embedding("semantic text")
        openai.assert_not_called()

    def test_embedding_client_reads_api_key_at_call_time(self) -> None:
        embedding_api = Mock()
        embedding_api.create.return_value = SimpleNamespace(
            data=[SimpleNamespace(embedding=[0.25, 0.75])]
        )
        client = SimpleNamespace(embeddings=embedding_api)

        with patch.dict(os.environ, {"OPENAI_API_KEY": "late-key"}, clear=False):
            with patch.object(vector_memory, "OpenAI", return_value=client) as openai:
                result = vector_memory.create_embedding("semantic text")

        self.assertEqual(result, [0.25, 0.75])
        openai.assert_called_once_with(api_key="late-key")
        embedding_api.create.assert_called_once_with(
            model=vector_memory.EMBEDDING_MODEL,
            input="semantic text",
        )

    def test_rebuild_reports_partial_and_failed_results(self) -> None:
        memory = {"indexed_count": 2, "failed_count": 1, "indexed": [], "failed": []}
        knowledge = {"indexed_count": 0, "failed_count": 0, "indexed": [], "failed": []}
        with patch.object(vector_memory, "init_vector_db"):
            with patch.object(vector_memory, "index_recent_memories_to_vectors", return_value=memory):
                with patch.object(vector_memory, "index_knowledge_documents_to_vectors", return_value=knowledge):
                    result = vector_memory.rebuild_vector_index()
        self.assertEqual(result["status"], "partial")
        self.assertEqual(result["indexed_count"], 2)
        self.assertEqual(result["failed_count"], 1)

        memory["indexed_count"] = 0
        with patch.object(vector_memory, "init_vector_db"):
            with patch.object(vector_memory, "index_recent_memories_to_vectors", return_value=memory):
                with patch.object(vector_memory, "index_knowledge_documents_to_vectors", return_value=knowledge):
                    result = vector_memory.rebuild_vector_index()
        self.assertEqual(result["status"], "failed")


class WorkflowBlueprintTests(unittest.TestCase):
    def test_blueprint_rejects_unknown_workspace(self) -> None:
        with patch.object(workflow_blueprints, "get_workspace_record", return_value=None):
            with self.assertRaisesRegex(ValueError, "Workspace not found"):
                workflow_blueprints.create_mission_from_blueprint(
                    "github_release", workspace_id=999
                )


class DeveloperPatchSafetyTests(unittest.TestCase):
    def test_workspace_path_rejects_prefix_collision_and_absolute_path(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "workspace"
            root.mkdir()
            with self.assertRaisesRegex(ValueError, "unsafe workspace path"):
                developer_agent._safe_workspace_file(
                    root, "../workspace_evil/payload.txt"
                )
            with self.assertRaisesRegex(ValueError, "must be relative"):
                developer_agent._safe_workspace_file(root, "/tmp/payload.txt")

    def test_approved_patch_is_atomic_backed_up_and_not_replayable(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            target = root / "safe.txt"
            target.write_text("before", encoding="utf-8")
            approval = {
                "action_type": "APPLY_WORKSPACE_FILE_PATCH",
                "status": "pending",
                "payload": {
                    "workspace_id": 7,
                    "workspace_path": str(root),
                    "relative_path": "safe.txt",
                    "target_path": str(target),
                    "new_content": "after",
                },
            }
            with patch.object(developer_agent, "_get_workspace_root", return_value=root):
                result = developer_agent.execute_approved_workspace_patch(approval)

            self.assertIn("Workspace patch applied", result)
            self.assertEqual(target.read_text(encoding="utf-8"), "after")
            backups = list(root.glob("safe.txt.*.orion_backup"))
            self.assertEqual(len(backups), 1)
            self.assertEqual(backups[0].read_text(encoding="utf-8"), "before")

            approval["status"] = "approved"
            with patch.object(developer_agent, "_get_workspace_root", return_value=root):
                with self.assertRaisesRegex(ValueError, "no longer pending"):
                    developer_agent.execute_approved_workspace_patch(approval)


if __name__ == "__main__":
    unittest.main()
