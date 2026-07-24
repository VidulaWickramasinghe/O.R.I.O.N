import { apiGet, apiPost } from "@/lib/api/client";
import type { FrontendRefactorResult } from "@/types/orion";
export const getFrontendRefactorStatus = () => apiGet<FrontendRefactorResult>("/api/frontend/refactor");
export const saveFrontendRefactorReport = () => apiPost<FrontendRefactorResult>("/api/frontend/refactor/report/save");
