from agents import function_tool
from core.tool_logger import instrument_tool
from datetime import datetime
from pathlib import Path

DATA_DIR = Path("backend/data")
LOG_DIR = Path("backend/logs")

DATA_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR.mkdir(parents=True, exist_ok=True)


@function_tool
@instrument_tool("create_note")
def create_note(title: str, content: str) -> str:
    """
    Create a safe text note inside backend/data.
    """
    safe_title = title.lower().replace(" ", "_").replace("/", "_")
    file_path = DATA_DIR / f"{safe_title}.txt"

    file_path.write_text(content, encoding="utf-8")

    return f"Note created: {file_path}"


@function_tool
@instrument_tool("read_note")
def read_note(title: str) -> str:
    """
    Read a note from backend/data by title.
    """
    safe_title = title.lower().replace(" ", "_").replace("/", "_")
    file_path = DATA_DIR / f"{safe_title}.txt"

    if not file_path.exists():
        return "No note found with that title."

    return file_path.read_text(encoding="utf-8")


@function_tool
@instrument_tool("save_activity_log")
def save_activity_log(activity: str) -> str:
    """
    Save an activity entry to the O.R.I.O.N. activity log.
    """
    log_path = LOG_DIR / "activity.log"
    timestamp = datetime.now().isoformat(timespec="seconds")

    with log_path.open("a", encoding="utf-8") as file:
        file.write(f"[{timestamp}] {activity}\n")

    return "Activity saved to log."


@function_tool
@instrument_tool("list_notes")
def list_notes() -> str:
    """
    List all notes inside backend/data.
    """
    notes = list(DATA_DIR.glob("*.txt"))

    if not notes:
        return "No notes found."

    return "\n".join(note.name for note in notes)
