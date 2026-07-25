import { apiGet, apiPost } from "@/lib/api/client";
import type { DesktopShellStatus } from "@/types/orion";
export const getDesktopShellStatus = () => apiGet<DesktopShellStatus>("/api/desktop-shell/status");

export type DesktopWorkspaceAction = {
  status: string;
  message: string;
  approval_id?: number | null;
};

export const runDesktopWorkspaceAction = (
  workspaceId: number,
  action: "open-vscode" | "open-folder" | "start-dev"
) =>
  apiPost<DesktopWorkspaceAction>(
    `/api/desktop/workspaces/${workspaceId}/${action}`
  );
