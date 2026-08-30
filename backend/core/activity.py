"""Activity projection backed by the immutable correlated audit event store."""

from __future__ import annotations

import json
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any, Dict, Iterator, List
from uuid import uuid4

from core.capability_gateway import get_active_authorization, requires_gateway
from core.tool_audit import list_audit_events, record_audit_event


_activity_writes_suppressed: ContextVar[bool] = ContextVar(
    "orion_activity_writes_suppressed", default=False
)


@contextmanager
def suppress_activity_writes() -> Iterator[None]:
    """Prevent read-only API requests from turning polling into write traffic."""

    token = _activity_writes_suppressed.set(True)
    try:
        yield
    finally:
        _activity_writes_suppressed.reset(token)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def log_activity(
    event_type: str,
    message: str,
    source: str = "O.R.I.O.N.",
) -> Dict[str, Any]:
    if _activity_writes_suppressed.get():
        return {
            "id": 0,
            "timestamp": _now(),
            "type": str(event_type),
            "source": str(source),
            "message": str(message),
            "suppressed": True,
        }

    authorization = get_active_authorization()
    context = authorization.context if authorization else None
    event = record_audit_event(
        str(event_type),
        "activity",
        status="succeeded",
        actor=context.actor if context else "internal",
        source=str(source),
        session_id=context.session_id if context else "",
        mission_id=context.mission_id if context else None,
        step_id=context.step_id if context else None,
        run_id=context.run_id if context else None,
        tool_name=authorization.manifest.name if authorization else "",
        plugin_key=authorization.manifest.plugin_key if authorization else "",
        policy_profile=authorization.policy_profile if authorization else "unknown",
        approval_id=context.approval_id if context else None,
        scope=context.scope if context else "",
        result={"message": str(message)},
        correlation_id=context.correlation_id if context else uuid4().hex,
    )
    return {
        "id": int(event["id"]),
        "timestamp": event["created_at"],
        "type": event["event_type"],
        "source": event["source"],
        "message": str(message),
        "correlation_id": event["correlation_id"],
        "mission_id": event["mission_id"],
        "step_id": event["step_id"],
        "approval_id": event["approval_id"],
    }


def get_recent_activity(limit: int = 30) -> List[Dict[str, Any]]:
    events = list_audit_events(limit=5000, phase="activity")
    last_clear = max(
        (
            index
            for index, event in enumerate(events)
            if event["event_type"] == "ACTIVITY_CLEARED"
        ),
        default=-1,
    )
    visible = events[last_clear + 1 :]
    projected = []
    for event in reversed(visible[-max(1, min(int(limit), 500)) :]):
        try:
            payload = json.loads(event.get("result") or "{}")
            message = str(payload.get("message") or event.get("reason") or "")
        except (json.JSONDecodeError, AttributeError, TypeError):
            message = str(event.get("reason") or event.get("result") or "")
        projected.append(
            {
                "id": int(event["id"]),
                "timestamp": event["created_at"],
                "type": event["event_type"],
                "source": event["source"],
                "message": message,
                "correlation_id": event["correlation_id"],
                "mission_id": event["mission_id"],
                "step_id": event["step_id"],
                "approval_id": event["approval_id"],
            }
        )
    return projected


@requires_gateway
def clear_activity() -> None:
    authorization = get_active_authorization()
    context = authorization.context if authorization else None
    record_audit_event(
        "ACTIVITY_CLEARED",
        "activity",
        status="succeeded",
        actor=context.actor if context else "unknown",
        source=context.source if context else "Aurora OS",
        session_id=context.session_id if context else "",
        policy_profile=authorization.policy_profile if authorization else "unknown",
        scope=context.scope if context else "",
        correlation_id=context.correlation_id if context else uuid4().hex,
        reason="Activity projection cleared; immutable audit history retained.",
    )
