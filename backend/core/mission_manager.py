"""Durable, transition-driven mission lifecycle and approval continuation."""

from __future__ import annotations

import json
import sqlite3
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from core.approvals import (
    get_approval_request,
    get_mission_continuation,
    list_recoverable_mission_continuations,
    mark_mission_continuation_resolved,
)
from core.capability_gateway import requires_gateway
from core.mission_planner import get_connection, get_mission_record, init_mission_db
from core.mission_run_history import (
    bind_mission_run_approval,
    get_mission_run,
    update_mission_run_after_approval,
)


MISSION_STATES = frozenset(
    {
        "planned",
        "ready",
        "running",
        "waiting_approval",
        "paused",
        "completed",
        "failed",
        "cancelled",
        "recovery_required",
    }
)
MISSION_TERMINAL_STATES = frozenset({"completed", "cancelled"})
MISSION_STATE_ALIASES = {
    "in_progress": "running",
    "complete": "completed",
    "blocked": "failed",
}
MISSION_TRANSITIONS = {
    "planned": {"ready", "running", "waiting_approval", "paused", "failed", "cancelled", "recovery_required"},
    "ready": {"running", "waiting_approval", "paused", "failed", "cancelled"},
    "running": {
        "ready",
        "waiting_approval",
        "paused",
        "completed",
        "failed",
        "cancelled",
        "recovery_required",
    },
    "waiting_approval": {
        "ready",
        "running",
        "paused",
        "failed",
        "cancelled",
        "recovery_required",
    },
    "paused": {"ready", "cancelled", "recovery_required"},
    "failed": {"ready", "cancelled", "recovery_required"},
    "recovery_required": {"ready", "paused", "failed", "cancelled"},
    "completed": set(),
    "cancelled": set(),
}

STEP_STATES = frozenset(
    {
        "pending",
        "retry_pending",
        "running",
        "waiting_approval",
        "paused",
        "completed",
        "failed",
        "blocked",
        "cancelled",
    }
)
STEP_TERMINAL_STATES = frozenset({"completed", "cancelled"})
STEP_TRANSITIONS = {
    "pending": {"running", "waiting_approval", "paused", "completed", "failed", "blocked", "cancelled"},
    "retry_pending": {"running", "paused", "cancelled"},
    "running": {"waiting_approval", "paused", "completed", "failed", "blocked", "cancelled"},
    "waiting_approval": {"pending", "running", "paused", "failed", "blocked", "cancelled"},
    "paused": {"pending", "retry_pending", "cancelled"},
    "failed": {"retry_pending", "cancelled"},
    "blocked": {"retry_pending", "cancelled"},
    "completed": set(),
    "cancelled": set(),
}

EVALUATOR_OUTCOMES = frozenset(
    {
        "completed",
        "waiting_approval",
        "retryable_failure",
        "terminal_failure",
        "blocked",
        "cancelled",
    }
)
OUTCOME_STEP_STATE = {
    "completed": "completed",
    "waiting_approval": "waiting_approval",
    "retryable_failure": "failed",
    "terminal_failure": "failed",
    "blocked": "blocked",
    "cancelled": "cancelled",
}


class MissionTransitionError(ValueError):
    """Raised when a mission command violates the durable state machine."""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _required_text(value: str, label: str) -> str:
    clean = str(value or "").strip()
    if not clean:
        raise MissionTransitionError(f"Mission transition {label} is required.")
    return clean[:500]


def _mission_state(value: str) -> str:
    state = MISSION_STATE_ALIASES.get(str(value).strip(), str(value).strip())
    if state not in MISSION_STATES:
        raise MissionTransitionError(f"Invalid mission state: {value}.")
    return state


def _step_state(value: str) -> str:
    state = str(value).strip()
    if state not in STEP_STATES:
        raise MissionTransitionError(f"Invalid mission step state: {value}.")
    return state


def _row(connection: sqlite3.Connection, query: str, values: tuple[Any, ...]) -> Optional[Dict[str, Any]]:
    connection.row_factory = sqlite3.Row
    found = connection.execute(query, values).fetchone()
    return dict(found) if found else None


