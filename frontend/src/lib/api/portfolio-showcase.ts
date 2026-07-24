import { apiGet, apiPost } from "@/lib/api/client";
import type { PortfolioShowcaseResult } from "@/types/orion";
export const getPortfolioShowcaseStatus = () => apiGet<PortfolioShowcaseResult>("/api/portfolio-showcase/status");
export const savePortfolioShowcaseReport = () => apiPost<PortfolioShowcaseResult>("/api/portfolio-showcase/report/save");
