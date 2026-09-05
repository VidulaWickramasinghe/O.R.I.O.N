import { apiGet, apiPost } from "@/lib/api/client";
export const getKnowledgeDocuments = () => apiGet<{ documents: unknown[] }>("/api/knowledge/documents");
export const indexKnowledgeFolder = (
  workspace_id: number,
  relative_path: string,
  source_consent: boolean,
) => apiPost<{ status: string; message: string; data?: Record<string, unknown> }>("/api/knowledge/index-folder", {
  workspace_id,
  relative_path,
  source_consent,
}).then((response) => {
  if (!new Set(["indexed", "partial"]).has(response.status)) {
    throw new Error(response.message || "Knowledge indexing was rejected.");
  }
  return response;
});
export const searchKnowledge = (query: string, workspace_id: number, limit = 8) => apiPost<{ results: unknown[] }>("/api/knowledge/search", { query, workspace_id, limit });
