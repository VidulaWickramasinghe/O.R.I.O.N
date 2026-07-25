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
    database,
    developer_agent,
    demo_recording,
    demo_walkthrough,
    frontend_refactor,
    final_launch,
    github_launch,
    github_polish,
    notification_engine,
    plugin_registry,
    portfolio_showcase,
    public_release,
    release_candidate,
    release_verification,
    security_policy,
    stabilization_manager,
    tool_audit,
    tool_permissions,
    user_settings,
    vector_memory,
    workflow_blueprints,
)


class DatabaseConnectionTests(unittest.TestCase):
    def test_managed_connection_closes_after_success(self) -> None:
        connection = Mock()
        connection.__enter__ = Mock(return_value=connection)
        connection.__exit__ = Mock(return_value=False)

        with patch.object(database.sqlite3, "connect", return_value=connection):
            with database.managed_connection("test.sqlite") as active:
                self.assertIs(active, connection)

        connection.__exit__.assert_called_once_with(None, None, None)
        connection.close.assert_called_once_with()

    def test_managed_connection_closes_after_failure(self) -> None:
        connection = Mock()
        connection.__enter__ = Mock(return_value=connection)
        connection.__exit__ = Mock(return_value=False)

        with patch.object(database.sqlite3, "connect", return_value=connection):
            with self.assertRaisesRegex(RuntimeError, "query failed"):
                with database.managed_connection("test.sqlite"):
                    raise RuntimeError("query failed")

        connection.close.assert_called_once_with()


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
    def test_dashboard_restores_preferences_without_stale_hook_references(self) -> None:
        dashboard = (
            Path(__file__).resolve().parents[2]
            / "frontend"
            / "src"
            / "components"
            / "aurora"
            / "dashboard-workspace.tsx"
        ).read_text(encoding="utf-8")

        self.assertIn("restoreDashboardPreferences();", dashboard)
        self.assertIn("const store = useAuroraStore.getState();", dashboard)
        self.assertNotIn(
            "[loadDemoWalkthroughStateFromStore, loadRecordingModeStateFromStore]",
            dashboard,
        )

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

    def test_global_store_health_has_no_transport_leaks(self) -> None:
        scan = frontend_refactor.inspect_frontend_architecture()

        self.assertTrue(scan["store_healthy"])
        self.assertEqual(scan["missing_store_actions"], [])
        self.assertEqual(scan["store_direct_fetch_count"], 0)
        self.assertEqual(scan["store_hardcoded_api_count"], 0)

    def test_frontend_resilience_is_wired_into_dashboard(self) -> None:
        scan = frontend_refactor.inspect_frontend_architecture()

        self.assertTrue(scan["resilience_ready"])
        self.assertGreaterEqual(scan["panel_boundary_count"], 15)

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
            "panel_boundary_count": 0,
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
            "store_healthy": False,
            "store_line_count": 0,
            "missing_store_actions": [],
            "store_direct_fetch_count": 0,
            "store_hardcoded_api_count": 0,
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


class ReleaseVerificationTests(unittest.TestCase):
    def test_quality_gate_runs_both_scripts_when_requested(self) -> None:
        verification = {
            "status": "passed",
            "generated_at": "now",
            "passed": 1,
            "failed": 0,
            "checks": [],
        }
        with patch.object(
            release_verification,
            "generate_release_verification_snapshot",
            return_value=verification,
        ), patch.object(
            release_verification,
            "_run_script",
            side_effect=[
                {"ok": True, "command": "backend"},
                {"ok": False, "command": "frontend"},
            ],
        ) as run:
            result = release_verification.run_quality_gate_snapshot(True)

        self.assertEqual(run.call_count, 2)
        self.assertEqual(result["status"], "failed")
        self.assertTrue(result["backend_check"]["ok"])
        self.assertFalse(result["frontend_check"]["ok"])

    def test_public_release_report_is_read_only(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir)
            with patch.object(public_release, "OUT", output):
                report = public_release.render_public_release_report()

            self.assertIn("Status: not_generated", report)
            self.assertEqual(list(output.glob("*")), [])

    def test_public_release_package_uses_unique_atomic_artifacts(self) -> None:
        verification = {
            "status": "passed",
            "generated_at": "now",
            "passed": 0,
            "failed": 0,
            "checks": [],
        }
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir)
            with patch.object(public_release, "OUT", output), patch.object(
                public_release,
                "generate_release_verification_snapshot",
                return_value=verification,
            ):
                first = public_release.generate_public_release_package()
                second = public_release.generate_public_release_package()

            self.assertNotEqual(first["summary_path"], second["summary_path"])
            self.assertTrue(Path(first["summary_path"]).is_file())
            self.assertTrue(Path(second["summary_path"]).is_file())
            self.assertFalse(any(path.name.startswith("tmp") for path in output.iterdir()))


