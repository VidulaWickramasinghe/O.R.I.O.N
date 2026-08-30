import os
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from core.database import managed_connection
from core.capability_gateway import requires_gateway
from core.workspace_manager import (
    get_trusted_workspace_record,
    resolve_workspace_path,
)
from core.runtime_paths import runtime_data_dir
BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = runtime_data_dir()
KNOWLEDGE_DIR = DATA_DIR / "knowledge_base"
DB_PATH = DATA_DIR / "orion_knowledge.sqlite"

DATA_DIR.mkdir(parents=True, exist_ok=True)
KNOWLEDGE_DIR.mkdir(parents=True, exist_ok=True)

SUPPORTED_EXTENSIONS = {
    ".md",
    ".txt",
    ".json",
    ".csv",
    ".py",
    ".tsx",
    ".ts",
    ".js",
    ".jsx",
    ".css",
    ".html",
}


def get_connection():
    return managed_connection(DB_PATH)


def init_knowledge_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS knowledge_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                source_path TEXT NOT NULL UNIQUE,
                extension TEXT NOT NULL,
                size_bytes INTEGER DEFAULT 0,
                summary TEXT DEFAULT '',
                workspace_id INTEGER,
                relative_path TEXT DEFAULT '',
                source_consent INTEGER NOT NULL DEFAULT 0,
                indexed_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        columns = {
            str(row[1])
            for row in conn.execute("PRAGMA table_info(knowledge_documents)").fetchall()
        }
        migrations = {
            "workspace_id": "INTEGER",
            "relative_path": "TEXT DEFAULT ''",
            "source_consent": "INTEGER NOT NULL DEFAULT 0",
        }
        for column, definition in migrations.items():
            if column not in columns:
                conn.execute(
                    f"ALTER TABLE knowledge_documents ADD COLUMN {column} {definition}"
                )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS knowledge_chunks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER NOT NULL,
                chunk_index INTEGER NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(document_id) REFERENCES knowledge_documents(id)
            )
            """
        )
        conn.commit()


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _safe_title(path: Path) -> str:
    return path.stem.replace("_", " ").replace("-", " ").strip() or path.name


def _read_text_file(path: Path, limit: int = 250_000) -> str:
    if path.stat().st_size > limit:
        return path.read_text(encoding="utf-8", errors="ignore")[:limit]
    return path.read_text(encoding="utf-8", errors="ignore")


def _chunk_text(text: str, chunk_size: int = 1800, overlap: int = 200) -> List[str]:
    clean = text.strip()
    if not clean:
        return []

    chunks = []
    start = 0

    while start < len(clean):
        end = min(start + chunk_size, len(clean))
        chunk = clean[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == len(clean):
            break
        start = end - overlap

    return chunks


def _require_source_consent(workspace_id: int, source_consent: bool) -> Dict[str, Any]:
    if not source_consent:
        raise PermissionError("Knowledge ingestion requires explicit source consent.")
    return get_trusted_workspace_record(workspace_id)


@requires_gateway
def _index_document_path(
    workspace_id: int,
    relative_path: str,
    source_path: Path,
    summary: str = "",
) -> Dict[str, Any]:
    logical_source = f"workspace:{workspace_id}/{relative_path.replace(chr(92), '/')}"
    if source_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file extension: {source_path.suffix}. "
            f"Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        )

    content = _read_text_file(source_path)
    chunks = _chunk_text(content)
    now = _now()

    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT OR REPLACE INTO knowledge_documents
            (id, title, source_path, extension, size_bytes, summary,
             workspace_id, relative_path, source_consent, indexed_at, updated_at)
            VALUES (
                (SELECT id FROM knowledge_documents WHERE source_path = ?),
                ?, ?, ?, ?, ?, ?, ?, 1,
                COALESCE((SELECT indexed_at FROM knowledge_documents WHERE source_path = ?), ?),
                ?
            )
            """,
            (
                logical_source,
                _safe_title(source_path),
                logical_source,
                source_path.suffix.lower(),
                source_path.stat().st_size,
                summary,
                workspace_id,
                relative_path.replace("\\", "/"),
                logical_source,
                now,
                now,
            ),
        )
        document_id = cursor.lastrowid
        row = conn.execute(
            "SELECT id FROM knowledge_documents WHERE source_path = ?",
            (logical_source,),
        ).fetchone()
        if row:
            document_id = int(row[0])
        conn.execute(
            "DELETE FROM knowledge_chunks WHERE document_id = ?",
            (document_id,),
        )
        for index, chunk in enumerate(chunks):
            conn.execute(
                """
                INSERT INTO knowledge_chunks
                (document_id, chunk_index, content, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (document_id, index, chunk, now),
            )
        conn.commit()

    return {
        "document_id": document_id,
        "workspace_id": workspace_id,
        "title": _safe_title(source_path),
        "source_path": logical_source,
        "relative_path": relative_path.replace("\\", "/"),
        "extension": source_path.suffix.lower(),
        "chunks": len(chunks),
        "size_bytes": source_path.stat().st_size,
    }


@requires_gateway
def index_document(
    workspace_id: int,
    relative_path: str,
    summary: str = "",
    source_consent: bool = False,
) -> Dict[str, Any]:
    init_knowledge_db()
    _require_source_consent(workspace_id, source_consent)
    source_path = resolve_workspace_path(
        workspace_id,
        relative_path,
        must_exist=True,
        require_file=True,
    )
    return _index_document_path(workspace_id, relative_path, source_path, summary)


@requires_gateway
def index_knowledge_folder(
    workspace_id: int,
    relative_path: str = ".",
    source_consent: bool = False,
) -> Dict[str, Any]:
    init_knowledge_db()
    workspace = _require_source_consent(workspace_id, source_consent)
    root = Path(str(workspace["path"])).resolve(strict=True)
    folder = resolve_workspace_path(
        workspace_id,
        relative_path,
        must_exist=True,
        require_directory=True,
        allow_root=True,
    )

    indexed = []
    failed = []

    for current_root, directory_names, file_names in os.walk(folder, followlinks=False):
        directory_names[:] = [
            name
            for name in directory_names
            if name not in {".git", "node_modules", ".next", ".venv", "__pycache__"}
            and not (Path(current_root) / name).is_symlink()
        ]
        for filename in file_names:
            path = Path(current_root) / filename
            if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
                continue
            candidate_relative = path.relative_to(root).as_posix()
            try:
                safe_path = resolve_workspace_path(
                    workspace_id,
                    candidate_relative,
                    must_exist=True,
                    require_file=True,
                )
                indexed.append(
                    _index_document_path(
                        workspace_id,
                        candidate_relative,
                        safe_path,
                    )
                )
            except Exception as error:
                failed.append(
                    {
                        "path": candidate_relative,
                        "error": str(error),
                    }
                )

    return {
        "workspace_id": workspace_id,
        "folder": relative_path,
        "indexed_count": len(indexed),
        "failed_count": len(failed),
        "indexed": indexed,
        "failed": failed,
    }


def list_knowledge_documents(limit: int = 50) -> List[Dict[str, Any]]:
    init_knowledge_db()
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT *
            FROM knowledge_documents
            ORDER BY updated_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [dict(row) for row in rows]


def get_knowledge_document(document_id: int) -> Optional[Dict[str, Any]]:
    init_knowledge_db()
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            """
            SELECT *
            FROM knowledge_documents
            WHERE id = ?
            """,
            (document_id,),
        ).fetchone()
    return dict(row) if row else None


def read_document_chunks(document_id: int, limit: int = 10) -> List[Dict[str, Any]]:
    init_knowledge_db()
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT *
            FROM knowledge_chunks
            WHERE document_id = ?
            ORDER BY chunk_index ASC
            LIMIT ?
            """,
            (document_id, limit),
        ).fetchall()
    return [dict(row) for row in rows]


