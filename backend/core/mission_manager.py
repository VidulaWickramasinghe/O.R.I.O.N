"""Durable mission continuation handling for approval-gated work."""

from typing import Any, Dict, Optional

from core.approvals import (
    get_approval_request,
    get_mission_continuation,
    list_recoverable_mission_continuations,
    mark_mission_continuation_resolved,
)
from core.capability_gateway import requires_gateway
from core.mission_planner import (
    get_mission_record,
    update_mission_status_record,
    update_mission_step_status_record,
)
from core.mission_run_history import (
    bind_mission_run_approval,
    get_mission_run,
    update_mission_run_after_approval,
)


def _validated_ownership(
    approval_id: int,
) -> tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    continuation = get_mission_continuation(int(approval_id))
    approval = get_approval_request(int(approval_id))
    if not continuation or not approval:
        raise ValueError("Approval mission continuation was not found.")

    mission_id = int(continuation["mission_id"])
    step_id = int(continuation["step_id"])
    run_id = continuation.get("run_id")
    if int(approval.get("mission_id") or -1) != mission_id:
        raise ValueError("Approval mission does not match its continuation.")
    if int(approval.get("step_id") or -1) != step_id:
        raise ValueError("Approval step does not match its continuation.")
    if approval.get("run_id") != run_id:
        raise ValueError("Approval run does not match its continuation.")

    mission = get_mission_record(mission_id)
    if not mission:
        raise ValueError("Continuation mission was not found.")
    step = next(
        (item for item in mission.get("steps", []) if int(item["id"]) == step_id),
        None,
    )
    if not step or int(step["mission_id"]) != mission_id:
        raise ValueError("Continuation step does not belong to its mission.")

    run: Dict[str, Any] = {}
    if run_id is not None:
        found_run = get_mission_run(int(run_id))
        if not found_run:
            raise ValueError("Continuation mission run was not found.")
        if int(found_run["mission_id"]) != mission_id:
            raise ValueError("Continuation run does not belong to its mission.")
        if int(found_run.get("step_id") or -1) != step_id:
            raise ValueError("Continuation run does not belong to its step.")
        if found_run.get("approval_id") is None:
            if not bind_mission_run_approval(
                int(run_id), mission_id, step_id, int(approval_id)
            ):
                raise ValueError("Continuation run could not be bound to its approval.")
            found_run = get_mission_run(int(run_id)) or {}
        if int(found_run.get("approval_id") or -1) != int(approval_id):
            raise ValueError("Continuation run is not bound to this approval.")
        run = found_run
    return continuation, approval, mission, run


def _resolve_owned_continuation(
    approval_id: int,
    *,
    recovering: bool = False,
) -> Dict[str, Any]:
    continuation, approval, mission, run = _validated_ownership(approval_id)
    if continuation["status"] in {"resumed", "blocked", "recovery_required"}:
        return {
            "status": continuation["status"],
            "approval_id": int(approval_id),
            "mission_id": int(continuation["mission_id"]),
            "step_id": int(continuation["step_id"]),
            "run_id": continuation.get("run_id"),
            "replayed": True,
        }

    mission_id = int(continuation["mission_id"])
    step_id = int(continuation["step_id"])
    run_id: Optional[int] = continuation.get("run_id")
    approval_status = str(approval["status"])
    result = str(approval.get("result", ""))

    if approval_status == "pending":
        if recovering:
            update_mission_step_status_record(step_id, "waiting_approval")
            update_mission_status_record(mission_id, "waiting_approval")
        return {
            "status": "waiting_approval",
            "approval_id": int(approval_id),
            "mission_id": mission_id,
            "step_id": step_id,
            "run_id": run_id,
            "replayed": False,
        }

    if approval_status == "executing":
        if not recovering:
            return {
                "status": "executing",
                "approval_id": int(approval_id),
                "mission_id": mission_id,
                "step_id": step_id,
                "run_id": run_id,
                "replayed": False,
            }
        update_mission_step_status_record(step_id, "blocked")
        update_mission_status_record(mission_id, "blocked")
        if run_id is not None and not update_mission_run_after_approval(
            int(run_id),
            int(approval_id),
            "recovery_required",
            error="Approval execution was interrupted; manual recovery is required.",
        ):
            raise ValueError("Interrupted mission run could not be marked for recovery.")
        resolved = mark_mission_continuation_resolved(
            int(approval_id),
            "recovery_required",
            "execution_interrupted",
            "Manual recovery required; the side effect may have partially completed.",
        )
        return {**resolved, "replayed": False}

    if approval_status == "approved":
        update_mission_step_status_record(step_id, "pending")
        update_mission_status_record(mission_id, "in_progress")
        if run_id is not None and not update_mission_run_after_approval(
            int(run_id), int(approval_id), "approval_resolved", output=result
        ):
            raise ValueError("Approved mission run could not be resumed.")
        resolved = mark_mission_continuation_resolved(
            int(approval_id), "resumed", "approved", result
        )
        return {**resolved, "replayed": False}

    if approval_status in {"rejected", "failed"}:
        update_mission_step_status_record(step_id, "blocked")
        update_mission_status_record(mission_id, "blocked")
        if run_id is not None and not update_mission_run_after_approval(
            int(run_id),
            int(approval_id),
            "approval_rejected",
            error=result or f"Approval {approval_status}.",
        ):
            raise ValueError("Rejected mission run could not be blocked.")
        resolved = mark_mission_continuation_resolved(
            int(approval_id), "blocked", approval_status, result
        )
        return {**resolved, "replayed": False}

    raise ValueError(f"Unsupported approval state: {approval_status}.")


@requires_gateway
def resolve_mission_continuation(approval_id: int) -> Dict[str, Any]:
    """Resolve only the mission step and run bound to this approval."""

    return _resolve_owned_continuation(int(approval_id))


@requires_gateway
def recover_mission_continuations(limit: int = 100) -> Dict[str, Any]:
    """Reconcile durable approval continuations after a backend restart."""

    recovered = []
    errors = []
    for continuation in list_recoverable_mission_continuations(limit=limit):
        try:
            result = _resolve_owned_continuation(
                int(continuation["approval_id"]), recovering=True
            )
            recovered.append(result)
        except Exception as error:
            errors.append(
                {
                    "approval_id": int(continuation["approval_id"]),
                    "error": f"{type(error).__name__}: {error}",
                }
            )
    return {"recovered": recovered, "errors": errors}
