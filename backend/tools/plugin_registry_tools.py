from agents import function_tool

from core.plugin_registry import (
    get_plugin,
    list_plugins,
    render_plugin_registry_report,
    set_plugin_enabled,
)
from core.tool_logger import instrument_tool


@function_tool
@instrument_tool("list_orion_plugins")
def list_orion_plugins(enabled_only: bool = False) -> str:
    """
    List O.R.I.O.N. registered plugins.
    """
    plugins = list_plugins(enabled=True if enabled_only else None)
    if not plugins:
        return "No plugins registered."

    return "\n".join(
        f"{plugin['key']} | {plugin['name']} | "
        f"Category: {plugin['category']} | Risk: {plugin['risk_level']} | "
        f"Enabled: {plugin['enabled']}"
        for plugin in plugins
    )


@function_tool
@instrument_tool("inspect_orion_plugin")
def inspect_orion_plugin(plugin_key: str) -> str:
    """
    Inspect one O.R.I.O.N. plugin by key.
    """
    plugin = get_plugin(plugin_key)
    if not plugin:
        return "Plugin not found."

    return f"""
# Plugin: {plugin['name']}

Key: {plugin['key']}
Category: {plugin['category']}
Risk Level: {plugin['risk_level']}
Enabled: {plugin['enabled']}
Built In: {plugin['built_in']}

Description:
{plugin['description']}

Permissions:
{chr(10).join(f'- {permission}' for permission in plugin['permissions'])}
""".strip()


@function_tool
@instrument_tool("set_orion_plugin_enabled")
def set_orion_plugin_enabled(plugin_key: str, enabled: bool) -> str:
    """
    Enable or disable a registered O.R.I.O.N. plugin in the registry.
    This controls plugin metadata and UI state. Dynamic tool blocking should be added in a later enforcement layer.
    """
    try:
        plugin = set_plugin_enabled(plugin_key, enabled)
        return f"""
Plugin updated.

Key: {plugin['key']}
Name: {plugin['name']}
Enabled: {plugin['enabled']}
Risk Level: {plugin['risk_level']}
""".strip()
    except Exception as error:
        return f"Plugin update failed: {error}"


@function_tool
@instrument_tool("get_plugin_registry_report")
def get_plugin_registry_report() -> str:
    """
    Generate O.R.I.O.N. plugin registry report.
    """
    return render_plugin_registry_report()
