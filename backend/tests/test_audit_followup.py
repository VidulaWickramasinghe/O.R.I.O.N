"""Behavioral regressions for the September development audit."""

from backend.tests import TEST_DATA_DIR

import hashlib
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

import api_main
from core import approvals, capability_gateway, context_engine, desktop_control, mission_planner, workspace_manager
from core.context_selection import context_selection
from core.workspace_commands import package_script_plan, revalidate_package_script
from tools import dev_tools
from backend.tests.test_operational_api_contracts import operational_api_environment, seed_workspace
from backend.tests.test_upgrade_safety import gateway_authorization


class AuditFollowupTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.workspace = self.root / "workspace"
        self.workspace.mkdir()
        self.manifest = self.workspace / "package.json"
        self.manifest.write_text('{"scripts":{"prebuild":"node setup.js","build":"node build.js","dev":"node server.js"}}')
        self.ws_patch = patch.object(workspace_manager, "DB_PATH", self.root / "workspaces.sqlite")
        self.ws_patch.start()
        self.addCleanup(self.ws_patch.stop)
        self.workspace_id = seed_workspace(self.workspace, name="Audit fixture", trusted=True, source_consent=True)

    def test_test_bootstrap_overrides_exported_runtime_directory(self):
        sentinel = self.root / "user-data"
        sentinel.mkdir()
        result = subprocess.run([sys.executable, "-c", "import backend.tests; from core.tool_audit import record_audit_event; record_audit_event('isolation.test', 'test'); print(backend.tests.TEST_DATA_DIR)"],
                                env={**os.environ, "ORION_DATA_DIR": str(sentinel)}, capture_output=True, text=True, check=True)
        self.assertEqual(list(sentinel.iterdir()), [])
        self.assertNotEqual(result.stdout.strip(), str(sentinel))
        self.assertFalse(Path(result.stdout.strip()).exists(), "Child runtime must be cleaned up.")
        self.assertEqual(os.environ["ORION_DATA_DIR"], TEST_DATA_DIR)

    def test_package_plan_shows_lifecycle_scripts_and_changes_invalidate_approval(self):
        plan = package_script_plan(self.workspace_id, "build")
        self.assertEqual(plan["risk"], "high")
        self.assertEqual(plan["scripts"], {"prebuild": "node setup.js", "build": "node build.js"})
        revalidate_package_script(self.workspace_id, "build", plan)
        self.manifest.write_text('{"scripts":{"build":"node different.js"}}')
        with self.assertRaises(PermissionError):
            revalidate_package_script(self.workspace_id, "build", plan)

    def test_dev_request_is_high_risk_and_contains_reviewable_evidence(self):
        with patch.object(approvals, "DB_PATH", self.root / "approvals.sqlite"), gateway_authorization("start_workspace_dev_server"):
            approval_id = desktop_control.request_start_workspace_dev_server(self.workspace_id)
            approval = approvals.get_approval_request(approval_id)
        self.assertEqual(approval["risk_level"], "high")
        self.assertEqual(approval["payload"]["command_plan"]["scripts"]["dev"], "node server.js")

    def test_command_arguments_cannot_extend_allowlisted_commands(self):
        for command in ("git status --help", "npm run build -- --unsafe", "ls /", "git branch malicious"):
            with self.subTest(command=command):
                self.assertFalse(dev_tools._is_safe_command(command))
        self.assertTrue(dev_tools._is_safe_command("npm run build"))

    def test_missing_script_evidence_never_launches_subprocess(self):
        with gateway_authorization("execute_approved_action"), patch.object(dev_tools.subprocess, "run") as run:
            with self.assertRaises(PermissionError):
                dev_tools._run_safe_command_now(self.workspace_id, "npm run build")
            run.assert_not_called()

    def test_revoked_workspace_trust_blocks_all_workspace_desktop_actions(self):
        with workspace_manager.get_connection() as connection:
            connection.execute("UPDATE workspaces SET trusted = 0 WHERE id = ?", (self.workspace_id,))
        with gateway_authorization("execute_approved_action"), patch.object(desktop_control.subprocess, "Popen") as launch:
            for action in ("OPEN_WORKSPACE_FOLDER", "OPEN_WORKSPACE_IN_VSCODE", "START_WORKSPACE_DEV_SERVER"):
                with self.subTest(action=action), self.assertRaises(PermissionError):
                    desktop_control.execute_approved_desktop_action(1, {"status": "executing", "action_type": action, "payload": {"workspace_id": self.workspace_id, "path": str(self.workspace)}})
            launch.assert_not_called()

    def test_platform_opener_uses_native_command_and_remains_gateway_guarded(self):
        with self.assertRaises(capability_gateway.CapabilityDeniedError):
            desktop_control._open_target("https://example.com")
        for platform, executable in (("darwin", "open"), ("linux", "xdg-open")):
            with self.subTest(platform=platform), gateway_authorization("execute_approved_action"), patch.object(desktop_control.sys, "platform", platform), patch.object(desktop_control.shutil, "which", return_value=f"/usr/bin/{executable}"), patch.object(desktop_control.subprocess, "Popen") as launch:
                desktop_control._open_target("https://example.com")
                self.assertEqual(launch.call_args.args[0], [f"/usr/bin/{executable}", "https://example.com"])
        with gateway_authorization("execute_approved_action"), patch.object(desktop_control.sys, "platform", "win32"), patch.object(desktop_control.os, "startfile", create=True) as launch:
            desktop_control._open_target("https://example.com")
            launch.assert_called_once_with("https://example.com")

    def test_desktop_api_returns_forbidden_when_workspace_trust_is_revoked(self):
        with workspace_manager.get_connection() as connection:
            connection.execute("UPDATE workspaces SET trusted = 0 WHERE id = ?", (self.workspace_id,))
        with operational_api_environment(self.root) as client, patch.object(desktop_control, "create_approval_request") as create:
            for action in ("open-folder", "open-vscode", "start-dev"):
                with self.subTest(action=action):
                    response = client.post(f"/api/desktop/workspaces/{self.workspace_id}/{action}")
                    self.assertEqual(response.status_code, 403, response.text)
            create.assert_not_called()

    def test_active_demo_uses_manifest_version_without_rewriting_historical_pack(self):
        from core import portfolio_demo
        from core.version import VERSION_LABEL

        state = self.root / "demo.json"
        original = '{"release_version":"v6.5","last_generated_pack":"historical-pack"}'
        state.write_text(original)
        with patch.object(portfolio_demo, "DEMO_STATE_FILE", state):
            current = portfolio_demo.load_demo_state()
        self.assertEqual(current["release_version"], VERSION_LABEL)
        self.assertEqual(current["last_generated_pack"], "historical-pack")
        self.assertEqual(state.read_text(), original)

    def test_replaced_root_symlink_requires_new_trust(self):
        moved = self.root / "moved"
        self.workspace.rename(moved)
        self.workspace.symlink_to(moved, target_is_directory=True)
        with self.assertRaises(PermissionError):
            workspace_manager.get_trusted_workspace_record(self.workspace_id)

    def test_release_status_is_read_only_and_serializes_on_empty_runtime(self):
        with operational_api_environment(self.root) as client, patch.object(api_main, "log_activity") as log:
            response = client.get("/api/release-candidate/status")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertFalse(response.json()["freeze_state"]["frozen"])
        self.assertGreater(response.json()["checklist"]["failed"], 0)
        log.assert_not_called()

    def test_freeform_mission_persists_plan_without_running(self):
        with patch.object(mission_planner, "DB_PATH", self.root / "missions.sqlite"), operational_api_environment(self.root) as client, patch.object(api_main, "run_scoped_agent", new_callable=AsyncMock) as agent:
            response = client.post("/api/missions", json={"title": "Review", "goal": "Review the workspace", "steps": ["Inspect", "Report"], "priority": 4})
            self.assertEqual(response.status_code, 201, response.text)
            record = mission_planner.get_mission_record(response.json()["id"])
            self.assertEqual(record["status"], "planned")
            self.assertEqual([step["title"] for step in record["steps"]], ["Inspect", "Report"])
            agent.assert_not_called()
            bad = client.post("/api/missions", json={"title": "Review", "goal": "Goal", "steps": [" "]})
            self.assertEqual(bad.status_code, 422)

    def test_disabled_mission_capability_blocks_creation(self):
        with operational_api_environment(self.root) as client, patch.object(capability_gateway, "_plugin_decision", return_value=(False, "disabled", "medium", "mission")), patch.object(api_main, "create_mission_record") as create:
            response = client.post("/api/missions", json={"title": "Review", "goal": "Goal", "steps": ["Inspect"]})
            self.assertEqual(response.status_code, 403)
            create.assert_not_called()

    def test_excluded_automatic_context_never_retrieves_or_embeds(self):
        selection = {key: False for key in ("memory", "knowledge", "semantic", "profile", "activity")}
        with context_selection(selection), gateway_authorization("retrieve_project_context"), patch.object(context_engine, "search_memory_items") as memory, patch.object(context_engine, "semantic_search") as semantic, patch.object(context_engine, "search_knowledge") as knowledge, patch.object(context_engine, "render_user_profile_summary") as profile:
            bundle = context_engine.build_context_bundle("private query")
            for operation in (memory, semantic, knowledge, profile):
                operation.assert_not_called()
            self.assertEqual(bundle["recent_activity"], [])

    def test_context_exclusion_is_enforced_for_agent_capabilities(self):
        with context_selection({"memory": False, "knowledge": False, "semantic": False}):
            for name in ("search_persistent_memory", "search_local_knowledge", "semantic_memory_search"):
                manifest = capability_gateway.get_capability_manifest(name)
                self.assertIsNotNone(manifest)
                self.assertFalse(capability_gateway._plugin_decision(manifest, set())[0])

    def test_stale_context_preview_prevents_provider_call(self):
        with operational_api_environment(self.root) as client, patch.object(api_main, "prepare_context_enriched_input", return_value="changed context"), patch.object(api_main, "run_scoped_agent", new_callable=AsyncMock) as agent:
            response = client.post("/api/chat", json={"message": "Review", "expected_context_hash": hashlib.sha256(b"reviewed context").hexdigest()})
            self.assertEqual(response.status_code, 409, response.text)
            agent.assert_not_called()

    def test_changed_context_choices_reject_old_conversation(self):
        with operational_api_environment(self.root) as client, patch.object(api_main, "prepare_context_enriched_input", return_value="input"), patch.object(api_main, "get_conversation", return_value={"scope_id": "legacy-context"}), patch.object(api_main, "run_scoped_agent", new_callable=AsyncMock) as agent:
            response = client.post("/api/chat", json={"message": "Review", "conversation_id": "old", "context_options": {"memory": False}})
            self.assertEqual(response.status_code, 409, response.text)
            agent.assert_not_called()
