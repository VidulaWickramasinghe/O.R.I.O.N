from agents import function_tool

from core.security_policy import (
    apply_security_profile,
    get_active_security_policy,
    list_security_profiles,
    render_security_policy_report,
)
from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission


@function_tool
@instrument_tool("list_security_profiles")
@enforce_tool_permission("list_security_profiles")
def list_security_profiles_tool() -> str:
    """
    List available O.R.I.O.N. security policy profiles.
    """
    profiles = list_security_profiles()
    return "\n".join(
        f"{profile['key']} — {profile['name']} | "
        f"Safety: {profile['safety_level']} | "
        f"Enabled: {profile['enabled_plugin_count']} | "
        f"Disabled: {profile['disabled_plugin_count']} | "
        f"{profile['description']}"
        for profile in profiles
    )


@function_tool
@instrument_tool("get_active_security_policy")
@enforce_tool_permission("get_active_security_policy")
def get_active_security_policy_tool() -> str:
    """
    Get active O.R.I.O.N. security policy profile.
    """
    active = get_active_security_policy()
    return f"""
Active Security Policy

Profile: {active['active_profile']}
Name: {active['profile']['name']}
Safety Level: {active['profile']['safety_level']}
Applied At: {active['applied_at']}

Plugin Metrics:
- Total: {active['plugin_metrics']['total_plugins']}
- Enabled: {active['plugin_metrics']['enabled_plugins']}
- Disabled: {active['plugin_metrics']['disabled_plugins']}
- High-Risk Enabled: {active['plugin_metrics']['high_risk_enabled']}
""".strip()


@function_tool
@instrument_tool("apply_security_profile")
@enforce_tool_permission("apply_security_profile")
def apply_security_profile_tool(profile_key: str) -> str:
    """
    Apply a security profile: strict, balanced, or developer_lab.
    """
    try:
        result = apply_security_profile(profile_key=profile_key, source="O.R.I.O.N.")
        return f"""
Security profile applied.

Profile: {result['profile_key']}
Name: {result['profile_name']}
Enabled Plugins: {result['enabled_count']}
Disabled Plugins: {result['disabled_count']}
Unchanged Plugins: {result['unchanged_count']}
Applied At: {result['applied_at']}

{result['summary']}
""".strip()
    except Exception as error:
        return f"Security profile apply failed: {error}"


@function_tool
@instrument_tool("get_security_policy_report")
@enforce_tool_permission("get_security_policy_report")
def get_security_policy_report() -> str:
    """
    Generate O.R.I.O.N. security policy report.
    """
    return render_security_policy_report()
