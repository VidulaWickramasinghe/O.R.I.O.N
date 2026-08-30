import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional


from core.database import managed_connection
from core.capability_gateway import requires_gateway
from core.runtime_paths import runtime_data_dir
BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = runtime_data_dir()
DB_PATH = DATA_DIR / "orion_memory.sqlite"

DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_connection():
    return managed_connection(DB_PATH)


def init_memory_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS memory_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                source TEXT DEFAULT 'user',
                importance INTEGER DEFAULT 3,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        columns = {
            str(row[1]) for row in conn.execute("PRAGMA table_info(memory_items)")
        }
        migrations = {
            "workspace_id": "INTEGER",
            "project_key": "TEXT DEFAULT ''",
            "sensitivity": "TEXT NOT NULL DEFAULT 'internal'",
            "expires_at": "TEXT DEFAULT ''",
            "excluded": "INTEGER NOT NULL DEFAULT 0",
            "exclusion_reason": "TEXT DEFAULT ''",
            "provenance_json": "TEXT NOT NULL DEFAULT '{}'",
        }
        for column, definition in migrations.items():
            if column not in columns:
                conn.execute(f"ALTER TABLE memory_items ADD COLUMN {column} {definition}")
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_memory_scope ON memory_items(workspace_id, project_key, excluded)"
        )
        conn.commit()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _clean_expiry(value: str) -> str:
    clean = str(value or "").strip()
    if not clean:
        return ""
    try:
        parsed = datetime.fromisoformat(clean.replace("Z", "+00:00"))
    except ValueError as error:
        raise ValueError("Memory expiry must be an ISO-8601 timestamp.") from error
    if parsed.tzinfo is None:
        raise ValueError("Memory expiry must include a timezone offset.")
    return parsed.astimezone(timezone.utc).isoformat(timespec="seconds")


def _decode(item: Dict[str, Any], retrieval_reason: str = "") -> Dict[str, Any]:
    try:
        provenance = json.loads(item.pop("provenance_json", "{}"))
        item["provenance"] = provenance if isinstance(provenance, dict) else {}
    except (json.JSONDecodeError, TypeError):
        item["provenance"] = {}
    item["excluded"] = bool(item.get("excluded", 0))
    if retrieval_reason:
        item["retrieval_reason"] = retrieval_reason
    return item


def _scope_sql(
    workspace_id: Optional[int],
    project_key: str,
    *,
    include_sensitive: bool,
    include_excluded: bool,
    include_expired: bool = False,
) -> tuple[str, list[Any]]:
    clauses = []
    values: list[Any] = []
    if not include_excluded:
        clauses.append("excluded = 0")
    if not include_expired:
        clauses.append("(expires_at = '' OR expires_at > ?)")
        values.append(_now())
    if not include_sensitive:
        clauses.append("sensitivity != 'sensitive'")
    if workspace_id is None:
        clauses.append("workspace_id IS NULL")
    else:
        clauses.append("(workspace_id IS NULL OR workspace_id = ?)")
        values.append(int(workspace_id))
    clean_project = str(project_key or "").strip()
    if clean_project:
        clauses.append("(project_key = '' OR project_key = ?)")
        values.append(clean_project)
    else:
        clauses.append("project_key = ''")
    return " AND ".join(clauses), values


