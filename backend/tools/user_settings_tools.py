from agents import function_tool

from core.tool_logger import instrument_tool
from core.user_settings import (
    list_user_settings,
    render_user_profile_summary,
    reset_user_settings,
    update_user_setting,
)


@function_tool
@instrument_tool("list_user_profile_settings")
def list_user_profile_settings() -> str:
    """
    List local O.R.I.O.N. user profile settings.
    """
    settings = list_user_settings()
    return "\n".join(
        f"{item['key']} = {item['value']} | {item['description']}"
        for item in settings
    )


@function_tool
@instrument_tool("update_user_profile_setting")
def update_user_profile_setting(key: str, value: str) -> str:
    """
    Update a local O.R.I.O.N. user profile setting.
    """
    try:
        setting = update_user_setting(key, value)
        return f"""
Setting updated.

Key: {setting['key']}
Value: {setting['value']}
Description: {setting['description']}
Updated: {setting['updated_at']}
""".strip()
    except Exception as error:
        return f"Setting update failed: {error}"


@function_tool
@instrument_tool("reset_user_profile_settings")
def reset_user_profile_settings() -> str:
    """
    Reset local O.R.I.O.N. user profile settings to defaults.
    """
    settings = reset_user_settings()
    return f"User profile settings reset. Total settings: {len(settings)}"


@function_tool
@instrument_tool("get_user_profile_summary")
def get_user_profile_summary() -> str:
    """
    Generate local O.R.I.O.N. user profile summary.
    """
    return render_user_profile_summary()
