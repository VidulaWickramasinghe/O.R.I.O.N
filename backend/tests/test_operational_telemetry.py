"""Event-derived telemetry and fixture-free UI regressions for ORION-012."""

from backend.tests import TEST_DATA_DIR as _TEST_DATA_DIR

import json
import sqlite3
import tempfile
import unittest
from contextlib import closing
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from core import agent_runtime, mission_planner, operational_telemetry, tool_audit


class OperationalTelemetryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        self.paths = {
            "agent": root / "agent.sqlite",
            "mission": root / "mission.sqlite",
            "audit": root / "audit.sqlite",
        }
        self.patches = [
            patch.object(agent_runtime, "DB_PATH", self.paths["agent"]),
            patch.object(mission_planner, "DB_PATH", self.paths["mission"]),
            patch.object(tool_audit, "DB_PATH", self.paths["audit"]),
        ]
        for item in self.patches:
            item.start()

    def tearDown(self) -> None:
        for item in reversed(self.patches):
            item.stop()
        self.temp.cleanup()

    def test_empty_stores_produce_truthful_empty_metrics(self) -> None:
        result = operational_telemetry.get_operational_telemetry("7d")
        self.assertEqual(result["source"], "live_events")
        self.assertFalse(result["has_data"])
        self.assertEqual(result["summary"]["total_executions"], 0)
        self.assertIsNone(result["summary"]["success_rate"])
        self.assertEqual(result["series"], [])

    def test_metrics_are_calculated_from_persisted_events(self) -> None:
        now = datetime.now(timezone.utc).replace(microsecond=0)
        agent_runtime.init_agent_runtime_db()
        mission_planner.init_mission_db()
        tool_audit.init_tool_audit_db()
        with closing(sqlite3.connect(self.paths["agent"])) as connection, connection:
            connection.execute(
                """INSERT INTO agent_conversations
                (id, scope_type, scope_id, provider, model, status, created_at, updated_at)
                VALUES ('c', 'chat', 'c', 'openai', 'test-model', 'active', ?, ?)""",
                (now.isoformat(), now.isoformat()),
            )
            connection.execute(
                """INSERT INTO agent_runs
                (conversation_id, provider, model, attempt, status, input_hash,
                 usage_json, started_at, completed_at)
                VALUES ('c', 'openai', 'test-model', 1, 'completed', 'hash', ?, ?, ?)""",
                (json.dumps({"input_tokens": 4, "output_tokens": 6}), (now - timedelta(seconds=1)).isoformat(), now.isoformat()),
            )
        tool_audit.record_tool_audit_event(
            "test_tool", "test", "blocked", "test", actor="agent", side_effect=True
        )
        tool_audit.record_tool_audit_event("allowed_but_not_run", "test", "allowed", "test", side_effect=True)
        for status in ("succeeded", "failed"):
            started = tool_audit.record_audit_event("capability.execution", "execution", status="started", actor="test")
            tool_audit.complete_audit_event(started["id"], status=status, duration_ms=1000)
        tool_audit.record_audit_event("capability.execution", "execution", status="started")
        nested = tool_audit.record_audit_event("internal.operation", "action", status="started")
        tool_audit.complete_audit_event(nested["id"], status="succeeded", duration_ms=50)
        with closing(sqlite3.connect(self.paths["mission"])) as connection, connection:
            connection.execute(
                """INSERT INTO mission_transitions
                (mission_id, entity_type, from_state, to_state, cause, actor, created_at)
                VALUES (1, 'mission', 'running', 'completed', 'test', 'test', ?)""",
                (now.isoformat(),),
            )
        result = operational_telemetry.get_operational_telemetry("24h", now=now + timedelta(seconds=1))
        self.assertTrue(result["has_data"])
        self.assertEqual(result["summary"]["total_executions"], 2)
        self.assertEqual(result["summary"]["success_rate"], 50.0)
        self.assertEqual(result["summary"]["average_latency_ms"], 1000)
        self.assertEqual(result["summary"]["token_usage"], 10)
        self.assertEqual(result["agent_runs"], {"completed": 1, "success_rate": 100.0})
        self.assertEqual(result["outcomes"], [{"label": "completed", "count": 1}])

    def test_frontend_contains_no_legacy_synthetic_operational_fixtures(self) -> None:
        source = (Path(__file__).parents[2] / "frontend/src/components/aurora/analytics-overview.tsx").read_text()
        for forbidden in ("const trendData", "const agents =", "const outcomes =", "const heatmap =", "99.6", "87.4%", "+9.6%"):
            self.assertNotIn(forbidden, source)
        self.assertIn("persisted events", source)
        self.assertIn("No operational events exist", source)


if __name__ == "__main__":
    unittest.main()
