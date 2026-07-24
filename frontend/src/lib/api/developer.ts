import { apiGet, apiPost } from "@/lib/api/client";
export const getDeveloperReports = () => apiGet<{ reports: unknown[] }>("/api/developer/reports");
export const inspectDeveloperWorkspace = (id: number) => apiGet<unknown>(`/api/developer/workspaces/${id}/inspect`);
export const diagnoseDeveloperWorkspace = (id: number, issue_description: string) => apiPost<unknown>(`/api/developer/workspaces/${id}/diagnose`, { issue_description, target_files: [] });
export const createDeveloperPatchPlan = (id: number, issue_description: string) => apiPost<unknown>(`/api/developer/workspaces/${id}/patch-plan`, { issue_description, target_files: [] });
