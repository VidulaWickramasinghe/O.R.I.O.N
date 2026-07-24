import json
import math
import os
import sqlite3
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from openai import OpenAI

from core.knowledge_base import list_knowledge_documents, read_document_chunks
from core.persistent_memory import list_recent_memory

DATA_DIR = BACKEND_DIR / "data"
DB_PATH = DATA_DIR / "orion_vectors.sqlite"

DATA_DIR.mkdir(parents=True, exist_ok=True)

EMBEDDING_MODEL = "text-embedding-3-small"
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY")) if os.getenv("OPENAI_API_KEY") else None


def get_connection():
    return sqlite3.connect(DB_PATH)


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
        conn.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_vector_source
            ON vector_items(source_type, source_id)
            """
        )
        conn.commit()


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def create_embedding(text: str) -> List[float]:
    clean_text = text.strip()
    if not clean_text:
        raise ValueError("Cannot create embedding for empty text.")
    if client is None:
        raise ValueError("OPENAI_API_KEY is required to create vector embeddings.")

    response = client.embeddings.create(
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


def upsert_vector_item(
    source_type: str,
    source_id: str,
    title: str,
    content: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> int:
    init_vector_db()
    embedding = create_embedding(content)
    now = _now()

    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT OR REPLACE INTO vector_items
            (id, source_type, source_id, title, content, embedding_json, metadata_json, created_at, updated_at)
            VALUES (
                (SELECT id FROM vector_items WHERE source_type = ? AND source_id = ?),
                ?, ?, ?, ?, ?, ?,
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
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT id, source_type, source_id, title, content, metadata_json, created_at, updated_at
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
            item["metadata"] = json.loads(item.pop("metadata_json"))
        except json.JSONDecodeError:
            item["metadata"] = {}
        items.append(item)

    return items


def semantic_search(query: str, limit: int = 8) -> List[Dict[str, Any]]:
    init_vector_db()
    clean_query = query.strip()
    if not clean_query:
        return []

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
        try:
            embedding = json.loads(item["embedding_json"])
            score = cosine_similarity(query_embedding, embedding)
        except Exception:
            score = 0.0
        try:
            metadata = json.loads(item.get("metadata_json", "{}"))
        except json.JSONDecodeError:
            metadata = {}
        scored.append(
            {
                "id": item["id"],
                "source_type": item["source_type"],
                "source_id": item["source_id"],
                "title": item["title"],
                "content": item["content"],
                "metadata": metadata,
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
    documents = list_knowledge_documents(limit=limit)
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


def rebuild_vector_index() -> Dict[str, Any]:
    init_vector_db()
    memory_result = index_recent_memories_to_vectors(limit=80)
    knowledge_result = index_knowledge_documents_to_vectors(limit=80)
    return {
        "status": "rebuilt",
        "memory": memory_result,
        "knowledge": knowledge_result,
    }


def render_semantic_search_results(query: str, limit: int = 8) -> str:
    results = semantic_search(query=query, limit=limit)
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
