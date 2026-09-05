import { apiGet } from "@/lib/api/client";
import type { DurableAuditEventItem, ToolAuditEventItem, ToolPermissionItem } from "@/types/orion";
export type ToolPermissionResponse = { metrics: Record<string, unknown>; matrix: ToolPermissionItem[]; report: string };
export type ToolAuditResponse = { metrics: Record<string, unknown>; events: ToolAuditEventItem[]; report: string };
export const getToolPermissions = () => apiGet<ToolPermissionResponse>("/api/tools/permissions");
export const getToolAudit = () => apiGet<ToolAuditResponse>("/api/tools/audit");
export const getAuditEvents = (filters: {
  missionId?: number;
  correlationId?: string;
  phase?: string;
  limit?: number;
} = {}) => apiGet<{ events: DurableAuditEventItem[] }>("/api/audit/events", {
  query: {
    mission_id: filters.missionId,
    correlation_id: filters.correlationId,
    phase: filters.phase,
    limit: filters.limit ?? 200,
  },
});
