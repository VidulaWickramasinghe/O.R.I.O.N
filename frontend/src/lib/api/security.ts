import { apiGet, apiPost } from "@/lib/api/client";
import type { SecurityPolicyEventItem, SecurityProfileItem } from "@/types/orion";
export type SecurityPolicyResponse = { active_policy: Record<string, unknown>; profiles: SecurityProfileItem[]; events: SecurityPolicyEventItem[]; report: string };
export type SecurityPolicyApplyResponse = { status: string; profile_key: string; profile_name: string; summary: string; enabled_count: number; disabled_count: number; unchanged_count: number; applied_at: string; active_policy: Record<string, unknown> };
export const getSecurityPolicy = () => apiGet<SecurityPolicyResponse>("/api/security/policy");
export const applySecurityProfile = (profileKey: string) => apiPost<SecurityPolicyApplyResponse>("/api/security/policy/apply", { profile_key: profileKey });
