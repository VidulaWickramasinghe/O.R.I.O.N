from functools import wraps
from typing import Any, Callable

from core.activity import log_activity


def _shorten(value: Any, limit: int = 220) -> str:
    """
    Convert tool input/output into a short readable preview for Aurora OS logs.
    """
    text = str(value)

    if len(text) > limit:
        return text[:limit] + "..."

    return text


def _resolve_plugin_key(tool_name: str) -> str:
    """
    Resolve a tool name to its plugin key without creating hard dependency cycles.
    """
    try:
        from core.tool_permissions import TOOL_PLUGIN_MAP

        return str(TOOL_PLUGIN_MAP.get(tool_name, "") or "")
    except Exception:
        return ""


def _looks_policy_blocked(value: Any) -> bool:
    """
    Detect common permission-blocked outputs/errors.
    """
    text = str(value or "").lower()

    blocked_markers = [
        "disabled by active security policy",
        "permission denied",
        "permission blocked",
        "tool blocked",
        "policy blocked",
        "not allowed",
        "not permitted",
        "blocked by",
    ]

    return any(marker in text for marker in blocked_markers)


def _record_tool_audit(
    tool_name: str,
    decision: str,
    reason: str,
) -> None:
    """
    Record a Tool Audit Center event.

    This function is intentionally fail-safe:
    audit logging must never break the actual tool flow.
    """
    try:
        from core.tool_audit import record_tool_audit_event

        plugin_key = _resolve_plugin_key(tool_name)

        record_tool_audit_event(
            tool_name=tool_name,
            plugin_key=plugin_key,
            decision=decision,
            reason=reason,
            risk_level="unknown",
            category="unknown",
            source="O.R.I.O.N. Tool Logger",
        )
    except Exception as error:
        log_activity(
            "TOOL_AUDIT_ERROR",
            f"Failed to record audit event for {tool_name}: {error}",
            tool_name,
        )


def instrument_tool(tool_name: str) -> Callable:
    """
    Decorator for logging tool execution lifecycle events.
    Use this under @function_tool.

    Correct order:
    @function_tool
    @instrument_tool("tool_name")
    def tool_name(...):
        ...
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            input_preview = {
                "args": [_shorten(arg) for arg in args],
                "kwargs": {key: _shorten(value) for key, value in kwargs.items()},
            }

            log_activity(
                "TOOL_START",
                f"{tool_name} started with input: {input_preview}",
                tool_name,
            )

            try:
                result = func(*args, **kwargs)

                if _looks_policy_blocked(result):
                    _record_tool_audit(
                        tool_name,
                        "blocked",
                        f"Tool returned a policy-blocked result: {_shorten(result, 500)}",
                    )
                else:
                    _record_tool_audit(
                        tool_name,
                        "allowed",
                        "Tool execution permitted by active policy.",
                    )

                log_activity(
                    "TOOL_COMPLETE",
                    f"{tool_name} completed with result: {_shorten(result)}",
                    tool_name,
                )

                return result

            except Exception as error:
                if isinstance(error, PermissionError) or _looks_policy_blocked(error):
                    _record_tool_audit(
                        tool_name,
                        "blocked",
                        f"Tool execution blocked: {_shorten(error, 500)}",
                    )
                else:
                    _record_tool_audit(
                        tool_name,
                        "allowed",
                        f"Tool was permitted but failed during execution: {_shorten(error, 500)}",
                    )

                log_activity(
                    "TOOL_ERROR",
                    f"{tool_name} failed: {error}",
                    tool_name,
                )
                raise

        return wrapper

    return decorator
