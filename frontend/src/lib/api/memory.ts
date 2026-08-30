import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type { MemoryItem } from "@/components/aurora/aurora-types";

export const getMemory = () =>
  apiGet<{ items: MemoryItem[] }>("/api/memory?include_excluded=true&include_sensitive=true&include_expired=true");
export const previewContext = (message: string, workspace_id?: number, project_key = "") =>
  apiPost<{ context: string }>("/api/context/preview", { message, workspace_id, project_key });
export const updateMemory = (memoryId: number, changes: Partial<Pick<MemoryItem, "title" | "content" | "category" | "importance" | "sensitivity" | "expires_at">>) =>
  apiPatch<MemoryItem>(`/api/memory/${memoryId}`, changes);
export const setMemoryExcluded = (memoryId: number, excluded: boolean, reason = "user_excluded") =>
  apiPost<MemoryItem>(`/api/memory/${memoryId}/exclusion`, { excluded, reason });
export const deleteMemory = (memoryId: number) =>
  apiDelete<{ status: string; memory_id: number }>(`/api/memory/${memoryId}`);
