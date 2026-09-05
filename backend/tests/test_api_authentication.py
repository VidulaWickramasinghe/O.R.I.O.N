"""Regression coverage for the launch-scoped local control API identity."""

from backend.tests import TEST_DATA_DIR as _TEST_DATA_DIR

import json
import os
import socket
import tempfile
import unittest
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

import api_main
from core import approvals, capability_gateway, knowledge_base, tool_audit
from core.api_auth import DEVELOPMENT_BROKER_REQUEST, LocalApiAuthenticator
from core.capability_gateway import CapabilityContext


@contextmanager
def allow_gateway():
    with patch.object(
        capability_gateway, "_policy_snapshot", return_value=("auth-test", set())
    ), patch.object(
        capability_gateway,
        "_plugin_decision",
        return_value=(True, "allowed", "medium", "test"),
    ):
        yield


class LocalApiAuthenticationTests(unittest.TestCase):
    def test_only_health_endpoint_is_public_and_control_endpoints_require_auth(self) -> None:
        with TestClient(api_main.app) as client:
            self.assertEqual(client.get("/api/health").status_code, 200)
            denied_paths = [
                client.get("/"),
                client.get("/api/status"),
                client.get("/api/approvals"),
            ]
            wrong = client.get(
                "/api/approvals",
                headers={"Authorization": f"Bearer {'x' * 48}"},
            )

        self.assertTrue(all(response.status_code == 401 for response in denied_paths))
        self.assertEqual(wrong.status_code, 401)
        self.assertTrue(
            all(response.headers.get("cache-control") == "no-store" for response in denied_paths)
        )

    def test_authenticated_session_reaches_capability_audit(self) -> None:
        with tempfile.TemporaryDirectory() as directory, patch.object(
            tool_audit, "DB_PATH", Path(directory) / "audit.sqlite"
        ), patch.object(
            knowledge_base, "DB_PATH", Path(directory) / "knowledge.sqlite"
        ), patch.object(
            api_main.LOCAL_API_AUTHENTICATOR,
            "authenticate",
            return_value="local-regression-session",
        ), allow_gateway():
            with TestClient(api_main.app) as client:
                response = client.post(
                    "/api/knowledge/search",
                    headers={"Authorization": "Bearer test-only-token"},
                    json={"query": "nothing", "limit": 1},
                )
            event = tool_audit.list_tool_audit_events(limit=1)[0]

        self.assertEqual(response.status_code, 200)
        self.assertEqual(event["session_id"], "local-regression-session")

    def test_token_is_hashed_in_memory_and_never_returned_on_failure(self) -> None:
        token = "launch-secret-" + ("A" * 40)
        authenticator = LocalApiAuthenticator(token)

        self.assertEqual(authenticator.authenticate(f"Bearer {token}"), authenticator.session_id)
        self.assertIsNone(authenticator.authenticate("Bearer wrong-token"))
        self.assertNotIn(token, repr(vars(authenticator)))

    def test_development_broker_hands_the_ephemeral_token_over_an_owner_only_socket(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            socket_path = Path(directory) / "api-session.sock"
            with patch.dict(
                os.environ,
                {
                    "ORION_DEV_AUTH_SOCKET": str(socket_path),
                    "ORION_BACKEND_PORT": "8123",
                },
                clear=False,
            ):
                os.environ.pop("ORION_CAPABILITY_TOKEN", None)
                authenticator = LocalApiAuthenticator()
                authenticator.start_development_broker()
                try:
                    self.assertEqual(socket_path.stat().st_mode & 0o777, 0o600)
                    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as client:
                        client.connect(str(socket_path))
                        client.sendall(DEVELOPMENT_BROKER_REQUEST)
                        payload = json.loads(client.recv(4096).decode("utf-8"))

                    self.assertEqual(payload["baseUrl"], "http://127.0.0.1:8123")
                    self.assertEqual(
                        authenticator.authenticate(f"Bearer {payload['token']}"),
                        authenticator.session_id,
                    )
                    self.assertNotIn(payload["token"], repr(vars(authenticator)))
                finally:
                    authenticator.close_development_broker()
            self.assertFalse(socket_path.exists())


class ApprovalSessionTests(unittest.TestCase):
    def test_approval_request_and_execution_record_local_sessions(self) -> None:
        with tempfile.TemporaryDirectory() as directory, patch.object(
            approvals, "DB_PATH", Path(directory) / "approvals.sqlite"
        ), patch.object(capability_gateway, "_audit"), allow_gateway():
            create_manifest = capability_gateway.get_capability_manifest("write_project_file")
            create_context = CapabilityContext(
                actor="agent",
                source="aurora_chat",
                scope=create_manifest.scope if create_manifest else "",
                session_id="local-create-session",
            )
            with capability_gateway.authorized("write_project_file", create_context):
                approval_id = approvals.create_approval_request(
                    action_type="WRITE_PROJECT_FILE",
                    title="Write",
                    description="Test",
                    payload={"workspace_id": 1, "path": "notes.txt", "content": "ok"},
                )

            execute_manifest = capability_gateway.get_capability_manifest(
                "execute_approved_action"
            )
            execute_context = CapabilityContext(
                actor="approval_executor",
                source="api:POST:/api/approvals/1/approve",
                scope=execute_manifest.scope if execute_manifest else "",
                session_id="local-approve-session",
                approval_id=approval_id,
            )
            with capability_gateway.authorized(
                "execute_approved_action", execute_context
            ):
                claim = approvals.claim_approval_execution(
                    approval_id,
                    actor="approval_executor",
                )

            request = approvals.get_approval_request(approval_id)
            execution = approvals.get_approval_execution(approval_id)

        self.assertEqual(request["session_id"], "local-create-session")
        self.assertTrue(claim["claimed"])
        self.assertEqual(execution["session_id"], "local-approve-session")


if __name__ == "__main__":
    unittest.main()