def _snapshot(connection: sqlite3.Connection, mission_id: int) -> Dict[str, Any]:
    mission = _row(connection, "SELECT * FROM missions WHERE id = ?", (int(mission_id),))
    if not mission:
        raise MissionTransitionError("Mission was not found.")
    steps = connection.execute(
        "SELECT * FROM mission_steps WHERE mission_id = ? ORDER BY position ASC",
        (int(mission_id),),
    ).fetchall()
    lease = _row(
        connection,
        "SELECT lease_id, owner, acquired_at, renewed_at, expires_at_epoch FROM mission_leases WHERE mission_id = ?",
        (int(mission_id),),
    )
    mission["steps"] = [dict(step) for step in steps]
    mission["lease"] = lease
    return mission


def _record_transition(
    connection: sqlite3.Connection,
    *,
    mission_id: int,
    entity_type: str,
    from_state: str,
    to_state: str,
    cause: str,
    actor: str,
    step_id: Optional[int] = None,
    run_id: Optional[int] = None,
    evaluator_outcome: str = "",
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    now = _now()
    transition = connection.execute(
        """
        INSERT INTO mission_transitions
        (mission_id, step_id, run_id, entity_type, from_state, to_state,
         cause, actor, evaluator_outcome, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            int(mission_id),
            int(step_id) if step_id is not None else None,
            int(run_id) if run_id is not None else None,
            entity_type,
            from_state,
            to_state,
            cause,
            actor,
            evaluator_outcome,
            json.dumps(metadata or {}, sort_keys=True),
            now,
        ),
    )
    transition_id = int(transition.lastrowid)
    snapshot = _snapshot(connection, mission_id)
    checkpoint = connection.execute(
        """
        INSERT INTO mission_checkpoints
        (mission_id, step_id, run_id, transition_id, cause, snapshot_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            int(mission_id),
            int(step_id) if step_id is not None else None,
            int(run_id) if run_id is not None else None,
            transition_id,
            cause,
            json.dumps(snapshot, sort_keys=True),
            now,
        ),
    )
    checkpoint_id = int(checkpoint.lastrowid)
    connection.execute(
        "UPDATE missions SET last_transition_id = ? WHERE id = ?",
        (transition_id, int(mission_id)),
    )
    if step_id is not None:
        connection.execute(
            "UPDATE mission_steps SET checkpoint_id = ? WHERE id = ? AND mission_id = ?",
            (checkpoint_id, int(step_id), int(mission_id)),
        )
    return {
        "id": transition_id,
        "checkpoint_id": checkpoint_id,
        "mission_id": int(mission_id),
        "step_id": int(step_id) if step_id is not None else None,
        "run_id": int(run_id) if run_id is not None else None,
        "entity_type": entity_type,
        "from_state": from_state,
        "to_state": to_state,
        "cause": cause,
        "actor": actor,
        "evaluator_outcome": evaluator_outcome,
        "metadata": metadata or {},
        "created_at": now,
    }


def _apply_mission_transition(
    connection: sqlite3.Connection,
    mission_id: int,
    to_state: str,
    *,
    cause: str,
    actor: str,
    run_id: Optional[int] = None,
    metadata: Optional[Dict[str, Any]] = None,
    expected_version: Optional[int] = None,
    terminal_reason: str = "",
) -> Dict[str, Any]:
    mission = _row(connection, "SELECT * FROM missions WHERE id = ?", (int(mission_id),))
    if not mission:
        raise MissionTransitionError("Mission was not found.")
    current = _mission_state(str(mission["status"]))
    target = _mission_state(to_state)
    if expected_version is not None and int(mission.get("state_version") or 1) != int(expected_version):
        raise MissionTransitionError("Mission state changed before this transition was applied.")
    if current == target:
        return {"transitioned": False, "replayed": True, "mission_id": int(mission_id), "status": target}
    if target not in MISSION_TRANSITIONS[current]:
        raise MissionTransitionError(f"Mission transition {current} -> {target} is not allowed.")
    if target == "completed":
        incomplete = connection.execute(
            "SELECT COUNT(*) FROM mission_steps WHERE mission_id = ? AND status != 'completed'",
            (int(mission_id),),
        ).fetchone()[0]
        if int(incomplete):
            raise MissionTransitionError("Mission cannot complete while steps remain incomplete.")

    now = _now()
    paused_at = now if target == "paused" else str(mission.get("paused_at") or "")
    cancelled_at = now if target == "cancelled" else str(mission.get("cancelled_at") or "")
    completed_at = now if target == "completed" else str(mission.get("completed_at") or "")
    reason = terminal_reason if target in {"failed", "cancelled", "recovery_required"} else ""
    connection.execute(
        """
        UPDATE missions
        SET status = ?, state_version = state_version + 1, terminal_reason = ?,
            paused_at = ?, cancelled_at = ?, completed_at = ?, updated_at = ?
        WHERE id = ?
        """,
        (target, reason, paused_at, cancelled_at, completed_at, now, int(mission_id)),
    )
    transition = _record_transition(
        connection,
        mission_id=int(mission_id),
        entity_type="mission",
        from_state=current,
        to_state=target,
        cause=cause,
        actor=actor,
        run_id=run_id,
        metadata=metadata,
    )
    return {"transitioned": True, "replayed": False, "mission_id": int(mission_id), "status": target, "transition": transition}


def _apply_step_transition(
    connection: sqlite3.Connection,
    step_id: int,
    to_state: str,
    *,
    cause: str,
    actor: str,
    run_id: Optional[int] = None,
    evaluator_outcome: str = "",
    error: str = "",
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    step = _row(connection, "SELECT * FROM mission_steps WHERE id = ?", (int(step_id),))
    if not step:
        raise MissionTransitionError("Mission step was not found.")
    mission = _row(connection, "SELECT * FROM missions WHERE id = ?", (int(step["mission_id"]),))
    if not mission:
        raise MissionTransitionError("Mission was not found.")
    current = _step_state(str(step["status"]))
    target = _step_state(to_state)
    mission_state = _mission_state(str(mission["status"]))
    if mission_state in MISSION_TERMINAL_STATES and target != "cancelled":
        raise MissionTransitionError(f"Mission is {mission_state}; later step execution is prohibited.")
    if current == target:
        return {"transitioned": False, "replayed": True, "mission_id": int(step["mission_id"]), "step_id": int(step_id), "status": target}
    if target not in STEP_TRANSITIONS[current]:
        raise MissionTransitionError(f"Mission step transition {current} -> {target} is not allowed.")
    if evaluator_outcome and evaluator_outcome not in EVALUATOR_OUTCOMES:
        raise MissionTransitionError(f"Invalid evaluator outcome: {evaluator_outcome}.")

    attempts = int(step.get("attempt_count") or 0)
    if target == "running":
        if attempts >= int(step.get("max_attempts") or 3):
            raise MissionTransitionError("Mission step retry limit has been reached.")
        attempts += 1
    now = _now()
    connection.execute(
        """
        UPDATE mission_steps
        SET status = ?, attempt_count = ?, evaluator_outcome = ?, last_error = ?, updated_at = ?
        WHERE id = ?
        """,
        (target, attempts, evaluator_outcome, str(error)[:4000], now, int(step_id)),
    )
    connection.execute(
        "UPDATE missions SET state_version = state_version + 1, updated_at = ? WHERE id = ?",
        (now, int(step["mission_id"])),
    )
    transition = _record_transition(
        connection,
        mission_id=int(step["mission_id"]),
        step_id=int(step_id),
        run_id=run_id,
        entity_type="step",
        from_state=current,
        to_state=target,
        cause=cause,
        actor=actor,
        evaluator_outcome=evaluator_outcome,
        metadata=metadata,
    )
    return {
        "transitioned": True,
        "replayed": False,
        "mission_id": int(step["mission_id"]),
        "step_id": int(step_id),
        "status": target,
        "attempt_count": attempts,
        "transition": transition,
    }


@requires_gateway
def transition_mission_state(
    mission_id: int,
    to_state: str,
    *,
    cause: str,
    actor: str,
    run_id: Optional[int] = None,
    metadata: Optional[Dict[str, Any]] = None,
    expected_version: Optional[int] = None,
    terminal_reason: str = "",
) -> Dict[str, Any]:
    init_mission_db()
    with get_connection() as connection:
        connection.execute("BEGIN IMMEDIATE")
        return _apply_mission_transition(
            connection,
            int(mission_id),
            to_state,
            cause=_required_text(cause, "cause"),
            actor=_required_text(actor, "actor"),
            run_id=run_id,
            metadata=metadata,
            expected_version=expected_version,
            terminal_reason=terminal_reason,
        )


@requires_gateway
def transition_step_state(
    step_id: int,
    to_state: str,
    *,
    cause: str,
    actor: str,
    run_id: Optional[int] = None,
    evaluator_outcome: str = "",
    error: str = "",
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    init_mission_db()
    with get_connection() as connection:
        connection.execute("BEGIN IMMEDIATE")
        return _apply_step_transition(
            connection,
            int(step_id),
            to_state,
            cause=_required_text(cause, "cause"),
            actor=_required_text(actor, "actor"),
            run_id=run_id,
            evaluator_outcome=evaluator_outcome,
            error=error,
            metadata=metadata,
        )


def list_mission_transitions(mission_id: int, limit: int = 200) -> list[Dict[str, Any]]:
    init_mission_db()
    with get_connection() as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            "SELECT * FROM mission_transitions WHERE mission_id = ? ORDER BY id DESC LIMIT ?",
            (int(mission_id), max(1, min(int(limit), 1000))),
        ).fetchall()
    results = []
    for row in rows:
        item = dict(row)
        try:
            item["metadata"] = json.loads(item.pop("metadata_json"))
        except (json.JSONDecodeError, TypeError):
            item["metadata"] = {}
        results.append(item)
    return results


def list_mission_checkpoints(mission_id: int, limit: int = 50) -> list[Dict[str, Any]]:
    init_mission_db()
    with get_connection() as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            "SELECT * FROM mission_checkpoints WHERE mission_id = ? ORDER BY id DESC LIMIT ?",
            (int(mission_id), max(1, min(int(limit), 200))),
        ).fetchall()
    results = []
    for row in rows:
        item = dict(row)
        try:
            item["snapshot"] = json.loads(item.pop("snapshot_json"))
        except (json.JSONDecodeError, TypeError):
            item["snapshot"] = {}
        results.append(item)
    return results


@requires_gateway
def acquire_mission_lease(mission_id: int, owner: str, timeout_seconds: int = 300) -> Dict[str, Any]:
    init_mission_db()
    clean_owner = _required_text(owner, "lease owner")
    ttl = max(5, min(int(timeout_seconds), 3600))
    now_epoch = time.time()
    now = _now()
    with get_connection() as connection:
        connection.execute("BEGIN IMMEDIATE")
        mission = _row(connection, "SELECT * FROM missions WHERE id = ?", (int(mission_id),))
        if not mission:
            raise MissionTransitionError("Mission was not found.")
        state = _mission_state(str(mission["status"]))
        if state in MISSION_TERMINAL_STATES or state in {"paused", "waiting_approval", "recovery_required", "failed"}:
            raise MissionTransitionError(f"Mission cannot execute while {state}.")
        existing = _row(connection, "SELECT * FROM mission_leases WHERE mission_id = ?", (int(mission_id),))
        if existing and float(existing["expires_at_epoch"]) > now_epoch:
            if existing["owner"] == clean_owner:
                return {**existing, "claimed": False, "replayed": True}
            raise MissionTransitionError("Mission already has an active execution lease.")
        if existing:
            connection.execute("DELETE FROM mission_leases WHERE mission_id = ?", (int(mission_id),))
            if state == "running":
                _apply_mission_transition(
                    connection,
                    int(mission_id),
                    "recovery_required",
                    cause="expired_lease_discovered",
                    actor="mission_supervisor",
                    terminal_reason="The previous execution lease expired.",
                )
                return {
                    "mission_id": int(mission_id),
                    "lease_id": "",
                    "owner": clean_owner,
                    "claimed": False,
                    "replayed": False,
                    "recovery_required": True,
                }
        lease_id = uuid.uuid4().hex
        connection.execute(
            """
            INSERT INTO mission_leases
            (mission_id, lease_id, owner, acquired_at, renewed_at, expires_at_epoch)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (int(mission_id), lease_id, clean_owner, now, now, now_epoch + ttl),
        )
        if state != "running":
            _apply_mission_transition(
                connection,
                int(mission_id),
                "running",
                cause="execution_lease_acquired",
                actor=clean_owner,
                metadata={"lease_id": lease_id, "timeout_seconds": ttl},
            )
        return {
            "mission_id": int(mission_id),
            "lease_id": lease_id,
            "owner": clean_owner,
            "acquired_at": now,
            "renewed_at": now,
            "expires_at_epoch": now_epoch + ttl,
            "claimed": True,
            "replayed": False,
        }


@requires_gateway
def release_mission_lease(mission_id: int, lease_id: str, owner: str) -> bool:
    init_mission_db()
    with get_connection() as connection:
        connection.execute("BEGIN IMMEDIATE")
        cursor = connection.execute(
            "DELETE FROM mission_leases WHERE mission_id = ? AND lease_id = ? AND owner = ?",
            (int(mission_id), str(lease_id), str(owner)),
        )
        return cursor.rowcount == 1


@requires_gateway
def pause_mission(mission_id: int, cause: str, actor: str) -> Dict[str, Any]:
    init_mission_db()
    cause = _required_text(cause, "cause")
    actor = _required_text(actor, "actor")
    with get_connection() as connection:
        connection.execute("BEGIN IMMEDIATE")
        result = _apply_mission_transition(connection, int(mission_id), "paused", cause=cause, actor=actor)
        running = connection.execute(
            "SELECT id FROM mission_steps WHERE mission_id = ? AND status = 'running'",
            (int(mission_id),),
        ).fetchall()
        for row in running:
            _apply_step_transition(connection, int(row[0]), "paused", cause=cause, actor=actor)
        connection.execute("DELETE FROM mission_leases WHERE mission_id = ?", (int(mission_id),))
        return result


@requires_gateway
def resume_mission(mission_id: int, cause: str, actor: str) -> Dict[str, Any]:
    init_mission_db()
    cause = _required_text(cause, "cause")
    actor = _required_text(actor, "actor")
    with get_connection() as connection:
        connection.execute("BEGIN IMMEDIATE")
        result = _apply_mission_transition(connection, int(mission_id), "ready", cause=cause, actor=actor)
        paused = connection.execute(
            "SELECT id FROM mission_steps WHERE mission_id = ? AND status = 'paused'",
            (int(mission_id),),
        ).fetchall()
        for row in paused:
            _apply_step_transition(connection, int(row[0]), "pending", cause=cause, actor=actor)
        return result


@requires_gateway
def cancel_mission(mission_id: int, cause: str, actor: str) -> Dict[str, Any]:
    init_mission_db()
    cause = _required_text(cause, "cause")
    actor = _required_text(actor, "actor")
    with get_connection() as connection:
        connection.execute("BEGIN IMMEDIATE")
        result = _apply_mission_transition(
            connection,
            int(mission_id),
            "cancelled",
            cause=cause,
            actor=actor,
            terminal_reason=cause,
        )
        active_steps = connection.execute(
            "SELECT id FROM mission_steps WHERE mission_id = ? AND status NOT IN ('completed', 'cancelled')",
            (int(mission_id),),
        ).fetchall()
        for row in active_steps:
            _apply_step_transition(connection, int(row[0]), "cancelled", cause=cause, actor=actor)
        connection.execute("DELETE FROM mission_leases WHERE mission_id = ?", (int(mission_id),))
        return result


@requires_gateway
def retry_mission_step(step_id: int, cause: str, actor: str) -> Dict[str, Any]:
    init_mission_db()
    cause = _required_text(cause, "cause")
    actor = _required_text(actor, "actor")
    with get_connection() as connection:
        connection.execute("BEGIN IMMEDIATE")
        step = _row(connection, "SELECT * FROM mission_steps WHERE id = ?", (int(step_id),))
        if not step:
            raise MissionTransitionError("Mission step was not found.")
        mission = _row(connection, "SELECT * FROM missions WHERE id = ?", (int(step["mission_id"]),))
        if not mission:
            raise MissionTransitionError("Mission was not found.")
        if int(step.get("attempt_count") or 0) >= int(step.get("max_attempts") or 3):
            raise MissionTransitionError("Mission step retry limit has been reached.")
        if int(mission.get("retry_count") or 0) >= int(mission.get("max_retries") or 3):
            raise MissionTransitionError("Mission retry limit has been reached.")
        step_result = _apply_step_transition(connection, int(step_id), "retry_pending", cause=cause, actor=actor)
        connection.execute(
            "UPDATE missions SET retry_count = retry_count + 1 WHERE id = ?",
            (int(step["mission_id"]),),
        )
        mission_state = _mission_state(str(mission["status"]))
        if mission_state != "ready":
            _apply_mission_transition(connection, int(step["mission_id"]), "ready", cause=cause, actor=actor)
        return step_result


@requires_gateway
def evaluate_mission_step(
    mission_id: int,
    step_id: int,
    run_id: int,
    outcome: str,
    cause: str,
    actor: str = "mission_evaluator",
    output: str = "",
    error: str = "",
) -> Dict[str, Any]:
    clean_outcome = str(outcome).strip()
    if clean_outcome not in EVALUATOR_OUTCOMES:
        raise MissionTransitionError(f"Invalid evaluator outcome: {outcome}.")
    cause = _required_text(cause, "cause")
    actor = _required_text(actor, "actor")
    init_mission_db()
    with get_connection() as connection:
        connection.execute("BEGIN IMMEDIATE")
        mission = _row(connection, "SELECT * FROM missions WHERE id = ?", (int(mission_id),))
        step = _row(connection, "SELECT * FROM mission_steps WHERE id = ? AND mission_id = ?", (int(step_id), int(mission_id)))
        if not mission or not step:
            raise MissionTransitionError("Mission evaluator ownership validation failed.")
        if _mission_state(str(mission["status"])) == "cancelled":
            raise MissionTransitionError("Mission was cancelled; evaluator output cannot resume execution.")
        step_result = _apply_step_transition(
            connection,
            int(step_id),
            OUTCOME_STEP_STATE[clean_outcome],
            cause=cause,
            actor=actor,
            run_id=int(run_id),
            evaluator_outcome=clean_outcome,
            error=error,
            metadata={"output": str(output)[:4000]},
        )
        if clean_outcome == "completed":
            remaining = connection.execute(
                "SELECT COUNT(*) FROM mission_steps WHERE mission_id = ? AND status != 'completed'",
                (int(mission_id),),
            ).fetchone()[0]
            mission_target = "completed" if int(remaining) == 0 else "ready"
        elif clean_outcome == "waiting_approval":
            mission_target = "waiting_approval"
        elif clean_outcome == "blocked":
            mission_target = "paused"
        elif clean_outcome == "cancelled":
            remaining_steps = connection.execute(
                "SELECT id FROM mission_steps WHERE mission_id = ? AND status NOT IN ('completed', 'cancelled')",
                (int(mission_id),),
            ).fetchall()
            for row in remaining_steps:
                _apply_step_transition(
                    connection,
                    int(row[0]),
                    "cancelled",
                    cause=cause,
                    actor=actor,
                    run_id=int(run_id),
                    evaluator_outcome="cancelled",
                )
            mission_target = "cancelled"
        else:
            mission_target = "failed"
        current = _row(connection, "SELECT status FROM missions WHERE id = ?", (int(mission_id),))
        if current and _mission_state(str(current["status"])) != mission_target:
            _apply_mission_transition(
                connection,
                int(mission_id),
                mission_target,
                cause=cause,
                actor=actor,
                run_id=int(run_id),
                terminal_reason=error,
            )
        connection.execute("DELETE FROM mission_leases WHERE mission_id = ?", (int(mission_id),))
        return {"mission_id": int(mission_id), "step_id": int(step_id), "run_id": int(run_id), "outcome": clean_outcome, "step": step_result, "mission_status": mission_target}


@requires_gateway
def recover_expired_mission_leases(now_epoch: Optional[float] = None) -> Dict[str, Any]:
    init_mission_db()
    cutoff = float(now_epoch if now_epoch is not None else time.time())
    recovered = []
    with get_connection() as connection:
        connection.execute("BEGIN IMMEDIATE")
        connection.row_factory = sqlite3.Row
        leases = connection.execute(
            "SELECT * FROM mission_leases WHERE expires_at_epoch <= ? ORDER BY mission_id",
            (cutoff,),
        ).fetchall()
        for lease_row in leases:
            lease = dict(lease_row)
            mission_id = int(lease["mission_id"])
            connection.execute("DELETE FROM mission_leases WHERE mission_id = ?", (mission_id,))
            mission = _row(connection, "SELECT status FROM missions WHERE id = ?", (mission_id,))
            if mission and _mission_state(str(mission["status"])) == "running":
                running_steps = connection.execute(
                    "SELECT id FROM mission_steps WHERE mission_id = ? AND status = 'running'",
                    (mission_id,),
                ).fetchall()
                for row in running_steps:
                    _apply_step_transition(
                        connection,
                        int(row[0]),
                        "failed",
                        cause="execution_lease_expired",
                        actor="mission_supervisor",
                        error="Execution lease expired; outcome is unknown.",
                    )
                _apply_mission_transition(
                    connection,
                    mission_id,
                    "recovery_required",
                    cause="execution_lease_expired",
                    actor="mission_supervisor",
                    terminal_reason="Execution lease expired; explicit recovery is required.",
                    metadata={"lease_id": lease["lease_id"], "owner": lease["owner"]},
                )
                recovered.append(mission_id)
    return {"recovered_mission_ids": recovered, "count": len(recovered)}


def assert_mission_execution_allowed(mission_id: int) -> None:
    """Fail closed when a mission-scoped tool is invoked after lifecycle suspension."""

    mission = get_mission_record(int(mission_id))
    if not mission:
        raise MissionTransitionError("Mission was not found.")
    state = _mission_state(str(mission["status"]))
    if state != "running":
        raise MissionTransitionError(f"Mission-scoped execution is prohibited while mission is {state}.")


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
    step = next((item for item in mission.get("steps", []) if int(item["id"]) == step_id), None)
    if not step or int(step["mission_id"]) != mission_id:
        raise ValueError("Continuation step does not belong to its mission.")

    run: Dict[str, Any] = {}
    if run_id is not None:
        found_run = get_mission_run(int(run_id))
        if not found_run or int(found_run["mission_id"]) != mission_id:
            raise ValueError("Continuation mission run ownership is invalid.")
        if int(found_run.get("step_id") or -1) != step_id:
            raise ValueError("Continuation run does not belong to its step.")
        if found_run.get("approval_id") is None:
            if not bind_mission_run_approval(int(run_id), mission_id, step_id, int(approval_id)):
                raise ValueError("Continuation run could not be bound to its approval.")
            found_run = get_mission_run(int(run_id)) or {}
        if int(found_run.get("approval_id") or -1) != int(approval_id):
            raise ValueError("Continuation run is not bound to this approval.")
        run = found_run
    return continuation, approval, mission, run


def _transition_for_continuation(
    mission_id: int,
    step_id: int,
    mission_state: str,
    step_state: str,
    cause: str,
    approval_id: int,
    run_id: Optional[int],
) -> None:
    with get_connection() as connection:
        connection.execute("BEGIN IMMEDIATE")
        current_step = _row(connection, "SELECT status FROM mission_steps WHERE id = ?", (step_id,))
        current_mission = _row(connection, "SELECT status FROM missions WHERE id = ?", (mission_id,))
        if current_step and _step_state(str(current_step["status"])) != step_state:
            _apply_step_transition(
                connection,
                step_id,
                step_state,
                cause=cause,
                actor="approval_continuation",
                run_id=run_id,
                metadata={"approval_id": approval_id},
            )
        if current_mission and _mission_state(str(current_mission["status"])) != mission_state:
            _apply_mission_transition(
                connection,
                mission_id,
                mission_state,
                cause=cause,
                actor="approval_continuation",
                run_id=run_id,
                metadata={"approval_id": approval_id},
            )


def _resolve_owned_continuation(approval_id: int, *, recovering: bool = False) -> Dict[str, Any]:
    continuation, approval, _mission, _run = _validated_ownership(approval_id)
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
            _transition_for_continuation(
                mission_id, step_id, "waiting_approval", "waiting_approval",
                "pending_approval_recovered", int(approval_id), run_id,
            )
        return {"status": "waiting_approval", "approval_id": int(approval_id), "mission_id": mission_id, "step_id": step_id, "run_id": run_id, "replayed": False}

    if approval_status == "executing":
        if not recovering:
            return {"status": "executing", "approval_id": int(approval_id), "mission_id": mission_id, "step_id": step_id, "run_id": run_id, "replayed": False}
        _transition_for_continuation(
            mission_id, step_id, "recovery_required", "blocked",
            "approval_execution_interrupted", int(approval_id), run_id,
        )
        if run_id is not None and not update_mission_run_after_approval(
            int(run_id), int(approval_id), "recovery_required",
            error="Approval execution was interrupted; manual recovery is required.",
        ):
            raise ValueError("Interrupted mission run could not be marked for recovery.")
        resolved = mark_mission_continuation_resolved(
            int(approval_id), "recovery_required", "execution_interrupted",
            "Manual recovery required; the side effect may have partially completed.",
        )
        return {**resolved, "replayed": False}

    if approval_status == "approved":
        _transition_for_continuation(
            mission_id, step_id, "ready", "pending",
            "approval_succeeded", int(approval_id), run_id,
        )
        if run_id is not None and not update_mission_run_after_approval(
            int(run_id), int(approval_id), "approval_resolved", output=result
        ):
            raise ValueError("Approved mission run could not be resumed.")
        resolved = mark_mission_continuation_resolved(int(approval_id), "resumed", "approved", result)
        return {**resolved, "replayed": False}

    if approval_status in {"rejected", "failed"}:
        _transition_for_continuation(
            mission_id, step_id, "failed", "blocked",
            f"approval_{approval_status}", int(approval_id), run_id,
        )
        if run_id is not None and not update_mission_run_after_approval(
            int(run_id), int(approval_id), "approval_rejected",
            error=result or f"Approval {approval_status}.",
        ):
            raise ValueError("Rejected mission run could not be blocked.")
        resolved = mark_mission_continuation_resolved(int(approval_id), "blocked", approval_status, result)
        return {**resolved, "replayed": False}

    raise ValueError(f"Unsupported approval state: {approval_status}.")


@requires_gateway
def resolve_mission_continuation(approval_id: int) -> Dict[str, Any]:
    return _resolve_owned_continuation(int(approval_id))


@requires_gateway
def recover_mission_continuations(limit: int = 100) -> Dict[str, Any]:
    recovered = []
    errors = []
    for continuation in list_recoverable_mission_continuations(limit=limit):
        try:
            recovered.append(_resolve_owned_continuation(int(continuation["approval_id"]), recovering=True))
        except Exception as error:
            errors.append({"approval_id": int(continuation["approval_id"]), "error": f"{type(error).__name__}: {error}"})
    return {"recovered": recovered, "errors": errors}
