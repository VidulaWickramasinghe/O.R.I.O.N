import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional


BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_DIR / "data"
DB_PATH = DATA_DIR / "orion_notifications.sqlite"

DATA_DIR.mkdir(parents=True, exist_ok=True)

REMINDER_STATUSES = {"pending", "due", "completed", "cancelled"}
REMINDER_PRIORITIES = {"low", "medium", "high"}


def get_connection():
    return sqlite3.connect(DB_PATH)


def init_notification_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS reminders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                due_at TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                priority TEXT DEFAULT 'medium',
                source TEXT DEFAULT 'user',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS notification_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                source TEXT DEFAULT 'O.R.I.O.N.',
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _parse_due_at(due_at: str) -> str:
    clean = due_at.strip()
    if not clean:
        raise ValueError("due_at cannot be empty.")

    try:
        parsed = datetime.fromisoformat(clean)
        return parsed.isoformat(timespec="seconds")
    except ValueError:
        pass

    lowered = clean.lower()
    if lowered in ["today", "tonight"]:
        return datetime.now().replace(hour=19, minute=0, second=0, microsecond=0).isoformat(timespec="seconds")
    if lowered == "tomorrow":
        return (datetime.now() + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0).isoformat(timespec="seconds")

    parts = lowered.split()
    if len(parts) == 2:
        try:
            number = int(parts[0])
        except ValueError as error:
            raise ValueError("Relative due_at phrases must start with a number.") from error

        unit = parts[1]
        if unit in ["minute", "minutes"]:
            return (datetime.now() + timedelta(minutes=number)).isoformat(timespec="seconds")
        if unit in ["hour", "hours"]:
            return (datetime.now() + timedelta(hours=number)).isoformat(timespec="seconds")
        if unit in ["day", "days"]:
            return (datetime.now() + timedelta(days=number)).isoformat(timespec="seconds")

    raise ValueError(
        "Unsupported due_at format. Use ISO format like 2026-07-05T18:00:00, "
        "or simple phrases like tomorrow, 30 minutes, 2 hours, 3 days."
    )


def create_notification_event(
    event_type: str,
    title: str,
    message: str,
    source: str = "O.R.I.O.N.",
) -> Dict[str, Any]:
    init_notification_db()
    now = _now()

    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO notification_events
            (event_type, title, message, source, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (event_type, title, message, source, now),
        )
        conn.commit()
        event_id = int(cursor.lastrowid)

    return {
        "id": event_id,
        "event_type": event_type,
        "title": title,
        "message": message,
        "source": source,
        "created_at": now,
    }


def create_reminder_record(
    title: str,
    description: str,
    due_at: str,
    priority: str = "medium",
    source: str = "user",
) -> Dict[str, Any]:
    init_notification_db()
    clean_title = title.strip()
    if not clean_title:
        raise ValueError("Reminder title cannot be empty.")

    clean_priority = priority.lower().strip()
    if clean_priority not in REMINDER_PRIORITIES:
        clean_priority = "medium"

    parsed_due_at = _parse_due_at(due_at)
    now = _now()

    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO reminders
            (title, description, due_at, status, priority, source, created_at, updated_at)
            VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)
            """,
            (clean_title, description.strip(), parsed_due_at, clean_priority, source, now, now),
        )
        conn.commit()
        reminder_id = int(cursor.lastrowid)

    create_notification_event(
        event_type="REMINDER_CREATED",
        title=f"Reminder created: {clean_title}",
        message=f"Due at {parsed_due_at}",
        source="O.R.I.O.N.",
    )

    return {
        "id": reminder_id,
        "title": clean_title,
        "description": description.strip(),
        "due_at": parsed_due_at,
        "status": "pending",
        "priority": clean_priority,
        "source": source,
        "created_at": now,
        "updated_at": now,
    }


def list_reminders(limit: int = 50, status: Optional[str] = None) -> List[Dict[str, Any]]:
    init_notification_db()
    bounded_limit = max(1, min(int(limit), 200))

    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        if status:
            rows = conn.execute(
                """
                SELECT *
                FROM reminders
                WHERE status = ?
                ORDER BY due_at ASC
                LIMIT ?
                """,
                (status, bounded_limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT *
                FROM reminders
                ORDER BY
                    CASE status
                        WHEN 'due' THEN 0
                        WHEN 'pending' THEN 1
                        WHEN 'completed' THEN 2
                        WHEN 'cancelled' THEN 3
                        ELSE 4
                    END,
                    due_at ASC
                LIMIT ?
                """,
                (bounded_limit,),
            ).fetchall()

    return [dict(row) for row in rows]


