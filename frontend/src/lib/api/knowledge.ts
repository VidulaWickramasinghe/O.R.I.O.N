import { apiGet, apiPost } from "@/lib/api/client";
export const getKnowledgeDocuments = () => apiGet<{ documents: unknown[] }>("/api/knowledge/documents");
export const indexKnowledgeFolder = (
  workspace_id: number,
  relative_path: string,
  source_consent: boolean,
) => apiPost<{ status: string; message: string }>("/api/knowledge/index-folder", {
  workspace_id,
  relative_path,
  source_consent,
});
export const searchKnowledge = (query: string, workspace_id: number, limit = 8) => apiPost<{ results: unknown[] }>("/api/knowledge/search", { query, workspace_id, limit });
