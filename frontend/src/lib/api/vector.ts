import { apiGet, apiPost } from "@/lib/api/client";
export const getVectorItems = () => apiGet<{ items: unknown[] }>("/api/vector/items");
export const rebuildVectorIndex = () => apiPost<{ status: string }>("/api/vector/rebuild");
export const searchVector = (query: string, limit = 8) => apiPost<{ results: unknown[] }>("/api/vector/search", { query, limit });
