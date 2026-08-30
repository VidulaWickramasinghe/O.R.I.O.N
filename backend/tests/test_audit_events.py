"""Regression tests for correlated, durable security and mission audit events."""

import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

import api_main
from core import approvals, mission_manager, mission_planner, mission_run_history, tool_audit
from core.capability_gateway import CapabilityContext, execute_capability, get_capability_manifest


def context(capability: str, *, correlation_id: str, mission_id: int = 7) -> CapabilityContext:
    manifest = get_capability_manifest(capability)
    assert manifest is not None
    return CapabilityContext(
        actor="agent",
        source="audit_regression",
        scope=manifest.scope,
        session_id="session-audit",
        mission_id=mission_id,
        step_id=11,
        run_id=13,
        approval_id=17,
        correlation_id=correlation_id,
    )


class AuditSchemaMigrationTests(unittest.TestCase):
    def test_legacy_tool_audit_schema_is_migrated_additively(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            database = Path(temp_dir) / "audit.sqlite"
            with closing(sqlite3.connect(database)) as connection, connection:
                connection.execute(
                    """
                    CREATE TABLE tool_audit_events (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        tool_name TEXT NOT NULL,
                        plugin_key TEXT DEFAULT '',
                        decision TEXT NOT NULL,
                        reason TEXT DEFAULT '',
                        risk_level TEXT DEFAULT 'unknown',
                        category TEXT DEFAULT 'unknown',
                        source TEXT DEFAULT 'O.R.I.O.N.',
                        created_at TEXT NOT NULL
                    )
                    """
                )
            with patch.object(tool_audit, "DB_PATH", database):
                tool_audit.init_tool_audit_db()
                with tool_audit.get_connection() as connection:
                    legacy_columns = {
                        row[1] for row in connection.execute("PRAGMA table_info(tool_audit_events)")
                    }
                    durable_columns = {
                        row[1] for row in connection.execute("PRAGMA table_info(audit_events)")
                    }

            self.assertTrue(
                {"actor", "mission_id", "correlation_id", "arguments_hash", "duration_ms"}
                <= legacy_columns
            )
            self.assertTrue(
                {
                    "correlation_id",
                    "sequence",
                    "actor",
                    "mission_id",
                    "step_id",
                    "run_id",
                    "tool_name",
                    "policy_profile",
                    "approval_id",
                    "arguments_hash",
                    "result",
                    "duration_ms",
                }
                <= durable_columns
            )


class CorrelatedAuditTests(unittest.TestCase):
    def test_argument_hashes_bind_secret_changes_without_storing_secrets(self) -> None:
        first = tool_audit.hash_audit_arguments({"token": "first-secret"})
        second = tool_audit.hash_audit_arguments({"token": "second-secret"})
        self.assertNotEqual(first, second)

        with tempfile.TemporaryDirectory() as temp_dir, patch.object(
            tool_audit, "DB_PATH", Path(temp_dir) / "audit.sqlite"
        ):
            event = tool_audit.record_audit_event(
                "test.result",
                "result",
                status="succeeded",
                result="Authorization: Bearer first-secret token=second-secret",
            )
        self.assertNotIn("first-secret", event["result"])
        self.assertNotIn("second-secret", event["result"])
        self.assertIn("[REDACTED]", event["result"])

    def test_read_only_dashboard_requests_do_not_write_activity(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir, patch.object(
            tool_audit, "DB_PATH", Path(temp_dir) / "audit.sqlite"
        ), patch.object(
            mission_planner, "DB_PATH", Path(temp_dir) / "missions.sqlite"
        ), patch.object(
            api_main.LOCAL_API_AUTHENTICATOR,
            "authenticate",
            return_value="read-only-session",
        ):
            with TestClient(api_main.app) as client:
                before = tool_audit.list_audit_events(phase="activity")
                self.assertEqual(client.get("/api/status").status_code, 200)
                self.assertEqual(client.get("/api/missions").status_code, 200)
                self.assertEqual(client.get("/api/activity").status_code, 200)
                after = tool_audit.list_audit_events(phase="activity")

        self.assertEqual([event["id"] for event in after], [event["id"] for event in before])

    def test_gateway_decision_and_result_are_correlated_and_redacted(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir, patch.object(
            tool_audit, "DB_PATH", Path(temp_dir) / "audit.sqlite"
        ), patch(
            "core.capability_gateway._policy_snapshot",
            return_value=("balanced-test", set()),
        ), patch(
            "core.capability_gateway._plugin_decision",
            return_value=(True, "allowed", "medium", "test"),
        ):
            result = execute_capability(
                "create_local_reminder",
                context("create_local_reminder", correlation_id="mission-7-run-13"),
                lambda payload: {"status": "saved", "token": payload["token"]},
                {"title": "Review", "token": "never-store-this"},
            )
            events = tool_audit.list_audit_events(correlation_id="mission-7-run-13")

        self.assertEqual(result["status"], "saved")
        self.assertEqual([event["phase"] for event in events], ["decision", "execution"])
        for event in events:
            self.assertEqual(event["actor"], "agent")
            self.assertEqual(event["policy_profile"], "balanced-test")
            self.assertEqual(event["mission_id"], 7)
            self.assertEqual(event["step_id"], 11)
            self.assertEqual(event["run_id"], 13)
            self.assertEqual(event["approval_id"], 17)
            self.assertEqual(len(event["arguments_hash"]), 64)
        self.assertEqual(events[0]["decision"], "allowed")
        self.assertEqual(events[1]["status"], "succeeded")
        self.assertIsNotNone(events[1]["duration_ms"])
        self.assertNotIn("never-store-this", events[1]["result"])
        self.assertIn("[REDACTED]", events[1]["result"])

    def test_execution_failure_is_terminal_and_cannot_be_replayed(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir, patch.object(
            tool_audit, "DB_PATH", Path(temp_dir) / "audit.sqlite"
        ), patch(
            "core.capability_gateway._policy_snapshot", return_value=("test", set())
        ), patch(
            "core.capability_gateway._plugin_decision",
            return_value=(True, "allowed", "medium", "test"),
        ):
            def fail() -> None:
                raise RuntimeError("injected failure")

            with self.assertRaisesRegex(RuntimeError, "injected failure"):
                execute_capability(
                    "create_local_reminder",
                    context("create_local_reminder", correlation_id="failure-correlation"),
                    fail,
                )
            execution = tool_audit.list_audit_events(
                correlation_id="failure-correlation", phase="execution"
            )[0]
            self.assertEqual(execution["status"], "failed")
            with self.assertRaisesRegex(ValueError, "already terminal"):
                tool_audit.complete_audit_event(execution["id"], status="succeeded")

    def test_mission_report_reconstructs_plan_decision_approval_action_and_result(self) -> None:
        mission = {
            "id": 7,
            "title": "Correlated Mission",
            "goal": "Prove complete audit reconstruction",
            "status": "completed",
            "priority": "high",
            "created_at": "2026-08-30T00:00:00",
            "updated_at": "2026-08-30T00:05:00",
            "steps": [
                {"id": 11, "position": 1, "title": "Execute safely", "status": "completed"}
            ],
        }
        transition = {
            "id": 2,
            "entity_type": "step",
            "actor": "mission_agent",
            "step_id": 11,
            "run_id": 13,
            "from_state": "running",
            "to_state": "completed",
            "cause": "tool result accepted",
            "evaluator_outcome": "accepted",
            "created_at": "2026-08-30T00:03:00",
        }
        approval = {
            "id": 17,
            "status": "approved",
            "step_id": 11,
            "run_id": 13,
            "action_type": "create_local_reminder",
            "payload_hash": "a" * 64,
            "result": "approved once",
            "created_at": "2026-08-30T00:02:00",
        }
        run = {
            "id": 13,
            "mission_id": 7,
            "step_id": 11,
            "step_title": "Execute safely",
            "status": "completed",
            "started_at": "2026-08-30T00:01:00",
            "completed_at": "2026-08-30T00:04:00",
            "output": "completed output",
            "error": "",
            "approval_id": 17,
        }
        with tempfile.TemporaryDirectory() as temp_dir:
            reports_dir = Path(temp_dir) / "reports"
            reports_dir.mkdir()
            with patch.object(
                tool_audit, "DB_PATH", Path(temp_dir) / "audit.sqlite"
            ), patch.object(
                mission_run_history, "DB_PATH", Path(temp_dir) / "runs.sqlite"
            ), patch.object(
                mission_run_history, "REPORTS_DIR", reports_dir
            ), patch.object(
                mission_planner, "get_mission_record", return_value=mission
            ), patch.object(
                mission_manager, "list_mission_transitions", return_value=[transition]
            ), patch.object(
                approvals, "list_approval_requests_for_mission", return_value=[approval]
            ), patch.object(
                mission_run_history, "list_runs_for_mission", return_value=[run]
            ), patch(
                "core.capability_gateway._policy_snapshot",
                return_value=("balanced-test", set()),
            ), patch(
                "core.capability_gateway._plugin_decision",
                return_value=(True, "allowed", "medium", "test"),
            ):
                report_path = execute_capability(
                    "generate_mission_report",
                    context("generate_mission_report", correlation_id="mission-report-7"),
                    mission_run_history.generate_mission_report,
                    mission,
                )
                report = Path(report_path).read_text(encoding="utf-8")

        self.assertIn("## Correlated Audit Timeline", report)
        self.assertIn("mission.plan.created", report)
        self.assertIn("capability.decision", report)
        self.assertIn("mission.approval", report)
        self.assertIn("mission.step.transition", report)
        self.assertIn("mission.run.result", report)
        self.assertIn("mission-report-7", report)
        self.assertIn("Approval: 17", report)


if __name__ == "__main__":
    unittest.main()
