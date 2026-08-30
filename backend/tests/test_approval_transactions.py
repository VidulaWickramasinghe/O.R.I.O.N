"""Transactional approval and mission continuation regression coverage."""

import tempfile
import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import Mock, patch

import api_main
from core import approvals, capability_gateway, mission_manager, mission_planner
from core import mission_run_history
from core.capability_gateway import authorized, test_context
from core.capability_gateway import CapabilityDeniedError


class SimulatedProcessCrash(BaseException):
    pass


class ApprovalTransactionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        root = Path(self.temporary_directory.name)
        self.patchers = [
            patch.object(approvals, "DB_PATH", root / "approvals.sqlite"),
            patch.object(mission_planner, "DB_PATH", root / "missions.sqlite"),
            patch.object(mission_run_history, "DB_PATH", root / "runs.sqlite"),
            patch.object(
                capability_gateway,
                "_policy_snapshot",
                return_value=("balanced-test", set()),
            ),
            patch.object(
                capability_gateway,
                "_plugin_decision",
                return_value=(True, "allowed", "high", "test"),
            ),
            patch.object(capability_gateway, "_audit"),
            patch.object(api_main, "log_activity"),
        ]
        for patcher in self.patchers:
            patcher.start()
        approvals.init_approval_db()
        mission_planner.init_mission_db()
        mission_run_history.init_mission_run_db()

    def tearDown(self) -> None:
        for patcher in reversed(self.patchers):
            patcher.stop()
        self.temporary_directory.cleanup()

    @contextmanager
    def gateway(self, capability: str, **identity):
        with authorized(capability, test_context(capability, **identity)):
            yield

    def create_approval(
        self,
        *,
        key: str = "approval-key",
        payload: dict | None = None,
        **identity,
    ) -> int:
        with self.gateway("write_project_file", **identity):
            return approvals.create_approval_request(
                action_type="WRITE_PROJECT_FILE",
                title="Write test file",
                description="Regression test approval",
                payload=payload or {"path": "test.txt", "content": "safe"},
                idempotency_key=key,
            )

    def claim(self, approval_id: int, key: str = "approval-key") -> dict:
        with self.gateway("execute_approved_action", approval_id=approval_id):
            return approvals.claim_approval_execution(approval_id, "test", key)

    def test_idempotency_key_reuses_identical_request_and_rejects_conflict(self) -> None:
        first = self.create_approval()
        second = self.create_approval()
        self.assertEqual(first, second)
        with self.assertRaisesRegex(ValueError, "different action or payload"):
            self.create_approval(payload={"path": "other.txt", "content": "changed"})
        self.assertEqual(len(approvals.list_approval_requests()), 1)

    def test_concurrent_api_callers_execute_exactly_once_and_replay_result(self) -> None:
        approval_id = self.create_approval()
        executions = 0
        lock = threading.Lock()

        def executor(_approval_id, _approval):
            nonlocal executions
            with lock:
                executions += 1
            time.sleep(0.05)
            return "side effect completed"

        def approve() -> dict:
            with self.gateway("execute_approved_action", approval_id=approval_id):
                return api_main.approve_request(approval_id, "approval-key")

        with patch.object(api_main, "execute_approved_dev_action", side_effect=executor):
            with ThreadPoolExecutor(max_workers=8) as pool:
                results = list(pool.map(lambda _index: approve(), range(8)))
            replay = approve()

        self.assertEqual(executions, 1)
        self.assertEqual(sum(item["status"] == "approved" for item in results), 1)
        self.assertTrue(all(item["status"] in {"executing", "approved"} for item in results))
        self.assertEqual(replay["status"], "approved")
        self.assertTrue(replay["replayed"])
        execution = approvals.get_approval_execution(approval_id)
        self.assertEqual(execution["status"], "succeeded")
        self.assertEqual(execution["result"], "side effect completed")

    def test_terminal_rows_cannot_transition_or_execute_again(self) -> None:
        approval_id = self.create_approval()
        claim = self.claim(approval_id)
        with self.gateway("execute_approved_action", approval_id=approval_id):
            approvals.complete_approval_execution(
                approval_id, int(claim["execution_id"]), "done"
            )
            replay = approvals.claim_approval_execution(
                approval_id, "test", "approval-key"
            )
            with self.assertRaisesRegex(ValueError, "no longer active"):
                approvals.complete_approval_execution(
                    approval_id, int(claim["execution_id"]), "again"
                )
        with self.gateway("reject_approval", approval_id=approval_id):
            rejection = approvals.reject_approval_request(approval_id)

        self.assertFalse(replay["claimed"])
        self.assertEqual(replay["status"], "approved")
        self.assertFalse(rejection["transitioned"])
        self.assertEqual(rejection["status"], "approved")

    def test_rejected_and_failed_rows_are_also_terminal(self) -> None:
        rejected_id = self.create_approval(key="rejected-key")
        with self.gateway("reject_approval", approval_id=rejected_id):
            first_rejection = approvals.reject_approval_request(rejected_id, "Denied")
            replay_rejection = approvals.reject_approval_request(rejected_id, "Again")
        with self.gateway("execute_approved_action", approval_id=rejected_id):
            rejected_claim = approvals.claim_approval_execution(
                rejected_id, "test", "rejected-key"
            )

        failed_id = self.create_approval(key="failed-key")
        failed_claim = self.claim(failed_id, "failed-key")
        with self.gateway("execute_approved_action", approval_id=failed_id):
            approvals.fail_approval_execution(
                failed_id, int(failed_claim["execution_id"]), "Executor failed"
            )
            failed_replay = approvals.claim_approval_execution(
                failed_id, "test", "failed-key"
            )
            with self.assertRaisesRegex(ValueError, "no longer active"):
                approvals.fail_approval_execution(
                    failed_id, int(failed_claim["execution_id"]), "Again"
                )
        with self.gateway("reject_approval", approval_id=failed_id):
            reject_failed = approvals.reject_approval_request(failed_id)

        self.assertTrue(first_rejection["transitioned"])
        self.assertFalse(replay_rejection["transitioned"])
        self.assertFalse(rejected_claim["claimed"])
        self.assertEqual(rejected_claim["status"], "rejected")
        self.assertFalse(failed_replay["claimed"])
        self.assertEqual(failed_replay["status"], "failed")
        self.assertFalse(reject_failed["transitioned"])

    def test_payload_tampering_is_denied_before_executor_runs(self) -> None:
        approval_id = self.create_approval()
        with approvals.get_connection() as connection:
            connection.execute(
                "UPDATE approval_requests SET payload_json = ? WHERE id = ?",
                ('{"path":"changed.txt","content":"unsafe"}', approval_id),
            )
            connection.commit()
        executor = Mock()
        with patch.object(api_main, "execute_approved_dev_action", executor):
            with self.assertRaises(CapabilityDeniedError):
                with self.gateway("execute_approved_action", approval_id=approval_id):
                    api_main.approve_request(approval_id, "approval-key")
        executor.assert_not_called()

    def test_crash_after_claim_leaves_recoverable_execution_record(self) -> None:
        approval_id = self.create_approval()

        def crash(_approval_id, _approval):
            raise SimulatedProcessCrash("process terminated")

        with patch.object(api_main, "execute_approved_dev_action", side_effect=crash):
            with self.gateway("execute_approved_action", approval_id=approval_id):
                with self.assertRaises(SimulatedProcessCrash):
                    api_main.approve_request(approval_id, "approval-key")

        approvals.init_approval_db()  # Simulate opening the durable store after restart.
        approval = approvals.get_approval_request(approval_id)
        execution = approvals.get_approval_execution(approval_id)
        self.assertEqual(approval["status"], "executing")
        self.assertEqual(execution["status"], "executing")
        self.assertEqual(execution["payload_hash"], approval["payload_hash"])
        self.assertEqual(execution["idempotency_key"], "approval-key")

    def _create_waiting_mission(self) -> tuple[int, int, int, int, int]:
        with self.gateway("create_mission"):
            mission_id = mission_planner.create_mission_record(
                "Approval mission", "Perform one approved action", ["First", "Second"]
            )
        mission = mission_planner.get_mission_record(mission_id)
        first_step = int(mission["steps"][0]["id"])
        second_step = int(mission["steps"][1]["id"])
        with self.gateway("run_mission_step", mission_id=mission_id, step_id=first_step):
            run_id = mission_run_history.start_mission_run(
                mission_id, mission["title"], first_step, "First"
            )
        approval_id = self.create_approval(
            key="",
            mission_id=mission_id,
            step_id=first_step,
            run_id=run_id,
        )
        with self.gateway("run_mission_step", mission_id=mission_id, step_id=first_step):
            mission_planner.update_mission_step_status_record(first_step, "waiting_approval")
            mission_planner.update_mission_step_status_record(second_step, "waiting_approval")
            mission_run_history.complete_mission_run(
                run_id,
                "waiting_approval",
                "Approval requested",
                approval_id=approval_id,
            )
        return mission_id, first_step, second_step, run_id, approval_id

    def test_restart_binds_approval_created_just_before_runner_crash(self) -> None:
        with self.gateway("create_mission"):
            mission_id = mission_planner.create_mission_record(
                "Crash window", "Create an approval", ["Only step"]
            )
        mission = mission_planner.get_mission_record(mission_id)
        step_id = int(mission["steps"][0]["id"])
        with self.gateway("run_mission_step", mission_id=mission_id, step_id=step_id):
            run_id = mission_run_history.start_mission_run(
                mission_id, mission["title"], step_id, "Only step"
            )
        approval_id = self.create_approval(
            key="",
            mission_id=mission_id,
            step_id=step_id,
            run_id=run_id,
        )

        with self.gateway("recover_mission_continuations"):
            recovery = mission_manager.recover_mission_continuations()

        recovered_mission = mission_planner.get_mission_record(mission_id)
        run = mission_run_history.get_mission_run(run_id)
        self.assertEqual(recovery["errors"], [])
        self.assertEqual(recovered_mission["steps"][0]["status"], "waiting_approval")
        self.assertEqual(recovered_mission["status"], "waiting_approval")
        self.assertEqual(run["status"], "waiting_approval")
        self.assertEqual(run["approval_id"], approval_id)

    def test_approved_action_resumes_only_its_owning_step_and_is_not_duplicated(self) -> None:
        mission_id, first_step, second_step, run_id, approval_id = (
            self._create_waiting_mission()
        )
        duplicate_id = self.create_approval(
            key="",
            mission_id=mission_id,
            step_id=first_step,
            run_id=run_id,
        )
        self.assertEqual(duplicate_id, approval_id)

        claim = self.claim(approval_id, approvals.get_approval_request(approval_id)["idempotency_key"])
        with self.gateway("execute_approved_action", approval_id=approval_id):
            approvals.complete_approval_execution(
                approval_id, int(claim["execution_id"]), "file written"
            )
        with self.gateway(
            "resolve_mission_continuation",
            approval_id=approval_id,
            mission_id=mission_id,
            step_id=first_step,
            run_id=run_id,
        ):
            resolved = mission_manager.resolve_mission_continuation(approval_id)

        mission = mission_planner.get_mission_record(mission_id)
        statuses = {int(step["id"]): step["status"] for step in mission["steps"]}
        self.assertEqual(resolved["status"], "resumed")
        self.assertEqual(statuses[first_step], "pending")
        self.assertEqual(statuses[second_step], "waiting_approval")
        self.assertEqual(mission_run_history.get_mission_run(run_id)["status"], "approval_resolved")
        self.assertEqual(len(approvals.list_approval_requests()), 1)

    def test_rejection_blocks_only_owning_step(self) -> None:
        mission_id, first_step, second_step, run_id, approval_id = (
            self._create_waiting_mission()
        )
        with self.gateway("reject_approval", approval_id=approval_id):
            approvals.reject_approval_request(approval_id, "Denied")
        with self.gateway(
            "resolve_mission_continuation",
            approval_id=approval_id,
            mission_id=mission_id,
            step_id=first_step,
            run_id=run_id,
        ):
            resolved = mission_manager.resolve_mission_continuation(approval_id)

        mission = mission_planner.get_mission_record(mission_id)
        statuses = {int(step["id"]): step["status"] for step in mission["steps"]}
        self.assertEqual(resolved["status"], "blocked")
        self.assertEqual(statuses[first_step], "blocked")
        self.assertEqual(statuses[second_step], "waiting_approval")
        self.assertEqual(mission_run_history.get_mission_run(run_id)["status"], "approval_rejected")

    def test_restart_recovery_marks_interrupted_exact_continuation(self) -> None:
        mission_id, first_step, second_step, run_id, approval_id = (
            self._create_waiting_mission()
        )
        self.claim(
            approval_id,
            approvals.get_approval_request(approval_id)["idempotency_key"],
        )
        with self.gateway("recover_mission_continuations"):
            recovery = mission_manager.recover_mission_continuations()

        self.assertEqual(recovery["errors"], [])
        continuation = approvals.get_mission_continuation(approval_id)
        mission = mission_planner.get_mission_record(mission_id)
        statuses = {int(step["id"]): step["status"] for step in mission["steps"]}
        self.assertEqual(continuation["status"], "recovery_required")
        self.assertEqual(statuses[first_step], "blocked")
        self.assertEqual(statuses[second_step], "waiting_approval")
        self.assertEqual(mission_run_history.get_mission_run(run_id)["status"], "recovery_required")

    def test_restart_recovery_resumes_approved_and_blocks_rejected_steps(self) -> None:
        approved = self._create_waiting_mission()
        mission_id, first_step, second_step, run_id, approval_id = approved
        claim = self.claim(
            approval_id,
            approvals.get_approval_request(approval_id)["idempotency_key"],
        )
        with self.gateway("execute_approved_action", approval_id=approval_id):
            approvals.complete_approval_execution(
                approval_id, int(claim["execution_id"]), "completed before restart"
            )
        with self.gateway("recover_mission_continuations"):
            approved_recovery = mission_manager.recover_mission_continuations()
        approved_statuses = {
            int(step["id"]): step["status"]
            for step in mission_planner.get_mission_record(mission_id)["steps"]
        }

        rejected = self._create_waiting_mission()
        rejected_mission, rejected_step, rejected_other, rejected_run, rejected_id = rejected
        with self.gateway("reject_approval", approval_id=rejected_id):
            approvals.reject_approval_request(rejected_id, "Denied before restart")
        with self.gateway("recover_mission_continuations"):
            rejected_recovery = mission_manager.recover_mission_continuations()
        rejected_statuses = {
            int(step["id"]): step["status"]
            for step in mission_planner.get_mission_record(rejected_mission)["steps"]
        }

        self.assertEqual(approved_recovery["errors"], [])
        self.assertEqual(approved_statuses[first_step], "pending")
        self.assertEqual(approved_statuses[second_step], "waiting_approval")
        self.assertEqual(mission_run_history.get_mission_run(run_id)["status"], "approval_resolved")
        self.assertEqual(rejected_recovery["errors"], [])
        self.assertEqual(rejected_statuses[rejected_step], "blocked")
        self.assertEqual(rejected_statuses[rejected_other], "waiting_approval")
        self.assertEqual(mission_run_history.get_mission_run(rejected_run)["status"], "approval_rejected")


if __name__ == "__main__":
    unittest.main()
