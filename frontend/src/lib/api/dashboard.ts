import { apiGet } from "@/lib/api/client";
import type { DashboardIntelligence } from "@/types/orion";
export const getDashboardIntelligence = () => apiGet<DashboardIntelligence>("/api/dashboard/intelligence");
