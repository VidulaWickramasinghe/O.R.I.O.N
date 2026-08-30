import json
import math
import os
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from openai import OpenAI

from core.knowledge_base import (
    get_knowledge_document,
    list_knowledge_documents,
    read_document_chunks,
)
from core.persistent_memory import get_memory_item, list_recent_memory
from core.database import managed_connection
from core.capability_gateway import requires_gateway
from core.runtime_paths import runtime_data_dir

DATA_DIR = runtime_data_dir()
DB_PATH = DATA_DIR / "orion_vectors.sqlite"

DATA_DIR.mkdir(parents=True, exist_ok=True)

EMBEDDING_MODEL = "text-embedding-3-small"


def get_connection():
    return managed_connection(DB_PATH)


def init_vector_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS vector_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_type TEXT NOT NULL,
                source_id TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                embedding_json TEXT NOT NULL,
                metadata_json TEXT DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        columns = {
            str(row[1]) for row in conn.execute("PRAGMA table_info(vector_items)")
        }
        migrations = {
            "workspace_id": "INTEGER",
            "project_key": "TEXT DEFAULT ''",
            "sensitivity": "TEXT NOT NULL DEFAULT 'internal'",
            "expires_at": "TEXT DEFAULT ''",
            "excluded": "INTEGER NOT NULL DEFAULT 0",
            "provenance_json": "TEXT NOT NULL DEFAULT '{}'",
        }
        for column, definition in migrations.items():
            if column not in columns:
                conn.execute(f"ALTER TABLE vector_items ADD COLUMN {column} {definition}")
        conn.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_vector_source
            ON vector_items(source_type, source_id)
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_vector_scope "
            "ON vector_items(workspace_id, project_key, excluded)"
        )
        conn.commit()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def create_embedding(text: str) -> List[float]:
    clean_text = text.strip()
    if not clean_text:
        raise ValueError("Cannot create embedding for empty text.")
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key or "YOUR_API_KEY" in api_key.upper() or "PLACEHOLDER" in api_key.upper():
        raise ValueError("OPENAI_API_KEY is required to create vector embeddings.")

    # Resolve configuration at call time because some launchers load dotenv
    # after importing their tool modules.
    response = OpenAI(api_key=api_key).embeddings.create(
        model=EMBEDDING_MODEL,
        input=clean_text[:8000],
    )
    return response.data[0].embedding


