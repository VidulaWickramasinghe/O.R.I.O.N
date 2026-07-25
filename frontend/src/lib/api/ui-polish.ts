import { apiGet, apiPost } from "@/lib/api/client";
import type { UIPolishResult } from "@/types/orion";
export const getUIPolishStatus = () => apiGet<UIPolishResult>("/api/ui-polish/status");
export const saveUIPolishReport = () => apiPost<UIPolishResult>("/api/ui-polish/report/save");
