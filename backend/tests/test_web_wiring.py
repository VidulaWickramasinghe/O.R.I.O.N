"""First-user HTTP workflows and launcher contracts, with disposable state."""
from backend.tests import TEST_DATA_DIR as _TEST_DATA_DIR

import io
import socket
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

from backend.tests.test_operational_api_contracts import operational_api_environment
from core import workspace_manager
from scripts import local_web, verify_web_api


class WebWiringTests(unittest.TestCase):
    def test_primary_windows_serialize_real_empty_backend_data(self):
        paths = {
            "/api/status": "version", "/api/settings/profile": "settings_map",
            "/api/workspaces": "workspaces", "/api/missions": "missions",
            "/api/approvals": "approvals", "/api/memory": "items",
            "/api/knowledge/documents": "documents", "/api/plugins": "plugins",
            "/api/security/policy": "active_policy", "/api/tools/audit": "events",
            "/api/release-candidate/status": "checklist",
            "/api/analytics/operational": "summary", "/api/voice/status": "mode",
        }
        with tempfile.TemporaryDirectory() as directory, operational_api_environment(Path(directory)) as client:
            client._transport.raise_server_exceptions = True
            for path, key in paths.items():
                with self.subTest(path=path):
                    response = client.get(path)
                    self.assertEqual(response.status_code, 200, response.text[:200])
                    self.assertIn(key, response.json())

    def test_register_index_search_and_reject_desktop_request(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            workspace = root / "training"
            workspace.mkdir()
            (workspace / "guide.txt").write_text("Training evidence: Orion approval review protects workspace changes.")
            with operational_api_environment(root) as client:
                payload = {"name": "Training", "path": str(workspace), "trusted": True, "source_consent": True}
                saved = client.post("/api/workspaces/register", json=payload)
                self.assertEqual(saved.status_code, 200, saved.text)
                workspace_id = saved.json()["workspace_id"]
                self.assertEqual(client.post("/api/workspaces/register", json=payload).json()["workspace_id"], workspace_id)
                self.assertEqual(client.get("/api/workspaces").json()["workspaces"][0]["path"], str(workspace.resolve()))
                self.assertEqual(client.get("/api/approvals?status=pending").json()["approvals"], [], "Registration must not manufacture an approval.")
                indexed = client.post("/api/knowledge/index", json={"workspace_id": workspace_id, "relative_path": "guide.txt", "source_consent": True})
                self.assertEqual(indexed.status_code, 200, indexed.text)
                search = client.post("/api/knowledge/search", json={"query": "approval", "workspace_id": workspace_id, "limit": 5})
                self.assertEqual(search.status_code, 200, search.text)
                self.assertTrue(search.json()["results"])
                requested = client.post(f"/api/desktop/workspaces/{workspace_id}/open-folder")
                self.assertEqual(requested.status_code, 200, requested.text)
                approval_id = requested.json()["approval_id"]
                pending = client.get("/api/approvals?status=pending").json()["approvals"]
                self.assertIn(approval_id, [record["id"] for record in pending])
                rejected = client.post(f"/api/approvals/{approval_id}/reject", json={"reason": "Training only; do not open a folder."})
                self.assertEqual(rejected.status_code, 200, rejected.text)
                self.assertEqual(rejected.json()["status"], "rejected")
                self.assertEqual(client.get("/api/approvals?status=pending").json()["approvals"], [])
                self.assertEqual(client.get("/api/approvals").json()["approvals"][0]["status"], "rejected")

    def test_policy_denied_desktop_request_leaves_no_pending_approval(self):
        from core import capability_gateway
        with tempfile.TemporaryDirectory() as directory, operational_api_environment(Path(directory)) as client:
            saved = client.post("/api/workspaces/register", json={"name": "Training", "path": directory, "trusted": True, "source_consent": True})
            workspace_id = saved.json()["workspace_id"]
            with patch.object(capability_gateway, "_plugin_decision", return_value=(False, "Plugin is disabled by the active security policy.", "medium", "desktop")):
                denied = client.post(f"/api/desktop/workspaces/{workspace_id}/open-folder")
            self.assertEqual(denied.status_code, 403, denied.text)
            self.assertIn("disabled", denied.text)
            self.assertEqual(client.get("/api/approvals?status=pending").json()["approvals"], [])

    def test_guide_security_profile_description_matches_current_policy(self):
        from core.security_policy import SECURITY_PROFILES
        self.assertIn("desktop_control", SECURITY_PROFILES["strict"]["disabled_plugins"])
        self.assertIn("desktop_control", SECURITY_PROFILES["balanced"]["enabled_plugins"])
        self.assertEqual(SECURITY_PROFILES["balanced"]["enabled_plugins"], SECURITY_PROFILES["developer_lab"]["enabled_plugins"])

    def test_registration_errors_are_actionable_and_do_not_register(self):
        with tempfile.TemporaryDirectory() as directory, operational_api_environment(Path(directory)) as client:
            for payload, status in [
                ({"name": "Training", "path": directory}, 403),
                ({"name": "Training", "path": directory + "/missing", "trusted": True, "source_consent": True}, 422),
                ({"name": " ", "path": directory, "trusted": True, "source_consent": True}, 422),
            ]:
                with self.subTest(payload=payload):
                    response = client.post("/api/workspaces/register", json=payload)
                    self.assertEqual(response.status_code, status, response.text)
            self.assertEqual(client.get("/api/workspaces").json()["workspaces"], [])

    def test_alternate_ports_wire_backend_frontend_and_cors_together(self):
        environment = local_web.launch_environment(18009, 13011)
        self.assertEqual(environment["ORION_BACKEND_PORT"], "18009")
        self.assertEqual(environment["NEXT_PUBLIC_ORION_API_URL"], "http://127.0.0.1:18009")
        self.assertIn("http://localhost:13011", environment["ORION_ALLOWED_ORIGINS"])
        with self.assertRaises(ValueError):
            local_web.launch_environment(8000, 8000)

    def test_occupied_port_fails_without_terminating_its_owner(self):
        with socket.socket() as listener, patch.object(local_web.subprocess, "Popen") as launch:
            listener.bind(("127.0.0.1", 0))
            with self.assertRaisesRegex(RuntimeError, "already in use"):
                local_web.require_free_port(listener.getsockname()[1])
            launch.assert_not_called()

    def test_shutdown_signals_only_spawned_process_groups(self):
        child = MagicMock(pid=23456)
        child.poll.return_value = None
        with patch.object(local_web.os, "name", "posix"), patch.object(local_web.os, "killpg") as kill:
            local_web.stop_children([child])
        kill.assert_called_once_with(child.pid, local_web.signal.SIGTERM)
        child.wait.assert_called_once_with(timeout=10)

    def test_verifier_rejects_redirects_before_forwarding_a_session(self):
        with self.assertRaisesRegex(RuntimeError, "redirects are not allowed"):
            verify_web_api.NoRedirects().redirect_request(None)

    def test_verifier_authenticates_protected_reads_without_printing_token(self):
        credential = "disposable-session-credential-for-test-only"
        response = MagicMock(status=200)
        response.read.return_value = b"{}"
        opener = MagicMock()
        opener.open.return_value.__enter__.return_value = response
        with patch.object(verify_web_api, "read_session", return_value={"baseUrl": "http://127.0.0.1:18009", "token": credential}), patch.object(verify_web_api, "build_opener", return_value=opener), patch("sys.stdout", new_callable=io.StringIO) as output:
            self.assertEqual(verify_web_api.main(), 0)
        self.assertNotIn(credential, output.getvalue())
        self.assertEqual(opener.open.call_count, len(verify_web_api.PATHS))
        requests = [call.args[0] for call in opener.open.call_args_list]
        self.assertIsNone(requests[0].get_header("Authorization"))
        self.assertTrue(all(request.get_header("Authorization") == f"Bearer {credential}" for request in requests[1:]))

    def test_verifier_error_output_never_echoes_credentials(self):
        credential = "disposable-session-credential-for-test-only"
        with patch.object(verify_web_api, "read_session", side_effect=RuntimeError(credential)), patch("sys.stderr", new_callable=io.StringIO) as output:
            self.assertEqual(verify_web_api.main(), 1)
        self.assertNotIn(credential, output.getvalue())
        self.assertIn("Start the backend", output.getvalue())
