import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from core.capability_gateway import (
    CapabilityContext,
    execute_capability,
    requires_gateway,
)
from core.runtime_paths import runtime_data_dir


BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = runtime_data_dir()
VOICE_STATE_FILE = DATA_DIR / "voice_state.json"

DATA_DIR.mkdir(parents=True, exist_ok=True)


DEFAULT_STATE = {
    "mode": "idle",
    "wake_phrase": "Hey Orion",
    "listening": False,
    "last_transcript": "",
    "last_response": "",
    "last_event": "Voice system initialized.",
    "updated_at": "",
}


def load_voice_state() -> Dict[str, Any]:
    if not VOICE_STATE_FILE.exists():
        return DEFAULT_STATE.copy()

    try:
        return json.loads(VOICE_STATE_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return DEFAULT_STATE.copy()


@requires_gateway
def save_voice_state(state: Dict[str, Any]) -> None:
    state["updated_at"] = datetime.now().isoformat(timespec="seconds")
    VOICE_STATE_FILE.write_text(
        json.dumps(state, indent=2),
        encoding="utf-8",
    )


@requires_gateway
def update_voice_state(**updates) -> Dict[str, Any]:
    state = load_voice_state()
    state.update(updates)
    save_voice_state(state)
    return state


def execute_voice_state_update(actor: str, source: str, **updates) -> Dict[str, Any]:
    """Enter the gateway for trusted voice-runtime state transitions."""

    return execute_capability(
        "update_voice_state",
        CapabilityContext(actor=actor, source=source, scope="plugin:voice_system"),
        update_voice_state,
        **updates,
    )