def get_reminder(reminder_id: int) -> Optional[Dict[str, Any]]:
    init_notification_db()
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT * FROM reminders WHERE id = ?", (reminder_id,)).fetchone()
    return dict(row) if row else None


def update_reminder_status(reminder_id: int, status: str) -> bool:
    init_notification_db()
    clean_status = status.lower().strip()
    if clean_status not in REMINDER_STATUSES:
        raise ValueError(f"Invalid reminder status: {status}")

    now = _now()
    with get_connection() as conn:
        cursor = conn.execute(
            """
            UPDATE reminders
            SET status = ?, updated_at = ?
            WHERE id = ?
            """,
            (clean_status, now, reminder_id),
        )
        conn.commit()
        updated = cursor.rowcount > 0

    if updated:
        create_notification_event(
            event_type="REMINDER_STATUS_UPDATED",
            title=f"Reminder {reminder_id} marked {clean_status}",
            message=f"Reminder status changed to {clean_status}.",
            source="O.R.I.O.N.",
        )

    return updated


def refresh_due_reminders() -> List[Dict[str, Any]]:
    init_notification_db()
    now_text = _now()

    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT *
            FROM reminders
            WHERE status = 'pending'
            AND due_at <= ?
            ORDER BY due_at ASC
            """,
            (now_text,),
        ).fetchall()
        due_items = [dict(row) for row in rows]

        for reminder in due_items:
            conn.execute(
                """
                UPDATE reminders
                SET status = 'due', updated_at = ?
                WHERE id = ?
                """,
                (now_text, reminder["id"]),
            )
        conn.commit()

    for reminder in due_items:
        create_notification_event(
            event_type="REMINDER_DUE",
            title=f"Reminder due: {reminder['title']}",
            message=reminder.get("description", ""),
            source="O.R.I.O.N.",
        )

    return due_items


def list_notification_events(limit: int = 50) -> List[Dict[str, Any]]:
    init_notification_db()
    bounded_limit = max(1, min(int(limit), 200))
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT *
            FROM notification_events
            ORDER BY id DESC
            LIMIT ?
            """,
            (bounded_limit,),
        ).fetchall()
    return [dict(row) for row in rows]


def generate_startup_briefing() -> str:
    refresh_due_reminders()
    due = list_reminders(limit=10, status="due")
    pending = list_reminders(limit=10, status="pending")
    events = list_notification_events(limit=10)

    due_text = "\n".join(
        f"- [{item['id']}] {item['title']} | Priority: {item['priority']} | Due: {item['due_at']}"
        for item in due
    ) or "No due reminders."
    pending_text = "\n".join(
        f"- [{item['id']}] {item['title']} | Priority: {item['priority']} | Due: {item['due_at']}"
        for item in pending
    ) or "No pending reminders."
    event_text = "\n".join(
        f"- [{item['created_at']}] {item['event_type']}: {item['title']}"
        for item in events
    ) or "No notification events."

    return f"""# O.R.I.O.N. Startup Briefing

## Due Reminders

{due_text}

## Upcoming Reminders

{pending_text}

## Recent Notification Events

{event_text}

## Suggested Action

Review due reminders first, then continue active missions or pending approvals.
"""
