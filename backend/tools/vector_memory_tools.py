from agents import function_tool

from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission
from core.vector_memory import (
    list_vector_items,
    rebuild_vector_index,
    render_semantic_search_results,
)


@function_tool
@instrument_tool("rebuild_vector_memory_index")
@enforce_tool_permission("rebuild_vector_memory_index")
def rebuild_vector_memory_index() -> str:
    """
    Rebuild vector memory index from persistent memory and indexed knowledge documents.
    """
    try:
        result = rebuild_vector_index()
        return f"""
Vector memory index rebuilt.
Memory indexed: {result['memory']['indexed_count']}
Memory failed: {result['memory']['failed_count']}
Knowledge indexed: {result['knowledge']['indexed_count']}
Knowledge failed: {result['knowledge']['failed_count']}
""".strip()
    except Exception as error:
        return f"Vector memory rebuild failed: {error}"


@function_tool
@instrument_tool("semantic_memory_search")
@enforce_tool_permission("semantic_memory_search")
def semantic_memory_search(query: str, limit: int = 8) -> str:
    """
    Search memory and knowledge semantically by meaning.
    """
    try:
        return render_semantic_search_results(query=query, limit=limit)
    except Exception as error:
        return f"Semantic memory search failed: {error}"


@function_tool
@instrument_tool("list_vector_memory_items")
@enforce_tool_permission("list_vector_memory_items")
def list_vector_memory_items(limit: int = 20) -> str:
    """
    List indexed vector memory items.
    """
    items = list_vector_items(limit=limit)
    if not items:
        return "No vector memory items indexed yet."

    return "\n".join(
        f"[{item['id']}] {item['source_type']} | {item['title']} | Source ID: {item['source_id']}"
        for item in items
    )
