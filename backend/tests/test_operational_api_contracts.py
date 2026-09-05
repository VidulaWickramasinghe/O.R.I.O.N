"""Regression tests for Aurora's operational API contracts.

These tests exercise response-model serialization and the authenticated HTTP
boundary.  Every mutable store is redirected to a temporary directory so the
suite never reads or changes a user's local O.R.I.O.N. state.
"""

from __future__ import annotations

from backend.tests import TEST_DATA_DIR as _TEST_DATA_DIR

import tempfile
import unittest
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator
from unittest.mock import patch

from fastapi.testclient import TestClient

import api_main
from core import approvals, capability_gateway, knowledge_base, tool_audit, workspace_manager
from core.capability_gateway import CapabilityContext


AUTH_HEADERS = {"Authorization": "Bearer operational-contract-test-token"}
AUDIT_EVENT_FIELDS = {
    "id",
    "correlation_id",
    "sequence",
    "parent_event_id",
    "event_type",
    "phase",
    "status",
    "actor",
    "source",
    "session_id",
    "mission_id",
    "step_id",
    "run_id",
    "tool_name",
    "plugin_key",
    "policy_profile",
    "approval_id",
    "scope",
    "decision",
    "arguments_hash",
    "result",
    "result_hash",
    "duration_ms",
    "reason",
    "created_at",
    "completed_at",
}


@contextmanager
def operational_api_environment(root: Path) -> Iterator[TestClient]:
    """Serve the API with authenticated requests and isolated persistence."""

    with patch.object(
        approvals, "DB_PATH", root / "approvals.sqlite"
    ), patch.object(
        knowledge_base, "DB_PATH", root / "knowledge.sqlite"
    ), patch.object(
        tool_audit, "DB_PATH", root / "audit.sqlite"
    ), patch.object(
        workspace_manager, "DB_PATH", root / "workspaces.sqlite"
    ), patch.object(
        api_main.LOCAL_API_AUTHENTICATOR,
        "authenticate",
        return_value="operational-contract-session",
    ), patch.object(
        capability_gateway, "_policy_snapshot", return_value=("contract-test", set())
    ), patch.object(
        capability_gateway,
        "_plugin_decision",
        return_value=(True, "allowed for contract test", "medium", "test"),
    ):
        # Using TestClient without its context-manager form intentionally avoids
        # application startup recovery touching stores outside this test's scope.
        client = TestClient(api_main.app, raise_server_exceptions=False)
        try:
            yield client
        finally:
            client.close()


