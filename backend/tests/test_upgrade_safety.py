"""Regression tests for semantic memory and approval-gated developer mode."""

import os
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

from core import (
    backend_sidecar,
    developer_agent,
    frontend_refactor,
    notification_engine,
    plugin_registry,
    release_candidate,
    security_policy,
    stabilization_manager,
    tool_audit,
    tool_permissions,
    user_settings,
    vector_memory,
    workflow_blueprints,
)


class StabilizationManagerTests(unittest.TestCase):
    def test_cached_scan_is_defensively_copied(self) -> None:
        cached = {"status": "stable", "required_files": {"missing": []}}
        with stabilization_manager._SCAN_CACHE_LOCK:
            stabilization_manager._SCAN_CACHE.update(
                {"created_at": datetime.now(), "scan": cached}
            )

        first = stabilization_manager.run_stabilization_scan(run_build=False)
        first["required_files"]["missing"].append("mutated")
        second = stabilization_manager.run_stabilization_scan(run_build=False)

        self.assertEqual(second["required_files"]["missing"], [])

    def test_render_uses_supplied_scan_without_rescanning(self) -> None:
        scan = {
            "generated_at": "now",
            "status": "stable",
            "cleanup_checklist": {"passed": 0, "failed": 0, "items": []},
            "required_files": {"present_count": 1, "missing_count": 0, "missing": []},
            "import_risks": {"risk_count": 0, "risks": []},
            "code_risks": {"scanned_files": 1, "finding_count": 0, "findings": []},
            "duplicate_risk_zones": {"duplicate_group_count": 0, "duplicate_groups": []},
            "backend_compile": {"ok": True, "command": "compile", "stderr": "", "stdout": ""},
            "frontend_build": {"ok": None, "command": "build", "stderr": "skip", "stdout": ""},
        }
        with patch.object(stabilization_manager, "run_stabilization_scan") as run:
            report = stabilization_manager.render_stabilization_report(scan=scan)

        run.assert_not_called()
        self.assertIn("Status: stable", report)

    def test_import_scan_uses_syntax_not_string_literals(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "safe.py").write_text(
                'MESSAGE = "from backend.core is documentation"\n', encoding="utf-8"
            )
            (root / "unsafe.py").write_text(
                "from backend.core.activity import log_activity\n", encoding="utf-8"
            )
            with patch.object(stabilization_manager, "PROJECT_ROOT", root):
                with patch.object(stabilization_manager, "BACKEND_DIR", root):
                    result = stabilization_manager.check_import_style_risks()

        self.assertEqual(result["risk_count"], 1)
        self.assertEqual(result["risks"][0]["file"], "unsafe.py")


class FrontendRefactorTests(unittest.TestCase):
    def test_active_aurora_components_use_shared_api_services(self) -> None:
        frontend_root = Path(__file__).resolve().parents[2] / "frontend" / "src"
        violations = []
        for path in (frontend_root / "components").rglob("*.tsx"):
            if "legacy" in path.parts:
                continue
            text = path.read_text(encoding="utf-8")
            if "fetch(" in text or "http://127.0.0.1:8000" in text:
                violations.append(str(path.relative_to(frontend_root)))

        self.assertEqual(violations, [])

    def test_frontend_service_inventory_is_complete(self) -> None:
        scan = frontend_refactor.inspect_frontend_architecture()
        self.assertEqual(scan["missing_service_files"], [])

    def test_report_has_refactor_identity_and_uses_supplied_scan(self) -> None:
        scan = {
            "generated_at": "now",
            "status": "healthy",
            "page_lines": 3,
            "page_size": 20,
            "dashboard_workspace_lines": 10,
            "dashboard_workspace_size": 100,
            "directories": [],
            "files": [],
            "resilience_file_count": 0,
            "resilience_ready": False,
            "github_polish_panel_exists": False,
            "github_polish_service_exists": False,
            "final_launch_panel_exists": False,
            "final_launch_service_exists": False,
            "recording_types_exists": False,
            "recording_registry_exists": False,
            "recording_storage_exists": False,
            "presenter_controls_panel_exists": False,
            "recording_overlay_exists": False,
            "demo_types_exists": False,
            "demo_registry_exists": False,
            "demo_storage_exists": False,
            "guided_walkthrough_panel_exists": False,
            "demo_callout_overlay_exists": False,
            "dashboard_view_selector_exists": False,
            "workspace_view_storage_exists": False,
            "panel_registry_exists": False,
            "panel_storage_exists": False,
            "panel_types_exists": False,
            "store_exists": False,
            "service_file_count": 0,
            "service_files": [],
            "component_count": 0,
            "components": [],
        }
        with patch.object(frontend_refactor, "inspect_frontend_architecture") as inspect:
            report = frontend_refactor.render_frontend_refactor_report(scan)

        inspect.assert_not_called()
        self.assertTrue(
            report.startswith("# O.R.I.O.N. v6.2 Frontend Service Architecture Report")
        )


