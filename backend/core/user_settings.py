import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from .workspace_manager import get_workspace_record


from core.database import managed_connection
BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_DIR / "data"
DB_PATH = DATA_DIR / "orion_user_settings.sqlite"

DATA_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_SETTINGS = {
    "display_name",
    "role_title",
    "default_workspace_id",
    "safety_level",
    "voice_mode",
    "theme_mode",
    "preferred_model",
    "developer_mode_enabled",
    "demo_mode_preference",
    "startup_briefing_enabled",
}

DEFAULT_SETTINGS = {
    "display_name": "O.R.I.O.N. User",
    "role_title": "System Architect",
    "default_workspace_id": "",
    "safety_level": "strict",
    "voice_mode": "text_first",
    "theme_mode": "aurora_dark",
    "preferred_model": "default",
    "developer_mode_enabled": "false",
    "demo_mode_preference": "false",
    "startup_briefing_enabled": "true",
}

SETTING_DESCRIPTIONS = {
    "display_name": "Display name shown inside Aurora OS.",
    "role_title": "Role or title shown with the user profile inside Aurora OS.",
    "default_workspace_id": "Default registered workspace ID used for developer workflows.",
    "safety_level": "Controls how cautious O.R.I.O.N. should be. Recommended: strict.",
    "voice_mode": "Preferred voice behavior.",
    "theme_mode": "Preferred Aurora OS theme.",
    "preferred_model": "Preferred model label used by local configuration.",
    "developer_mode_enabled": "Whether Agentic Developer Mode should be treated as enabled.",
    "demo_mode_preference": "Whether portfolio demo mode should be preferred.",
    "startup_briefing_enabled": "Whether startup briefing should be shown on launch.",
}

SETTING_OPTIONS = {
    "safety_level": ["strict", "balanced", "experimental"],
    "voice_mode": ["text_first", "voice_first", "muted"],
    "theme_mode": ["aurora_dark", "midnight", "glass_cyan"],
    "preferred_model": ["default", "fast", "reasoning"],
    "developer_mode_enabled": ["true", "false"],
    "demo_mode_preference": ["true", "false"],
    "startup_briefing_enabled": ["true", "false"],
}


def get_connection():
    return managed_connection(DB_PATH)


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def init_user_settings_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS user_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                description TEXT DEFAULT '',
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
    ensure_default_settings()


def ensure_default_settings() -> None:
    now = _now()
    with get_connection() as conn:
        for key, value in DEFAULT_SETTINGS.items():
            row = conn.execute(
                """
                SELECT key
                FROM user_settings
                WHERE key = ?
                """,
                (key,),
            ).fetchone()
            if not row:
                conn.execute(
                    """
                    INSERT INTO user_settings
                    (key, value, description, updated_at)
                    VALUES (?, ?, ?, ?)
                    """,
                    (key, value, SETTING_DESCRIPTIONS.get(key, ""), now),
                )
        conn.commit()


def list_user_settings() -> List[Dict[str, Any]]:
    init_user_settings_db()
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT *
            FROM user_settings
            ORDER BY key ASC
            """
        ).fetchall()

    settings = []
    for row in rows:
        item = dict(row)
        item["options"] = SETTING_OPTIONS.get(item["key"], [])
        settings.append(item)
    return settings


def get_user_setting(key: str) -> Optional[Dict[str, Any]]:
    init_user_settings_db()
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            """
            SELECT *
            FROM user_settings
            WHERE key = ?
            """,
            (key,),
        ).fetchone()

    if not row:
        return None
    item = dict(row)
    item["options"] = SETTING_OPTIONS.get(item["key"], [])
    return item


def get_user_settings_map() -> Dict[str, str]:
    settings = list_user_settings()
    return {item["key"]: item["value"] for item in settings}


def validate_setting_value(key: str, value: str) -> str:
    clean_key = key.strip()
    clean_value = str(value).strip()

    if clean_key not in ALLOWED_SETTINGS:
        raise ValueError(f"Unknown setting: {clean_key}")

    if clean_key in SETTING_OPTIONS:
        options = SETTING_OPTIONS[clean_key]
        if clean_value not in options:
            raise ValueError(
                f"Invalid value for {clean_key}. Allowed values: {', '.join(options)}"
            )

    if clean_key == "default_workspace_id" and clean_value:
        if not clean_value.isdigit() or int(clean_value) < 1:
            raise ValueError("default_workspace_id must be empty or a positive number.")
        if not get_workspace_record(int(clean_value)):
            raise ValueError(f"Workspace not found: {clean_value}")

    if clean_key in {"display_name", "role_title"}:
        if not clean_value:
            raise ValueError(f"{clean_key} cannot be empty.")
        if len(clean_value) > 80:
            raise ValueError(f"{clean_key} must be 80 characters or fewer.")
        if any(character in clean_value for character in "\r\n\t"):
            raise ValueError(f"{clean_key} must be a single line.")
        lowered = clean_value.lower()
        if any(
            secret_word in lowered
            for secret_word in [
                "api_key",
                "token",
                "password",
                "secret",
                "sk-",
            ]
        ):
            raise ValueError(f"{clean_key} must not contain secret-like values.")

    return clean_value


def update_user_setting(key: str, value: str) -> Dict[str, Any]:
    init_user_settings_db()
    clean_key = key.strip()
    clean_value = validate_setting_value(clean_key, value)
    now = _now()

    with get_connection() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO user_settings
            (key, value, description, updated_at)
            VALUES (?, ?, ?, ?)
            """,
            (clean_key, clean_value, SETTING_DESCRIPTIONS.get(clean_key, ""), now),
        )
        conn.commit()

    setting = get_user_setting(clean_key)
    if not setting:
        raise ValueError("Setting update failed.")
    return setting


def reset_user_settings() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        conn.execute("DELETE FROM user_settings")
        conn.commit()
    ensure_default_settings()
    return list_user_settings()


def render_user_profile_summary() -> str:
    settings = get_user_settings_map()
    return f"""# O.R.I.O.N. User Profile + Settings

## Profile

- Display Name: {settings.get('display_name', 'O.R.I.O.N. User')}
- Role Title: {settings.get('role_title', 'System Architect')}
- Default Workspace ID: {settings.get('default_workspace_id') or 'Not set'}

## Safety

- Safety Level: {settings.get('safety_level', 'strict')}
- Developer Mode Enabled: {settings.get('developer_mode_enabled', 'false')}

## Interface

- Theme Mode: {settings.get('theme_mode', 'aurora_dark')}
- Voice Mode: {settings.get('voice_mode', 'text_first')}
- Startup Briefing Enabled: {settings.get('startup_briefing_enabled', 'true')}

## Model

- Preferred Model: {settings.get('preferred_model', 'default')}

## Demo

- Demo Mode Preference: {settings.get('demo_mode_preference', 'false')}

## Notes

Settings are local configuration values. Sensitive secrets such as API keys must remain in `.env`, not in the profile database.
"""
