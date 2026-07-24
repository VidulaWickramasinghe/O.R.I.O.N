import { apiGet } from "@/lib/api/client";
import type { DesktopShellStatus } from "@/types/orion";
export const getDesktopShellStatus = () => apiGet<DesktopShellStatus>("/api/desktop-shell/status");