def search_knowledge(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    init_knowledge_db()
    clean_query = query.strip()
    if not clean_query:
        return []

    like_query = f"%{clean_query}%"
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT
                knowledge_chunks.id AS chunk_id,
                knowledge_chunks.document_id,
                knowledge_chunks.chunk_index,
                knowledge_chunks.content,
                knowledge_documents.title,
                knowledge_documents.source_path,
                knowledge_documents.extension
            FROM knowledge_chunks
            JOIN knowledge_documents
                ON knowledge_documents.id = knowledge_chunks.document_id
            WHERE
                knowledge_chunks.content LIKE ?
                OR knowledge_documents.title LIKE ?
                OR knowledge_documents.summary LIKE ?
            ORDER BY knowledge_documents.updated_at DESC
            LIMIT ?
            """,
            (like_query, like_query, like_query, limit),
        ).fetchall()
    return [dict(row) for row in rows]


def summarize_knowledge_document(document_id: int) -> str:
    document = get_knowledge_document(document_id)
    if not document:
        return "Document not found."

    chunks = read_document_chunks(document_id, limit=5)
    preview = "\n\n".join(chunk["content"] for chunk in chunks)

    return f"""
# Knowledge Document Summary
Document ID: {document['id']}
Title: {document['title']}
Path: {document['source_path']}
Type: {document['extension']}
Size: {document['size_bytes']} bytes
Indexed: {document['indexed_at']}
Updated: {document['updated_at']}
Stored Summary:
{document['summary'] or 'No manual summary stored.'}
Content Preview:
{preview[:5000]}
""".strip()