@requires_gateway
def save_memory_item(
    category: str,
    title: str,
    content: str,
    source: str = "user",
    importance: int = 3,
    workspace_id: Optional[int] = None,
    project_key: str = "",
    sensitivity: str = "internal",
    expires_at: str = "",
    provenance: Optional[Dict[str, Any]] = None,
) -> int:
    init_memory_db()

    now = _now()
    clean_sensitivity = str(sensitivity).strip().lower()
    if clean_sensitivity not in {"public", "internal", "sensitive"}:
        raise ValueError("Memory sensitivity must be public, internal, or sensitive.")

    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO memory_items
            (category, title, content, source, importance, workspace_id,
             project_key, sensitivity, expires_at, excluded, exclusion_reason,
             provenance_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '', ?, ?, ?)
            """,
            (
                category,
                title,
                content,
                source,
                importance,
                int(workspace_id) if workspace_id is not None else None,
                str(project_key).strip(),
                clean_sensitivity,
                _clean_expiry(expires_at),
                json.dumps(
                    provenance
                    or {"source": source, "captured_at": now, "method": "explicit_save"},
                    sort_keys=True,
                ),
                now,
                now,
            ),
        )
        conn.commit()
        return int(cursor.lastrowid)


def list_recent_memory(
    limit: int = 20,
    *,
    workspace_id: Optional[int] = None,
    project_key: str = "",
    include_sensitive: bool = False,
    include_excluded: bool = False,
    include_expired: bool = False,
) -> List[Dict[str, Any]]:
    init_memory_db()
    scope_sql, values = _scope_sql(
        workspace_id,
        project_key,
        include_sensitive=include_sensitive,
        include_excluded=include_excluded,
        include_expired=include_expired,
    )

    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT *
            FROM memory_items
            WHERE """ + scope_sql + """
            ORDER BY id DESC
            LIMIT ?
            """,
            (*values, max(1, min(int(limit), 500))),
        ).fetchall()

    reason = "Recent memory matched the active workspace/project scope."
    return [_decode(dict(row), reason) for row in rows]


def search_memory_items(
    query: str,
    limit: int = 10,
    *,
    workspace_id: Optional[int] = None,
    project_key: str = "",
    include_sensitive: bool = False,
) -> List[Dict[str, Any]]:
    init_memory_db()

    like_query = f"%{query.lower()}%"

    scope_sql, scope_values = _scope_sql(
        workspace_id,
        project_key,
        include_sensitive=include_sensitive,
        include_excluded=False,
        include_expired=False,
    )
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT *
            FROM memory_items
            WHERE (lower(category) LIKE ?
               OR lower(title) LIKE ?
               OR lower(content) LIKE ?)
              AND """ + scope_sql + """
            ORDER BY importance DESC, id DESC
            LIMIT ?
            """,
            (
                like_query,
                like_query,
                like_query,
                *scope_values,
                max(1, min(int(limit), 100)),
            ),
        ).fetchall()

    reason = f"Keyword match for '{query}' within the active workspace/project scope."
    return [_decode(dict(row), reason) for row in rows]


def get_memory_item(memory_id: int, *, include_excluded: bool = True) -> Optional[Dict[str, Any]]:
    init_memory_db()
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM memory_items WHERE id = ?", (int(memory_id),)
        ).fetchone()
    if not row:
        return None
    item = _decode(dict(row))
    if item["excluded"] and not include_excluded:
        return None
    return item


@requires_gateway
def update_memory_item(
    memory_id: int,
    *,
    title: Optional[str] = None,
    content: Optional[str] = None,
    category: Optional[str] = None,
    importance: Optional[int] = None,
    sensitivity: Optional[str] = None,
    expires_at: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    current = get_memory_item(memory_id)
    if not current:
        return None
    clean_sensitivity = str(sensitivity or current["sensitivity"]).strip().lower()
    if clean_sensitivity not in {"public", "internal", "sensitive"}:
        raise ValueError("Memory sensitivity must be public, internal, or sensitive.")
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE memory_items
            SET title = ?, content = ?, category = ?, importance = ?,
                sensitivity = ?, expires_at = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                str(title if title is not None else current["title"]),
                str(content if content is not None else current["content"]),
                str(category if category is not None else current["category"]),
                int(importance if importance is not None else current["importance"]),
                clean_sensitivity,
                _clean_expiry(expires_at if expires_at is not None else current["expires_at"]),
                _now(),
                int(memory_id),
            ),
        )
    return get_memory_item(memory_id)


@requires_gateway
def set_memory_excluded(memory_id: int, excluded: bool, reason: str = "") -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.execute(
            """
            UPDATE memory_items
            SET excluded = ?, exclusion_reason = ?, updated_at = ?
            WHERE id = ?
            """,
            (int(bool(excluded)), str(reason)[:1000] if excluded else "", _now(), int(memory_id)),
        )
    return get_memory_item(memory_id) if cursor.rowcount else None


@requires_gateway
def delete_memory_item(memory_id: int) -> bool:
    init_memory_db()
    with get_connection() as conn:
        cursor = conn.execute("DELETE FROM memory_items WHERE id = ?", (int(memory_id),))
    return cursor.rowcount == 1
