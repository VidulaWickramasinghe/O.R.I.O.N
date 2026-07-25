import { apiGet, apiPost } from "@/lib/api/client";
import type { PublicLandingResult } from "@/types/orion";
export const getPublicLandingStatus = () => apiGet<PublicLandingResult>("/api/public-landing/status");
export const savePublicLandingReport = () => apiPost<PublicLandingResult>("/api/public-landing/report/save");
