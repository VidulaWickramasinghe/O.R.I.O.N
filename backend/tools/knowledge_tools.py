from agents import function_tool

from core.knowledge_base import (
    index_document,
    index_knowledge_folder,
    list_knowledge_documents,
    search_knowledge,
    summarize_knowledge_document,
)
from core.tool_logger import instrument_tool


@function_tool
@instrument_tool("index_knowledge_document")
def index_knowledge_document(path: str, summary: str = "") -> str:
    """
    Index a supported local knowledge document.
    Supported files include markdown, text, JSON, CSV, Python, TypeScript,
    JavaScript, CSS, and HTML.
    """
    try:
        result = index_document(path=path, summary=summary)
        return f"""
Knowledge document indexed.
Document ID: {result['document_id']}
Title: {result['title']}
Path: {result['source_path']}
Extension: {result['extension']}
Chunks: {result['chunks']}
Size: {result['size_bytes']} bytes
""".strip()
    except Exception as error:
        return f"Knowledge document indexing failed: {error}"


@function_tool
@instrument_tool("index_knowledge_folder")
def index_knowledge_folder_tool(folder_path: str) -> str:
    """
    Index supported documents inside a local folder.
    """
    try:
        result = index_knowledge_folder(folder_path)
        return f"""
Knowledge folder indexed.
Folder: {result['folder']}
Indexed: {result['indexed_count']}
Failed: {result['failed_count']}
""".strip()
    except Exception as error:
        return f"Knowledge folder indexing failed: {error}"


@function_tool
@instrument_tool("list_knowledge_documents")
def list_knowledge_documents_tool(limit: int = 20) -> str:
    """
    List indexed knowledge documents.
    """
    documents = list_knowledge_documents(limit=limit)
    if not documents:
        return "No knowledge documents indexed yet."

    return "\n".join(
        f"[{doc['id']}] {doc['title']} | {doc['extension']} | {doc['source_path']}"
        for doc in documents
    )


@function_tool
@instrument_tool("search_local_knowledge")
def search_local_knowledge(query: str, limit: int = 10) -> str:
    """
    Search indexed local knowledge documents.
    """
    results = search_knowledge(query=query, limit=limit)
    if not results:
        return "No matching knowledge found."

    return "\n\n".join(
        f"Document: {item['title']} | Document ID: {item['document_id']} | "
        f"Chunk: {item['chunk_index']}\n"
        f"Path: {item['source_path']}\n\n"
        f"{item['content'][:1200]}"
        for item in results
    )


@function_tool
@instrument_tool("summarize_knowledge_document")
def summarize_knowledge_document_tool(document_id: int) -> str:
    """
    Summarize an indexed knowledge document using stored chunks.
    """
    return summarize_knowledge_document(document_id=document_id)