class SecurityPolicyTests(unittest.TestCase):
    def _database_patches(self, root: Path):
        return (
            patch.object(plugin_registry, "DB_PATH", root / "plugins.sqlite"),
            patch.object(security_policy, "DB_PATH", root / "policy.sqlite"),
            patch.object(user_settings, "DB_PATH", root / "settings.sqlite"),
            patch.object(tool_audit, "DB_PATH", root / "audit.sqlite"),
        )

    def test_strict_profile_disables_unknown_non_protected_plugin(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            patches = self._database_patches(Path(temp_dir))
            with patches[0], patches[1], patches[2], patches[3]:
                plugin_registry.init_plugin_registry_db()
                now = plugin_registry._now()
                with plugin_registry.get_connection() as connection:
                    connection.execute(
                        """INSERT INTO plugins
                        (key, name, description, category, risk_level, permissions_json,
                         enabled, built_in, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, 'true', 'false', ?, ?)""",
                        ("future_plugin", "Future", "test", "test", "high", "[]", now, now),
                    )
                    connection.commit()

                security_policy.apply_security_profile("strict", source="test")
                future = plugin_registry.get_plugin("future_plugin")

        self.assertIsNotNone(future)
        self.assertFalse(future["enabled"])

    def test_failed_audit_rolls_back_policy_plugins_and_setting(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            patches = self._database_patches(Path(temp_dir))
            with patches[0], patches[1], patches[2], patches[3]:
                plugin_registry.init_plugin_registry_db()
                before = plugin_registry.get_plugin("desktop_control")
                with patch.object(
                    security_policy,
                    "record_tool_audit_event",
                    side_effect=OSError("audit unavailable"),
                ):
                    with self.assertRaisesRegex(OSError, "audit unavailable"):
                        security_policy.apply_security_profile("strict", source="test")

                after = plugin_registry.get_plugin("desktop_control")
                active = security_policy.get_active_security_policy()
                settings = user_settings.get_user_settings_map()

        self.assertEqual(before["enabled"], after["enabled"])
        self.assertEqual(active["active_profile"], "strict")
        self.assertEqual(settings["safety_level"], "strict")


class ReleaseCandidateSafetyTests(unittest.TestCase):
    def test_package_requires_freeze(self) -> None:
        state = {**release_candidate.DEFAULT_FREEZE_STATE, "frozen": False}
        with patch.object(release_candidate, "init_release_candidate_db"):
            with patch.object(release_candidate, "get_freeze_state", return_value=state):
                with self.assertRaisesRegex(ValueError, "Freeze the system"):
                    release_candidate.generate_release_candidate_package()

    def test_freeze_metadata_is_bounded(self) -> None:
        with self.assertRaisesRegex(ValueError, "1000 characters or fewer"):
            release_candidate.freeze_system(reason="x" * 1001)


class ToolPermissionTests(unittest.TestCase):
    def test_unmapped_tools_are_denied_by_default(self) -> None:
        decision = tool_permissions.is_tool_allowed("unknown_dynamic_tool")
        self.assertFalse(decision["allowed"])
        self.assertIn("Denied by default", decision["reason"])

    def test_audit_failure_blocks_tool_execution(self) -> None:
        called = Mock(return_value="executed")
        wrapped = tool_permissions.enforce_tool_permission("run_safe_command")(called)
        decision = {
            "allowed": True,
            "tool_name": "run_safe_command",
            "plugin_key": "developer_tools",
            "risk_level": "high",
            "category": "developer",
            "reason": "enabled",
        }
        with patch.object(tool_permissions, "is_tool_allowed", return_value=decision):
            with patch.object(
                tool_permissions,
                "record_tool_audit_event",
                side_effect=OSError("database unavailable"),
            ):
                with patch.object(
                    tool_permissions, "log_activity", side_effect=OSError("activity unavailable")
                ):
                    result = wrapped("status")

        called.assert_not_called()
        self.assertIn("audit event could not be recorded", result)


class ToolAuditTests(unittest.TestCase):
    def test_audit_inputs_and_filters_are_validated(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            with patch.object(tool_audit, "DB_PATH", Path(temp_dir) / "audit.sqlite"):
                with self.assertRaisesRegex(ValueError, "decision must"):
                    tool_audit.record_tool_audit_event("tool", "plugin", "maybe", "")
                with self.assertRaisesRegex(ValueError, "decision filter"):
                    tool_audit.list_tool_audit_events(decision="maybe")

    def test_metrics_count_all_events_not_only_recent_window(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            with patch.object(tool_audit, "DB_PATH", Path(temp_dir) / "audit.sqlite"):
                tool_audit.init_tool_audit_db()
                rows = [
                    ("tool", "plugin", "allowed", "ok", "low", "test", "test", "now")
                    for _ in range(1005)
                ]
                with tool_audit.get_connection() as connection:
                    connection.executemany(
                        """
                        INSERT INTO tool_audit_events
                        (tool_name, plugin_key, decision, reason, risk_level, category, source, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        rows,
                    )
                    connection.commit()

                metrics = tool_audit.get_tool_audit_metrics()

        self.assertEqual(metrics["total_audit_events"], 1005)
        self.assertEqual(metrics["allowed_events"], 1005)


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
