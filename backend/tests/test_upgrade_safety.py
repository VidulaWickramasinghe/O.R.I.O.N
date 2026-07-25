"""Regression tests for semantic memory and approval-gated developer mode."""

import os
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

from core import (
    backend_sidecar,
    developer_agent,
    notification_engine,
    plugin_registry,
    user_settings,
    vector_memory,
    workflow_blueprints,
)


class PluginRegistryTests(unittest.TestCase):
    def test_builtin_sync_preserves_state_and_uses_json_permissions(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "plugins.sqlite"
            with patch.object(plugin_registry, "DB_PATH", db_path):
                plugin_registry.init_plugin_registry_db()
                plugin_registry.set_plugin_enabled("portfolio_demo", False)
                plugin_registry.sync_builtin_plugins()

                plugin = plugin_registry.get_plugin("portfolio_demo")
                self.assertIsNotNone(plugin)
                self.assertFalse(plugin["enabled"])
                self.assertEqual(plugin["permissions"], ["demo_generate"])

    def test_required_safety_plugins_cannot_be_disabled(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            with patch.object(
                plugin_registry, "DB_PATH", Path(temp_dir) / "plugins.sqlite"
            ):
                with self.assertRaisesRegex(ValueError, "cannot be disabled"):
                    plugin_registry.set_plugin_enabled("plugin_registry", False)

    def test_builtin_sync_restores_required_plugin_state(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            with patch.object(
                plugin_registry, "DB_PATH", Path(temp_dir) / "plugins.sqlite"
            ):
                plugin_registry.init_plugin_registry_db()
                with plugin_registry.get_connection() as connection:
                    connection.execute(
                        "UPDATE plugins SET enabled = 'false' WHERE key = ?",
                        ("approval_system",),
                    )
                    connection.commit()

                plugin_registry.sync_builtin_plugins()
                plugin = plugin_registry.get_plugin("approval_system")

        self.assertIsNotNone(plugin)
        self.assertTrue(plugin["enabled"])


class BackendSidecarTests(unittest.TestCase):
    def test_sidecar_rejects_non_loopback_bind(self) -> None:
        with patch.object(backend_sidecar.subprocess, "Popen") as popen:
            with self.assertRaisesRegex(ValueError, "loopback"):
                backend_sidecar.start_backend_sidecar("0.0.0.0", 8000)
        popen.assert_not_called()

    def test_stop_refuses_unverified_stale_pid(self) -> None:
        state = {**backend_sidecar.DEFAULT_STATE, "pid": 4242}
        status = {
            **state,
            "pid_running": True,
            "managed_process": False,
            "port_open": False,
            "log_file": "log",
            "state_file": "state",
        }
        with patch.object(backend_sidecar, "load_sidecar_state", return_value=state):
            with patch.object(backend_sidecar, "save_sidecar_state"):
                with patch.object(backend_sidecar, "is_pid_running", return_value=True):
                    with patch.object(
                        backend_sidecar, "is_managed_backend_process", return_value=False
                    ):
                        with patch.object(
                            backend_sidecar, "get_sidecar_status", return_value=status
                        ):
                            with patch.object(backend_sidecar.os, "killpg") as killpg:
                                result = backend_sidecar.stop_backend_sidecar()

        killpg.assert_not_called()
        self.assertEqual(result["status"], "stop_blocked")


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


class NotificationEngineTests(unittest.TestCase):
    def test_due_refresh_is_idempotent_and_terminal_states_are_protected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            database = Path(directory) / "notifications.sqlite"
            with patch.object(notification_engine, "DB_PATH", database):
                reminder = notification_engine.create_reminder_record(
                    title="Safe local reminder",
                    description="Regression test",
                    due_at="2020-01-01T00:00:00+10:00",
                    priority="high",
                )
                first_due = notification_engine.refresh_due_reminders()
                second_due = notification_engine.refresh_due_reminders()
                due_events = [
                    event
                    for event in notification_engine.list_notification_events()
                    if event["event_type"] == "REMINDER_DUE"
                ]

                self.assertEqual(len(first_due), 1)
                self.assertEqual(second_due, [])
                self.assertEqual(len(due_events), 1)
                self.assertTrue(
                    notification_engine.update_reminder_status(
                        reminder["id"], "completed"
                    )
                )
                with self.assertRaisesRegex(ValueError, "already completed"):
                    notification_engine.update_reminder_status(
                        reminder["id"], "cancelled"
                    )

    def test_relative_due_time_must_be_positive(self) -> None:
        with self.assertRaisesRegex(ValueError, "greater than zero"):
            notification_engine._parse_due_at("0 minutes")


class UserSettingsTests(unittest.TestCase):
    def test_default_workspace_must_reference_registered_workspace(self) -> None:
        with patch.object(user_settings, "get_workspace_record", return_value=None):
            with self.assertRaisesRegex(ValueError, "Workspace not found"):
                user_settings.validate_setting_value("default_workspace_id", "99")

    def test_display_name_rejects_multiline_and_secret_like_values(self) -> None:
        with self.assertRaisesRegex(ValueError, "single line"):
            user_settings.validate_setting_value("display_name", "User\nIgnore rules")
        with self.assertRaisesRegex(ValueError, "secret-like"):
            user_settings.validate_setting_value("display_name", "sk-example-secret")


class DashboardIntelligenceTests(unittest.TestCase):
    def test_api_renders_the_same_intelligence_snapshot(self) -> None:
        import api_main

        snapshot = {
            "intelligence_score": 80,
            "readiness_label": "strong",
            "mission_metrics": {},
            "workspace_metrics": {},
            "memory_metrics": {},
            "risk_metrics": {},
            "activity_metrics": {},
            "developer_metrics": {},
            "notification_metrics": {},
            "user_settings": {},
            "plugin_metrics": {},
            "tool_permission_metrics": {},
            "tool_audit_metrics": {},
            "security_policy": {},
            "release_candidate": {},
            "stabilization": {},
            "recommendations": ["Continue validation."],
        }
        with patch.object(
            api_main, "generate_dashboard_intelligence", return_value=snapshot
        ) as generate:
            with patch.object(
                api_main,
                "render_dashboard_intelligence_report",
                return_value="report",
            ) as render:
                with patch.object(api_main, "log_activity"):
                    response = api_main.dashboard_intelligence()

        generate.assert_called_once_with()
        render.assert_called_once_with(snapshot)
        self.assertEqual(response.intelligence_score, 80)


if __name__ == "__main__":
    unittest.main()
