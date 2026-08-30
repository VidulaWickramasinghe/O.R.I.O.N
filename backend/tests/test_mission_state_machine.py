"""Lifecycle and fault-injection tests for the durable mission state machine."""

import tempfile
import time
import unittest
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import Mock, patch

from core import capability_gateway, mission_manager, mission_planner
from core.capability_gateway import CapabilityContext, CapabilityDeniedError


@contextmanager
def gateway(capability: str, **context):
    with patch.object(
        capability_gateway, "_policy_snapshot", return_value=("mission-test", set())
    ), patch.object(
        capability_gateway,
        "_plugin_decision",
        return_value=(True, "allowed", "medium", "mission"),
    ), patch.object(capability_gateway, "_audit"):
        with capability_gateway.authorized(
            capability,
            capability_gateway.test_context(capability, **context),
        ):
            yield


class DurableMissionStateMachineTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.database_patch = patch.object(
            mission_planner,
            "DB_PATH",
            Path(self.temporary_directory.name) / "missions.sqlite",
        )
        self.database_patch.start()

    def tearDown(self) -> None:
        self.database_patch.stop()
        self.temporary_directory.cleanup()

    def create_mission(self, steps=None):
        with gateway("create_mission"):
            mission_id = mission_planner.create_mission_record(
                "Durable mission",
                "Exercise every lifecycle transition",
                steps or ["First step"],
            )
        mission = mission_planner.get_mission_record(mission_id)
        return mission_id, mission

    def test_completed_mission_survives_restart_and_every_transition_has_checkpoint(self) -> None:
        mission_id, mission = self.create_mission()
        step_id = int(mission["steps"][0]["id"])
        with gateway("run_mission_step", mission_id=mission_id, step_id=step_id):
            lease = mission_manager.acquire_mission_lease(mission_id, "test-runner", 30)
            mission_manager.transition_step_state(
                step_id,
                "running",
                cause="test_run_started",
                actor="test-runner",
                run_id=11,
            )
            result = mission_manager.evaluate_mission_step(
                mission_id,
                step_id,
                11,
                "completed",
                cause="assertions_passed",
            )
            mission_manager.release_mission_lease(
                mission_id, lease["lease_id"], "test-runner"
            )

        mission_planner.init_mission_db()  # Simulated process restart.
        restored = mission_planner.get_mission_record(mission_id)
        transitions = mission_manager.list_mission_transitions(mission_id)
        checkpoints = mission_manager.list_mission_checkpoints(mission_id)

        self.assertEqual(result["mission_status"], "completed")
        self.assertEqual(restored["status"], "completed")
        self.assertEqual(restored["steps"][0]["status"], "completed")
        self.assertTrue(all(item["cause"] for item in transitions))
        self.assertEqual(len(checkpoints), len(transitions))
        self.assertTrue(all(item["snapshot"] for item in checkpoints))

    def test_pause_resume_and_cancel_are_durable_and_cancel_blocks_later_execution(self) -> None:
        mission_id, mission = self.create_mission(["First", "Second"])
        first_step = int(mission["steps"][0]["id"])
        with gateway("run_mission_step", mission_id=mission_id, step_id=first_step):
            mission_manager.acquire_mission_lease(mission_id, "test-runner", 30)
            mission_manager.transition_step_state(
                first_step, "running", cause="started", actor="test-runner"
            )
        with gateway("pause_mission", mission_id=mission_id):
            mission_manager.pause_mission(mission_id, "User paused", "user")
        self.assertEqual(mission_planner.get_mission_record(mission_id)["status"], "paused")

        with gateway("resume_mission", mission_id=mission_id):
            mission_manager.resume_mission(mission_id, "User resumed", "user")
        resumed = mission_planner.get_mission_record(mission_id)
        self.assertEqual(resumed["status"], "ready")
        self.assertEqual(resumed["steps"][0]["status"], "pending")

        with gateway("cancel_mission", mission_id=mission_id):
            mission_manager.cancel_mission(mission_id, "User cancelled", "user")
        cancelled = mission_planner.get_mission_record(mission_id)
        self.assertEqual(cancelled["status"], "cancelled")
        self.assertTrue(all(step["status"] == "cancelled" for step in cancelled["steps"]))
        with self.assertRaises(mission_manager.MissionTransitionError):
            mission_manager.assert_mission_execution_allowed(mission_id)
        with gateway("run_mission_step", mission_id=mission_id, step_id=first_step):
            with self.assertRaises(mission_manager.MissionTransitionError):
                mission_manager.transition_step_state(
                    first_step,
                    "running",
                    cause="late execution",
                    actor="test-runner",
                )

    def test_retries_are_explicit_and_bounded(self) -> None:
        mission_id, mission = self.create_mission()
        step_id = int(mission["steps"][0]["id"])

        for attempt in range(1, 4):
            with gateway("run_mission_step", mission_id=mission_id, step_id=step_id):
                mission_manager.acquire_mission_lease(
                    mission_id, f"runner-{attempt}", 30
                )
                mission_manager.transition_step_state(
                    step_id,
                    "running",
                    cause=f"attempt_{attempt}",
                    actor="test-runner",
                    run_id=attempt,
                )
                mission_manager.evaluate_mission_step(
                    mission_id,
                    step_id,
                    attempt,
                    "retryable_failure",
                    cause=f"failure_{attempt}",
                    error="Injected provider failure",
                )
            if attempt < 3:
                with gateway("retry_mission_step", mission_id=mission_id, step_id=step_id):
                    mission_manager.retry_mission_step(
                        step_id, f"retry_{attempt}", "user"
                    )

        failed = mission_planner.get_mission_record(mission_id)
        self.assertEqual(failed["steps"][0]["attempt_count"], 3)
        with gateway("retry_mission_step", mission_id=mission_id, step_id=step_id):
            with self.assertRaisesRegex(
                mission_manager.MissionTransitionError, "retry limit"
            ):
                mission_manager.retry_mission_step(step_id, "retry again", "user")

    def test_expired_lease_requires_recovery_instead_of_automatic_reexecution(self) -> None:
        mission_id, mission = self.create_mission()
        step_id = int(mission["steps"][0]["id"])
        with gateway("run_mission_step", mission_id=mission_id, step_id=step_id):
            lease = mission_manager.acquire_mission_lease(mission_id, "crashed-runner", 5)
            mission_manager.transition_step_state(
                step_id, "running", cause="crash_test", actor="crashed-runner"
            )
        with gateway("recover_mission_state", mission_id=mission_id):
            recovered = mission_manager.recover_expired_mission_leases(
                float(lease["expires_at_epoch"]) + 1
            )

        state = mission_planner.get_mission_record(mission_id)
        self.assertEqual(recovered["recovered_mission_ids"], [mission_id])
        self.assertEqual(state["status"], "recovery_required")
        self.assertEqual(state["steps"][0]["status"], "failed")
        self.assertIn("expired", state["steps"][0]["last_error"].lower())

    def test_gateway_blocks_mission_agent_tools_after_cancellation(self) -> None:
        mission_id, _mission = self.create_mission()
        with gateway("cancel_mission", mission_id=mission_id):
            mission_manager.cancel_mission(mission_id, "Stop", "user")
        operation = Mock(return_value="unsafe")
        context = CapabilityContext(
            actor="mission_agent",
            source="mission_runner",
            mission_id=mission_id,
        )
        with patch.object(
            capability_gateway, "_policy_snapshot", return_value=("mission-test", set())
        ), patch.object(
            capability_gateway,
            "_plugin_decision",
            return_value=(True, "allowed", "medium", "mission"),
        ), patch.object(capability_gateway, "_audit"):
            with self.assertRaises(CapabilityDeniedError):
                capability_gateway.execute_capability(
                    "remember_information", context, operation
                )
        operation.assert_not_called()

    def test_evaluator_cancellation_cancels_every_remaining_step(self) -> None:
        mission_id, mission = self.create_mission(["First", "Second"])
        first_step = int(mission["steps"][0]["id"])
        with gateway("run_mission_step", mission_id=mission_id, step_id=first_step):
            mission_manager.acquire_mission_lease(mission_id, "cancel-runner", 30)
            mission_manager.transition_step_state(
                first_step, "running", cause="started", actor="cancel-runner", run_id=22
            )
            mission_manager.evaluate_mission_step(
                mission_id,
                first_step,
                22,
                "cancelled",
                cause="evaluator_cancelled",
            )
        cancelled = mission_planner.get_mission_record(mission_id)
        self.assertEqual(cancelled["status"], "cancelled")
        self.assertTrue(all(step["status"] == "cancelled" for step in cancelled["steps"]))


if __name__ == "__main__":
    unittest.main()
