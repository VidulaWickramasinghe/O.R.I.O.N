import { apiGet, apiPost } from "@/lib/api/client";
export const getWorkflowBlueprints = () => apiGet<{ blueprints: unknown[] }>("/api/workflows/blueprints");
export const getWorkflowBlueprint = (key: string) => apiGet<unknown>(`/api/workflows/blueprints/${key}`);
export const createWorkflowMission = (key: string, workspace_id: number | null) => apiPost<{ status: string; mission_id?: number; title?: string; step_count?: number; message?: string }>(`/api/workflows/blueprints/${key}/create-mission`, { mission_title: "", custom_goal: "", workspace_id });
