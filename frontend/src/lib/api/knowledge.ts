import { apiGet, apiPost } from "@/lib/api/client";
export const getKnowledgeDocuments = () => apiGet<{ documents: unknown[] }>("/api/knowledge/documents");
export const indexKnowledgeFolder = (folder_path: string) => apiPost<{ status: string; message: string }>("/api/knowledge/index-folder", { folder_path });
export const searchKnowledge = (query: string, limit = 8) => apiPost<{ results: unknown[] }>("/api/knowledge/search", { query, limit });