def cosine_similarity(a: List[float], b: List[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0

    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot / (norm_a * norm_b)


@requires_gateway
def upsert_vector_item(
    source_type: str,
    source_id: str,
    title: str,
    content: str,
    metadata: Optional[Dict[str, Any]] = None,
    *,
    workspace_id: Optional[int] = None,
    project_key: str = "",
    sensitivity: str = "internal",
    expires_at: str = "",
    provenance: Optional[Dict[str, Any]] = None,
) -> int:
    init_vector_db()
    embedding = create_embedding(content)
    now = _now()
    clean_sensitivity = str(sensitivity).strip().lower()
    if clean_sensitivity not in {"public", "internal", "sensitive"}:
        raise ValueError("Vector sensitivity must be public, internal, or sensitive.")

    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT OR REPLACE INTO vector_items
            (id, source_type, source_id, title, content, embedding_json, metadata_json,
             workspace_id, project_key, sensitivity, expires_at, excluded,
             provenance_json, created_at, updated_at)
            VALUES (
                (SELECT id FROM vector_items WHERE source_type = ? AND source_id = ?),
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?,
                COALESCE(
                    (SELECT created_at FROM vector_items WHERE source_type = ? AND source_id = ?),
                    ?
                ),
                ?
            )
            """,
            (
                source_type,
                source_id,
                source_type,
                source_id,
                title,
                content,
                json.dumps(embedding),
                json.dumps(metadata or {}),
                int(workspace_id) if workspace_id is not None else None,
                str(project_key).strip(),
                clean_sensitivity,
                str(expires_at).strip(),
                json.dumps(provenance or {}, sort_keys=True),
                source_type,
                source_id,
                now,
                now,
            ),
        )
        conn.commit()
        row = conn.execute(
            """
            SELECT id FROM vector_items
            WHERE source_type = ? AND source_id = ?
            """,
            (source_type, source_id),
        ).fetchone()
        return int(row[0]) if row else int(cursor.lastrowid)


def list_vector_items(limit: int = 50) -> List[Dict[str, Any]]:
    init_vector_db()
    limit = max(1, min(int(limit), 1000))
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT id, source_type, source_id, title, content, metadata_json,
                   workspace_id, project_key, sensitivity, expires_at, excluded,
                   provenance_json, created_at, updated_at
            FROM vector_items
            ORDER BY updated_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    items = []
    for row in rows:
        item = dict(row)
        try:
            metadata = json.loads(item.pop("metadata_json"))
            item["metadata"] = metadata if isinstance(metadata, dict) else {}
        except (json.JSONDecodeError, TypeError):
            item["metadata"] = {}
        try:
            provenance = json.loads(item.pop("provenance_json"))
            item["provenance"] = provenance if isinstance(provenance, dict) else {}
        except (json.JSONDecodeError, TypeError):
            item["provenance"] = {}
        item["excluded"] = bool(item.get("excluded", 0))
        items.append(item)

    return items


def _source_is_retrievable(
    item: Dict[str, Any],
    *,
    workspace_id: Optional[int],
    project_key: str,
    include_sensitive: bool,
) -> tuple[bool, Dict[str, Any]]:
    """Revalidate the authoritative record so stale vectors fail closed."""
    source_type = str(item.get("source_type", ""))
    source_id = str(item.get("source_id", ""))
    if source_type == "persistent_memory":
        try:
            source = get_memory_item(int(source_id), include_excluded=True)
        except ValueError:
            return False, {}
        if not source or source.get("excluded"):
            return False, {}
        if source.get("expires_at") and str(source["expires_at"]) <= _now():
            return False, {}
        if source.get("sensitivity") == "sensitive" and not include_sensitive:
            return False, {}
        source_workspace = source.get("workspace_id")
        if source_workspace is not None and int(source_workspace) != workspace_id:
            return False, {}
        source_project = str(source.get("project_key") or "")
        if source_project and source_project != str(project_key or "").strip():
            return False, {}
        return True, source

    if source_type == "knowledge_chunk":
        if workspace_id is None:
            return False, {}
        try:
            document_id = int(source_id.split(":", 1)[0])
        except (ValueError, IndexError):
            return False, {}
        source = get_knowledge_document(document_id)
        if not source or source.get("excluded") or not source.get("source_consent"):
            return False, {}
        if int(source.get("workspace_id") or -1) != int(workspace_id):
            return False, {}
        if source.get("expires_at") and str(source["expires_at"]) <= _now():
            return False, {}
        if source.get("sensitivity") == "sensitive" and not include_sensitive:
            return False, {}
        return True, source

    # Vector records without an authoritative, scoped source are not prompt-safe.
    return False, {}


def semantic_search(
    query: str,
    limit: int = 8,
    *,
    workspace_id: Optional[int] = None,
    project_key: str = "",
    include_sensitive: bool = False,
) -> List[Dict[str, Any]]:
    init_vector_db()
    clean_query = query.strip()
    if not clean_query:
        return []
    limit = max(1, min(int(limit), 100))

    query_embedding = create_embedding(clean_query)

    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT *
            FROM vector_items
            """
        ).fetchall()

    scored = []
    for row in rows:
        item = dict(row)
        allowed, source = _source_is_retrievable(
            item,
            workspace_id=workspace_id,
            project_key=project_key,
            include_sensitive=include_sensitive,
        )
        if not allowed:
            continue
        try:
            embedding = json.loads(item["embedding_json"])
            if not isinstance(embedding, list):
                continue
            score = cosine_similarity(query_embedding, embedding)
        except (json.JSONDecodeError, TypeError, ValueError):
            continue
        try:
            metadata = json.loads(item.get("metadata_json", "{}"))
            if not isinstance(metadata, dict):
                metadata = {}
        except (json.JSONDecodeError, TypeError):
            metadata = {}
        try:
            provenance = json.loads(item.get("provenance_json", "{}"))
            if not isinstance(provenance, dict):
                provenance = {}
        except (json.JSONDecodeError, TypeError):
            provenance = {}
        scored.append(
            {
                "id": item["id"],
                "source_type": item["source_type"],
                "source_id": item["source_id"],
                "title": item["title"],
                "content": item["content"],
                "metadata": metadata,
                "workspace_id": source.get("workspace_id"),
                "project_key": source.get("project_key", ""),
                "sensitivity": source.get("sensitivity", "internal"),
                "provenance": source.get("provenance") or provenance,
                "retrieval_reason": (
                    "Semantic similarity matched a live, consented source "
                    "within the active workspace/project scope."
                ),
                "score": score,
                "created_at": item["created_at"],
                "updated_at": item["updated_at"],
            }
        )

    scored.sort(key=lambda item: item["score"], reverse=True)
    return scored[:limit]


def index_recent_memories_to_vectors(limit: int = 50) -> Dict[str, Any]:
    memories = list_recent_memory(limit=limit)
    indexed = []
    failed = []

    for memory in memories:
        try:
            vector_id = upsert_vector_item(
                source_type="persistent_memory",
                source_id=str(memory["id"]),
                title=memory["title"],
                content=f"{memory['category']}\n{memory['title']}\n{memory['content']}",
                metadata={
                    "category": memory["category"],
                    "importance": memory["importance"],
                    "source": memory.get("source", "user"),
                },
                workspace_id=memory.get("workspace_id"),
                project_key=memory.get("project_key", ""),
                sensitivity=memory.get("sensitivity", "internal"),
                expires_at=memory.get("expires_at", ""),
                provenance=memory.get("provenance", {}),
            )
            indexed.append(
                {
                    "memory_id": memory["id"],
                    "vector_id": vector_id,
                    "title": memory["title"],
                }
            )
        except Exception as error:
            failed.append(
                {
                    "memory_id": memory.get("id"),
                    "error": str(error),
                }
            )

    return {
        "indexed_count": len(indexed),
        "failed_count": len(failed),
        "indexed": indexed,
        "failed": failed,
    }


def index_knowledge_documents_to_vectors(limit: int = 50) -> Dict[str, Any]:
    documents = [
        document
        for document in list_knowledge_documents(limit=limit)
        if document.get("source_consent") and not document.get("excluded")
    ]
    indexed = []
    failed = []

    for document in documents:
        chunks = read_document_chunks(document["id"], limit=80)
        for chunk in chunks:
            source_id = f"{document['id']}:{chunk['chunk_index']}"
            try:
                vector_id = upsert_vector_item(
                    source_type="knowledge_chunk",
                    source_id=source_id,
                    title=document["title"],
                    content=chunk["content"],
                    metadata={
                        "document_id": document["id"],
                        "chunk_index": chunk["chunk_index"],
                        "source_path": document["source_path"],
                        "extension": document["extension"],
                    },
                    workspace_id=document.get("workspace_id"),
                    sensitivity=document.get("sensitivity", "internal"),
                    expires_at=document.get("expires_at", ""),
                    provenance=document.get("provenance", {}),
                )
                indexed.append(
                    {
                        "document_id": document["id"],
                        "chunk_index": chunk["chunk_index"],
                        "vector_id": vector_id,
                    }
                )
            except Exception as error:
                failed.append(
                    {
                        "document_id": document["id"],
                        "chunk_index": chunk["chunk_index"],
                        "error": str(error),
                    }
                )

    return {
        "indexed_count": len(indexed),
        "failed_count": len(failed),
        "indexed": indexed,
        "failed": failed,
    }


@requires_gateway
def rebuild_vector_index() -> Dict[str, Any]:
    init_vector_db()
    memory_result = index_recent_memories_to_vectors(limit=80)
    knowledge_result = index_knowledge_documents_to_vectors(limit=80)
    indexed_count = memory_result["indexed_count"] + knowledge_result["indexed_count"]
    failed_count = memory_result["failed_count"] + knowledge_result["failed_count"]
    if failed_count and not indexed_count:
        status = "failed"
    elif failed_count:
        status = "partial"
    else:
        status = "rebuilt"
    return {
        "status": status,
        "indexed_count": indexed_count,
        "failed_count": failed_count,
        "memory": memory_result,
        "knowledge": knowledge_result,
    }


def render_semantic_search_results(
    query: str,
    limit: int = 8,
    *,
    workspace_id: Optional[int] = None,
    project_key: str = "",
) -> str:
    results = semantic_search(
        query=query,
        limit=limit,
        workspace_id=workspace_id,
        project_key=project_key,
    )
    if not results:
        return "No semantic results found."

    lines = [
        "# Semantic Search Results",
        "",
        f"Query: {query}",
        "",
    ]
    for result in results:
        lines.extend(
            [
                f"## {result['title']}",
                "",
                f"- Source Type: {result['source_type']}",
                f"- Source ID: {result['source_id']}",
                f"- Similarity Score: {result['score']:.4f}",
                "",
                result["content"][:1200],
                "",
            ]
        )

    return "\n".join(lines)