class RepositoryPolishTests(unittest.TestCase):
    def test_secret_scan_reports_location_without_secret_value(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            source = root / "config.py"
            source.write_text(
                'OPENAI_API_KEY="sk-do-not-leak-this-value"\n', encoding="utf-8"
            )
            with patch.object(github_polish, "PROJECT_ROOT", root), patch.object(
                github_polish, "_tracked_files", return_value=(source,)
            ):
                result = github_polish.scan_for_sensitive_patterns()

        self.assertFalse(result["ok"])
        self.assertEqual(result["finding_count"], 1)
        self.assertEqual(result["findings"][0]["path"], "config.py")
        self.assertNotIn("sk-do-not-leak", repr(result))

    def test_example_credentials_are_not_reported(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            source = root / ".env.example"
            source.write_text("OPENAI_API_KEY=your-api-key\n", encoding="utf-8")
            with patch.object(github_polish, "PROJECT_ROOT", root), patch.object(
                github_polish, "_tracked_files", return_value=(source,)
            ):
                result = github_polish.scan_for_sensitive_patterns()

        self.assertTrue(result["ok"])

    def test_github_polish_save_reuses_one_snapshot(self) -> None:
        checklist = {
            "status": "ready",
            "generated_at": "now",
            "passed": 0,
            "failed": 0,
            "checks": [],
            "secrets": {"findings": []},
        }
        with tempfile.TemporaryDirectory() as temp_dir:
            with patch.object(github_polish, "POLISH_DIR", Path(temp_dir)), patch.object(
                github_polish,
                "generate_github_polish_checklist",
                return_value=checklist,
            ) as generate:
                result = github_polish.save_github_polish_artifacts()

        generate.assert_called_once_with()
        self.assertIs(result["checklist"], checklist)

    def test_portfolio_report_save_is_atomic_and_snapshot_consistent(self) -> None:
        scan = {
            "status": "ready",
            "generated_at": "now",
            "expected_count": 0,
            "existing_count": 0,
            "missing_count": 0,
            "screenshots": [],
            "existing": [],
            "missing": [],
        }
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir)
            with patch.object(portfolio_showcase, "SHOWCASE_DIR", output), patch.object(
                portfolio_showcase,
                "inspect_portfolio_showcase",
                return_value=scan,
            ) as inspect:
                result = portfolio_showcase.save_portfolio_showcase_report()

            self.assertTrue(Path(result["path"]).is_file())
            self.assertIs(result["scan"], scan)
            self.assertEqual(list(output.glob("PORTFOLIO_SHOWCASE_REPORT_*.md")), [Path(result["path"])])
        inspect.assert_called_once_with()


class DemoPresentationTests(unittest.TestCase):
    def test_walkthrough_save_uses_one_atomic_snapshot(self) -> None:
        scan = demo_walkthrough.inspect_demo_walkthrough()
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir)
            with patch.object(demo_walkthrough, "DEMO_DIR", output), patch.object(
                demo_walkthrough,
                "inspect_demo_walkthrough",
                return_value=scan,
            ) as inspect:
                result = demo_walkthrough.save_demo_walkthrough_report()

            self.assertTrue(Path(result["path"]).is_file())
            self.assertIs(result["scan"], scan)
            self.assertEqual(len(list(output.glob("DEMO_WALKTHROUGH_REPORT_*.md"))), 1)
        inspect.assert_called_once_with()

    def test_recording_save_uses_one_atomic_snapshot(self) -> None:
        scan = demo_recording.inspect_demo_recording_readiness()
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir)
            with patch.object(demo_recording, "RECORDING_DIR", output), patch.object(
                demo_recording,
                "inspect_demo_recording_readiness",
                return_value=scan,
            ) as inspect:
                result = demo_recording.save_demo_recording_report()

            self.assertTrue(Path(result["path"]).is_file())
            self.assertIs(result["scan"], scan)
            self.assertEqual(len(list(output.glob("DEMO_RECORDING_REPORT_*.md"))), 1)
        inspect.assert_called_once_with()

    def test_recording_status_is_computed_from_checks(self) -> None:
        with patch.object(demo_recording, "RECORDING_SCENES", ()):
            scan = demo_recording.inspect_demo_recording_readiness()

        self.assertEqual(scan["status"], "review_needed")
        self.assertEqual(scan["failed"], 1)


