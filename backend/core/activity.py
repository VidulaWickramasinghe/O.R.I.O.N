import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List


BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_DIR / "data"
ACTIVITY_FILE = DATA_DIR / "activity_timeline.json"

DATA_DIR.mkdir(parents=True, exist_ok=True)


def _load_events() -> List[Dict[str, Any]]:
    if not ACTIVITY_FILE.exists():
        return []

    try:
        return json.loads(ACTIVITY_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []


def _save_events(events: List[Dict[str, Any]]) -> None:
    ACTIVITY_FILE.write_text(
        json.dumps(events[-100:], indent=2),
        encoding="utf-8",
    )


def log_activity(event_type: str, message: str, source: str = "O.R.I.O.N.") -> Dict[str, Any]:
    events = _load_events()

    event = {
        "id": len(events) + 1,
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "type": event_type,
        "source": source,
        "message": message,
    }

    events.append(event)
    _save_events(events)

    return event


def get_recent_activity(limit: int = 30) -> List[Dict[str, Any]]:
    events = _load_events()
    return list(reversed(events[-limit:]))


def clear_activity() -> None:
    _save_events([])
