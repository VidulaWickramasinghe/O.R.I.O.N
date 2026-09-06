import { apiGet, apiPost } from "@/lib/api/client";
import type { WorkspaceItem } from "@/types/orion";
export type WorkspacesResponse = { workspaces: WorkspaceItem[] };
export const getWorkspaces = () => apiGet<WorkspacesResponse>("/api/workspaces");
export type WorkspaceRegistration = { name: string; path: string; description: string; trusted: boolean; source_consent: boolean };
export const registerWorkspace = (draft: WorkspaceRegistration) => apiPost<{ status: string; workspace_id: number; name: string; path: string }>("/api/workspaces/register", draft);