def seed_workspace(
    root: Path,
    *,
    name: str,
    trusted: bool,
    source_consent: bool,
) -> int:
    workspace_manager.init_workspace_db()
    now = "2026-09-05T00:00:00"
    with workspace_manager.get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO workspaces
            (name, path, description, status, trusted, source_consent,
             consent_source, consented_at, created_at, updated_at)
            VALUES (?, ?, 'Contract fixture', 'active', ?, ?, 'contract_test', ?, ?, ?)
            """,
            (
                name,
                str(root),
                int(trusted),
                int(source_consent),
                now if source_consent else None,
                now,
                now,
            ),
        )
        connection.commit()
        return int(cursor.lastrowid)


def create_pending_approval(index: int) -> int:
    manifest = capability_gateway.get_capability_manifest("write_project_file")
    if manifest is None:  # pragma: no cover - a manifest regression is clearer here.
        raise AssertionError("write_project_file capability manifest is missing")
    context = CapabilityContext(
        actor="agent",
        source="operational_contract_test",
        scope=manifest.scope,
        session_id="approval-create-session",
    )
    with capability_gateway.authorized("write_project_file", context):
        return approvals.create_approval_request(
            action_type="WRITE_PROJECT_FILE",
            title=f"Contract approval {index}",
            description="Validate the approval API contract.",
            payload={
                "workspace_id": 1,
                "path": f"contract-{index}.txt",
                "content": "test-only",
            },
            idempotency_key=f"operational-contract-{index}",
        )


class WorkspaceAndKnowledgeApiContractTests(unittest.TestCase):
    def test_workspace_trust_fields_survive_response_serialization(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            workspace_root = base / "trusted-project"
            workspace_root.mkdir()
            with operational_api_environment(base) as client:
                workspace_id = seed_workspace(
                    workspace_root,
                    name="Trusted contract workspace",
                    trusted=True,
                    source_consent=True,
                )

                response = client.get("/api/workspaces", headers=AUTH_HEADERS)

        self.assertEqual(response.status_code, 200, response.text)
        [workspace] = response.json()["workspaces"]
        self.assertEqual(workspace["id"], workspace_id)
        self.assertIs(workspace["trusted"], True)
        self.assertIs(workspace["source_consent"], True)
        self.assertEqual(workspace["consent_source"], "contract_test")
        self.assertEqual(workspace["consented_at"], "2026-09-05T00:00:00")

    def test_denied_and_invalid_knowledge_inputs_return_non_success_statuses(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            untrusted_root = base / "untrusted-project"
            trusted_root = base / "trusted-project"
            untrusted_root.mkdir()
            trusted_root.mkdir()
            (untrusted_root / "guide.md").write_text("untrusted", encoding="utf-8")
            (trusted_root / "guide.md").write_text("trusted", encoding="utf-8")
            with operational_api_environment(base) as client:
                untrusted_id = seed_workspace(
                    untrusted_root,
                    name="Untrusted contract workspace",
                    trusted=False,
                    source_consent=False,
                )
                trusted_id = seed_workspace(
                    trusted_root,
                    name="Trusted contract workspace",
                    trusted=True,
                    source_consent=True,
                )

                denied = client.post(
                    "/api/knowledge/index",
                    headers=AUTH_HEADERS,
                    json={
                        "workspace_id": untrusted_id,
                        "relative_path": "guide.md",
                        "source_consent": True,
                    },
                )
                traversal = client.post(
                    "/api/knowledge/index",
                    headers=AUTH_HEADERS,
                    json={
                        "workspace_id": trusted_id,
                        "relative_path": "../outside.md",
                        "source_consent": True,
                    },
                )
                invalid_shape = client.post(
                    "/api/knowledge/index-folder",
                    headers=AUTH_HEADERS,
                    json={
                        "workspace_id": 0,
                        "relative_path": "",
                        "source_consent": True,
                    },
                )
                documents = knowledge_base.list_knowledge_documents()

        self.assertEqual(denied.status_code, 403, denied.text)
        self.assertGreaterEqual(traversal.status_code, 400, traversal.text)
        self.assertLess(traversal.status_code, 500, traversal.text)
        self.assertEqual(invalid_shape.status_code, 422, invalid_shape.text)
        self.assertEqual(documents, [])


class ApprovalApiContractTests(unittest.TestCase):
    def test_status_filter_cannot_hide_an_older_pending_approval(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            with operational_api_environment(base) as client:
                pending_id = create_pending_approval(0)
                terminal_ids = [create_pending_approval(index) for index in range(1, 36)]
                with approvals.get_connection() as connection:
                    connection.executemany(
                        """
                        UPDATE approval_requests
                        SET status = 'failed', result = 'fixture terminal state',
                            completed_at = updated_at
                        WHERE id = ?
                        """,
                        [(approval_id,) for approval_id in terminal_ids],
                    )
                    connection.commit()

                response = client.get(
                    "/api/approvals?status=pending&limit=100",
                    headers=AUTH_HEADERS,
                )
                invalid_status = client.get(
                    "/api/approvals?status=not-a-state",
                    headers=AUTH_HEADERS,
                )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(
            [(item["id"], item["status"]) for item in response.json()["approvals"]],
            [(pending_id, "pending")],
        )
        self.assertEqual(invalid_status.status_code, 422, invalid_status.text)

    def test_reject_reason_is_persisted_and_replay_is_explicit(self) -> None:
        reason = "The command target needs a narrower workspace scope."
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            with operational_api_environment(base) as client:
                approval_id = create_pending_approval(101)
                response = client.post(
                    f"/api/approvals/{approval_id}/reject",
                    headers=AUTH_HEADERS,
                    json={"reason": reason},
                )
                replay = client.post(
                    f"/api/approvals/{approval_id}/reject",
                    headers=AUTH_HEADERS,
                    json={"reason": reason},
                )
                stored = approvals.get_approval_request(approval_id)
                execution = approvals.get_approval_execution(approval_id)

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["status"], "rejected")
        self.assertEqual(response.json()["result"], reason)
        self.assertIs(response.json()["replayed"], False)
        self.assertEqual(replay.status_code, 200, replay.text)
        self.assertEqual(replay.json()["status"], "rejected")
        self.assertIs(replay.json()["replayed"], True)
        self.assertEqual(stored["result"], reason)
        self.assertEqual(execution["result"], reason)

    def test_idempotency_mismatch_is_conflict_and_does_not_claim_execution(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            with operational_api_environment(base) as client:
                approval_id = create_pending_approval(202)
                response = client.post(
                    f"/api/approvals/{approval_id}/approve",
                    headers={**AUTH_HEADERS, "Idempotency-Key": "wrong-key"},
                )
                stored = approvals.get_approval_request(approval_id)
                execution = approvals.get_approval_execution(approval_id)

        self.assertEqual(response.status_code, 409, response.text)
        self.assertEqual(stored["status"], "pending")
        self.assertIsNone(execution)


class DurableAuditApiContractTests(unittest.TestCase):
    def test_durable_audit_response_shape_and_filters(self) -> None:
        arguments_hash = tool_audit.hash_audit_arguments({"path": "docs/guide.md"})
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            with operational_api_environment(base) as client:
                tool_audit.record_audit_event(
                    "capability.execution",
                    "execution",
                    status="succeeded",
                    actor="mission_agent",
                    source="contract_test",
                    session_id="audit-contract-session",
                    mission_id=7,
                    step_id=11,
                    run_id=13,
                    tool_name="index_knowledge_document",
                    plugin_key="knowledge_base",
                    policy_profile="strict",
                    approval_id=17,
                    scope="plugin:knowledge_base",
                    arguments_hash=arguments_hash,
                    result={"status": "indexed"},
                    duration_ms=12.5,
                    correlation_id="audit-contract-correlation",
                )
                tool_audit.record_audit_event(
                    "unrelated.execution",
                    "execution",
                    status="failed",
                    correlation_id="another-correlation",
                )

                response = client.get(
                    "/api/audit/events",
                    headers=AUTH_HEADERS,
                    params={
                        "correlation_id": "audit-contract-correlation",
                        "phase": "execution",
                        "mission_id": 7,
                        "limit": 10,
                    },
                )
                invalid_phase = client.get(
                    "/api/audit/events?phase=not-a-phase",
                    headers=AUTH_HEADERS,
                )
                invalid_limit = client.get(
                    "/api/audit/events?limit=0",
                    headers=AUTH_HEADERS,
                )

        self.assertEqual(response.status_code, 200, response.text)
        [event] = response.json()["events"]
        self.assertEqual(set(event), AUDIT_EVENT_FIELDS)
        self.assertEqual(event["correlation_id"], "audit-contract-correlation")
        self.assertEqual(event["phase"], "execution")
        self.assertEqual(event["mission_id"], 7)
        self.assertEqual(event["step_id"], 11)
        self.assertEqual(event["run_id"], 13)
        self.assertEqual(event["policy_profile"], "strict")
        self.assertEqual(event["approval_id"], 17)
        self.assertEqual(event["arguments_hash"], arguments_hash)
        self.assertEqual(event["duration_ms"], 12.5)
        self.assertEqual(invalid_phase.status_code, 422, invalid_phase.text)
        self.assertEqual(invalid_limit.status_code, 422, invalid_limit.text)


if __name__ == "__main__":
    unittest.main()
