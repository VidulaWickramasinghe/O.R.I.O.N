import { apiGet, apiPost } from "@/lib/api/client";
import type { ActivityEvent, SystemStatus } from "@/types/orion";
export const getSystemStatus = () => apiGet<SystemStatus>("/api/status");
export const getActivity = () => apiGet<ActivityEvent[]>("/api/activity");
export const clearActivity = () => apiPost<{ status: string }>("/api/activity/clear");
