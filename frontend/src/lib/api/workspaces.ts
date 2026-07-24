import { apiGet } from "@/lib/api/client";
import type { WorkspaceItem } from "@/types/orion";
export type WorkspacesResponse = { workspaces: WorkspaceItem[] };
export const getWorkspaces = () => apiGet<WorkspacesResponse>("/api/workspaces");
