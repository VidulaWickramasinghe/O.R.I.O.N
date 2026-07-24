from agents import function_tool

from core.notification_engine import (
    create_reminder_record,
    generate_startup_briefing,
    list_reminders,
    refresh_due_reminders,
    update_reminder_status,
)
from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission


@function_tool
@instrument_tool("create_local_reminder")
@enforce_tool_permission("create_local_reminder")
def create_local_reminder(
    title: str,
    description: str,
    due_at: str,
    priority: str = "medium",
) -> str:
    """
    Create a local O.R.I.O.N. reminder.
    due_at supports ISO timestamps or simple phrases like tomorrow, 30 minutes, 2 hours, 3 days.
    """
    try:
        reminder = create_reminder_record(
            title=title,
            description=description,
            due_at=due_at,
            priority=priority,
            source="agent",
        )
        return f"""
Reminder created.

ID: {reminder['id']}
Title: {reminder['title']}
Due: {reminder['due_at']}
Priority: {reminder['priority']}
Status: {reminder['status']}
""".strip()
    except Exception as error:
        return f"Reminder creation failed: {error}"


@function_tool
@instrument_tool("list_local_reminders")
@enforce_tool_permission("list_local_reminders")
def list_local_reminders(status: str = "", limit: int = 20) -> str:
    """
    List local O.R.I.O.N. reminders.
    """
    clean_status = status.strip() or None
    reminders = list_reminders(limit=limit, status=clean_status)
    if not reminders:
        return "No reminders found."

    return "\n".join(
        f"[{item['id']}] {item['title']} | Status: {item['status']} | "
        f"Priority: {item['priority']} | Due: {item['due_at']} | {item['description']}"
        for item in reminders
    )


@function_tool
@instrument_tool("complete_local_reminder")
@enforce_tool_permission("complete_local_reminder")
def complete_local_reminder(reminder_id: int) -> str:
    """
    Mark a local reminder as completed.
    """
    try:
        updated = update_reminder_status(reminder_id, "completed")
        if not updated:
            return "Reminder not found."
        return f"Reminder {reminder_id} marked completed."
    except Exception as error:
        return f"Reminder completion failed: {error}"


@function_tool
@instrument_tool("refresh_due_reminders")
@enforce_tool_permission("refresh_due_reminders")
def refresh_due_reminders_tool() -> str:
    """
    Refresh reminders and mark due reminders.
    """
    due = refresh_due_reminders()
    if not due:
        return "No reminders are due."
    return "\n".join(
        f"Reminder due: [{item['id']}] {item['title']} | {item['due_at']}"
        for item in due
    )


@function_tool
@instrument_tool("generate_startup_briefing")
@enforce_tool_permission("generate_startup_briefing")
def generate_startup_briefing_tool() -> str:
    """
    Generate a local O.R.I.O.N. startup briefing from reminders and notifications.
    """
    return generate_startup_briefing()
