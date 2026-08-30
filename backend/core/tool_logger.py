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
            from core.capability_gateway import (
                CapabilityDeniedError,
                execute_capability,
                tool_context,
            )

            input_preview = {
                "args": [_shorten(arg) for arg in args],
                "kwargs": {key: _shorten(value) for key, value in kwargs.items()},
            }

            def run_tool():
                log_activity(
                    "TOOL_START",
                    f"{tool_name} started with input: {input_preview}",
                    tool_name,
                )
                try:
                    result = func(*args, **kwargs)
                except Exception as error:
                    log_activity(
                        "TOOL_ERROR",
                        f"{tool_name} failed: {error}",
                        tool_name,
                    )
                    raise
                log_activity(
                    "TOOL_COMPLETE",
                    f"{tool_name} completed with result: {_shorten(result)}",
                    tool_name,
                )
                return result

            try:
                return execute_capability(
                    tool_name,
                    tool_context(tool_name),
                    run_tool,
                )
            except CapabilityDeniedError as error:
                try:
                    log_activity(
                        "TOOL_PERMISSION_BLOCKED",
                        str(error),
                        tool_name,
                    )
                except Exception:
                    pass
                return (
                    "Tool blocked by Capability Gateway.\n\n"
                    f"Tool: {tool_name}\n"
                    f"Reason: {error.reason}"
                )

        return wrapper

    return decorator
