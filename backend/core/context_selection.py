"""Per-run context exclusions shared by retrieval and capability authorization."""

from contextlib import contextmanager
from contextvars import ContextVar

_selection = ContextVar("orion_context_selection", default=None)


def current_selection():
    return _selection.get()


@contextmanager
def context_selection(selection):
    token = _selection.set(dict(selection))
    try:
        yield
    finally:
        _selection.reset(token)


def context_plugin_allowed(plugin_key: str) -> bool:
    selection = current_selection()
    if selection is None:
        return True
    if plugin_key == "memory_system":
        return selection.get("memory", False)
    if plugin_key == "knowledge_base":
        return selection.get("knowledge", False)
    if plugin_key == "vector_memory":
        return all(selection.get(key, False) for key in ("memory", "knowledge", "semantic"))
    return True
