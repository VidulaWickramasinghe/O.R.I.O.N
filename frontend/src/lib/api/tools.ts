import { apiGet } from "@/lib/api/client";
import type { ToolAuditEventItem, ToolPermissionItem } from "@/types/orion";
export type ToolPermissionResponse = { metrics: Record<string, unknown>; matrix: ToolPermissionItem[]; report: string };
export type ToolAuditResponse = { metrics: Record<string, unknown>; events: ToolAuditEventItem[]; report: string };
export const getToolPermissions = () => apiGet<ToolPermissionResponse>("/api/tools/permissions");
export const getToolAudit = () => apiGet<ToolAuditResponse>("/api/tools/audit");