class FinalLaunchTests(unittest.TestCase):
    def test_missing_freeze_state_read_has_no_write_side_effect(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            state_path = Path(temp_dir) / "freeze.json"
            with patch.object(final_launch, "FREEZE_STATE_FILE", state_path):
                state = final_launch.load_final_launch_freeze_state()

            self.assertFalse(state["frozen"])
            self.assertFalse(state_path.exists())

    def test_freeze_state_is_atomic_and_reason_is_bounded(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            state_path = root / "freeze.json"
            with patch.object(final_launch, "FINAL_LAUNCH_DIR", root), patch.object(
                final_launch, "FREEZE_STATE_FILE", state_path
            ):
                state = final_launch.freeze_final_launch("ready for review")
                loaded = final_launch.load_final_launch_freeze_state()
                with self.assertRaises(ValueError):
                    final_launch.freeze_final_launch("x" * 501)

            self.assertTrue(state["frozen"])
            self.assertEqual(loaded, state)
            self.assertEqual(list(root.iterdir()), [state_path])

    def test_final_package_requires_freeze(self) -> None:
        checklist = {
            "status": "review_needed",
            "generated_at": "now",
            "passed": 0,
            "failed": 1,
            "checks": [],
            "final_freeze": {"frozen": False},
        }
        with patch.object(
            final_launch, "generate_final_launch_checklist", return_value=checklist
        ), patch.object(final_launch, "generate_public_release_package") as package:
            with self.assertRaises(ValueError):
                final_launch.generate_final_launch_package()

        package.assert_not_called()

    def test_github_template_generation_stays_in_artifact_directory(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            destination = Path(temp_dir) / "proposals"
            paths = github_launch.write_github_templates(destination)

            self.assertEqual(len(paths), 3)
            self.assertTrue(all(Path(path).is_relative_to(destination) for path in paths.values()))
            self.assertTrue(all(Path(path).is_file() for path in paths.values()))

    def test_github_artifacts_reuse_one_checklist(self) -> None:
        checklist = {
            "status": "review_needed",
            "generated_at": "now",
            "passed": 0,
            "failed": 1,
            "checks": [],
            "description": "description",
            "topics": [],
            "badges": "badges",
            "release_draft": "draft",
            "safe_push_checklist": "checklist",
        }
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir)
            with patch.object(github_launch, "OUT", output), patch.object(
                github_launch,
                "generate_github_launch_checklist",
                return_value=checklist,
            ) as generate:
                result = github_launch.save_github_launch_artifacts(False)

            self.assertTrue(Path(result["summary_path"]).is_file())
            self.assertEqual(result["templates"], {})
        generate.assert_called_once_with()


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


class PublicPresentationTests(unittest.TestCase):
    def test_public_landing_requires_static_export_configuration(self) -> None:
        from core import public_landing
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            for relative in public_landing.EXPECTED_FRONTEND_FILES:
                path = root / relative
                if relative == "public/screenshots":
                    path.mkdir(parents=True, exist_ok=True)
                    continue
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("export default {}", encoding="utf-8")
            with patch.object(public_landing, "FRONTEND_DIR", root):
                scan = public_landing.inspect_public_landing()
            self.assertFalse(scan["static_export_ready"])
            self.assertEqual(scan["status"], "review_needed")

    def test_ui_polish_scans_all_component_sources(self) -> None:
        from core import ui_polish
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            for index, relative in enumerate(ui_polish.EXPECTED_FILES):
                path = root / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                marker = ui_polish.RESPONSIVE_MARKERS[index] if index < len(ui_polish.RESPONSIVE_MARKERS) else ""
                path.write_text(marker, encoding="utf-8")
            # The final marker can live in any component, not only page.tsx.
            last = root / ui_polish.EXPECTED_FILES[-1]
            last.write_text(last.read_text() + ui_polish.RESPONSIVE_MARKERS[-1], encoding="utf-8")
            with patch.object(ui_polish, "FRONTEND_DIR", root):
                scan = ui_polish.inspect_ui_polish()
            self.assertTrue(scan["mobile_ready"])
            self.assertEqual(scan["status"], "ready")


class ProductionReleaseTests(unittest.TestCase):
    def test_production_snapshot_reads_latest_package_without_generating(self) -> None:
        from core import production_readiness
        healthy = {"status": "ready", "failed": 0, "frozen": True, "resilience_ready": True, "store_healthy": True, "mobile_ready": True}
        patches = [
            patch.object(production_readiness, "run_stabilization_scan", return_value={"status": "stable"}),
            patch.object(production_readiness, "inspect_frontend_architecture", return_value=healthy),
            patch.object(production_readiness, "generate_release_verification_snapshot", return_value={"status": "passed"}),
            patch.object(production_readiness, "generate_release_checklist", return_value={"failed": 0}),
            patch.object(production_readiness, "get_freeze_state", return_value={"frozen": True}),
            patch.object(production_readiness, "generate_final_launch_checklist", return_value={"failed": 0}),
            patch.object(production_readiness, "load_final_launch_freeze_state", return_value={"frozen": True}),
            patch.object(production_readiness, "generate_github_launch_checklist", return_value={"failed": 0}),
            patch.object(production_readiness, "generate_github_polish_checklist", return_value={"failed": 0}),
            patch.object(production_readiness, "inspect_public_landing", return_value={"status": "ready"}),
            patch.object(production_readiness, "inspect_ui_polish", return_value=healthy),
            patch.object(production_readiness, "inspect_demo_recording_readiness", return_value={"status": "ready"}),
            patch.object(production_readiness, "inspect_demo_walkthrough", return_value={"status": "ready"}),
            patch.object(production_readiness, "inspect_portfolio_showcase", return_value={"status": "ready"}),
            patch.object(production_readiness, "get_latest_public_release_package", return_value={"status": "generated"}),
        ]
        with patches[0], patches[1], patches[2], patches[3], patches[4], patches[5], patches[6], patches[7], patches[8], patches[9], patches[10], patches[11], patches[12], patches[13], patches[14]:
            snapshot = production_readiness.generate_production_readiness_snapshot()
        self.assertEqual(snapshot["status"], "production_ready")
        self.assertEqual(snapshot["readiness_score"], 100)

    def test_stable_lock_read_is_side_effect_free_and_package_requires_lock(self) -> None:
        from core import stable_release
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir); lock = root / "lock.json"
            with patch.object(stable_release, "OUT", root), patch.object(stable_release, "LOCK", lock):
                self.assertFalse(stable_release.load_version_lock()["locked"])
                self.assertFalse(lock.exists())
                with patch.object(stable_release, "generate_stable_release_checklist", return_value={"version_lock": {"locked": False}}):
                    with self.assertRaises(ValueError):
                        stable_release.generate_stable_release_package()

    def test_stable_lock_reason_is_bounded(self) -> None:
        from core import stable_release
        with self.assertRaises(ValueError):
            stable_release.lock_stable_release("x" * 501)


class MaintenanceAndPatchTests(unittest.TestCase):
    def test_known_issue_read_has_no_write_side_effect(self) -> None:
        from core import post_release_maintenance as maintenance
        with tempfile.TemporaryDirectory() as temp_dir:
            path=Path(temp_dir)/"issues.json"
            with patch.object(maintenance,"ISSUES",path): data=maintenance.load_known_issues()
            self.assertEqual(data["issues"],[])
            self.assertFalse(path.exists())

    def test_issue_input_is_bounded_and_security_takes_precedence(self) -> None:
        from core import post_release_maintenance as maintenance
        classification=maintenance.classify_issue_text("UI leaks API key")
        self.assertEqual(classification["category"],"security")
        self.assertEqual(classification["priority"],"critical")
        with self.assertRaises(ValueError): maintenance.classify_issue_text("x"*201)

    def test_patch_state_read_is_side_effect_free_and_validated(self) -> None:
        from core import patch_release
        with tempfile.TemporaryDirectory() as temp_dir:
            root=Path(temp_dir); state_path=root/"state.json"
            with patch.object(patch_release,"PATCH_RELEASE_DIR",root),patch.object(patch_release,"PATCH_STATE_FILE",state_path):
                self.assertFalse(patch_release.load_patch_state()["active"]); self.assertFalse(state_path.exists())
                with self.assertRaises(ValueError): patch_release.start_patch_release("v6.0.1")
                state=patch_release.start_patch_release("v6.2.1","hotfix","urgent fix")
                self.assertTrue(state["active"]); self.assertEqual(state["patch_type"],"hotfix")

    def test_patch_package_requires_active_workflow(self) -> None:
        from core import patch_release
        with patch.object(patch_release,"generate_hotfix_checklist",return_value={"patch_state":{"active":False}}):
            with self.assertRaises(ValueError): patch_release.generate_patch_release_package()


class RoadmapAndSafetyTests(unittest.TestCase):
    def test_roadmap_read_has_no_side_effect_and_security_precedes_memory(self) -> None:
        from core import roadmap_planner
        with tempfile.TemporaryDirectory() as temp_dir:
            path=Path(temp_dir)/"roadmap.json"
            with patch.object(roadmap_planner,"ROADMAP_FILE",path): data=roadmap_planner.load_future_features()
            self.assertEqual(data["features"],[]);self.assertFalse(path.exists())
        result=roadmap_planner.classify_feature_request("Secure cloud sync for memory","protect tokens")
        self.assertEqual(result["category"],"security");self.assertEqual(result["release_bucket"],"safety_review")

    def test_feature_input_is_bounded_and_ids_are_unique(self) -> None:
        from core import roadmap_planner
        with self.assertRaises(ValueError):roadmap_planner.classify_feature_request("x"*201)
        with tempfile.TemporaryDirectory() as temp_dir:
            path=Path(temp_dir)/"roadmap.json"
            with patch.object(roadmap_planner,"ROADMAP_FILE",path):
                first=roadmap_planner.add_future_feature("UI panel");second=roadmap_planner.add_future_feature("UI panel")
            self.assertNotEqual(first["id"],second["id"])

    def test_critical_feature_cannot_be_manually_approved(self) -> None:
        from core import safety_review_board
        feature={"id":"feature_1","title":"Execute terminal commands with secrets","description":"upload token","safety_level":"high","category":"agentic_tools","release_bucket":"safety_review","priority_score":90,"status":"proposed","source":"manual","effort":"high","governance_note":"review","created_at":"","updated_at":""}
        with patch.object(safety_review_board,"load_future_features",return_value={"features":[feature]}):
            with self.assertRaises(ValueError):safety_review_board.create_feature_review("feature_1",decision="approved")
            with tempfile.TemporaryDirectory() as temp_dir:
                path=Path(temp_dir)/"reviews.json"
                with patch.object(safety_review_board,"REVIEW_FILE",path): review=safety_review_board.create_feature_review("feature_1")
            self.assertEqual(review["decision"],"needs_changes");self.assertFalse(review["development_eligible"])

    def test_review_read_has_no_write_side_effect(self) -> None:
        from core import safety_review_board
        with tempfile.TemporaryDirectory() as temp_dir:
            path=Path(temp_dir)/"reviews.json"
            with patch.object(safety_review_board,"REVIEW_FILE",path):data=safety_review_board.load_feature_reviews()
            self.assertEqual(data["reviews"],[]);self.assertFalse(path.exists())


if __name__ == "__main__":
    unittest.main()
