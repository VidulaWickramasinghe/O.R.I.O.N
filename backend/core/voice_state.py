import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict


BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_DIR / "data"
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
        save_voice_state(DEFAULT_STATE)

    try:
        return json.loads(VOICE_STATE_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        save_voice_state(DEFAULT_STATE)
        return DEFAULT_STATE.copy()


def save_voice_state(state: Dict[str, Any]) -> None:
    state["updated_at"] = datetime.now().isoformat(timespec="seconds")
    VOICE_STATE_FILE.write_text(
        json.dumps(state, indent=2),
        encoding="utf-8",
    )


def update_voice_state(**updates) -> Dict[str, Any]:
    state = load_voice_state()
    state.update(updates)
    save_voice_state(state)
    return state
