import { apiGet, apiPost } from "@/lib/api/client";

export type WorkflowBlueprintItem = {
  key: string;
  name: string;
  description: string;
  priority: number;
  step_count: number;
};

export type WorkflowBlueprintDetail = {
  key: string;
  name: string;
  description: string;
  priority: number;
  steps: string[];
  rendered: string;
};

export type CreateWorkflowMissionPayload = {
  mission_title?: string;
  custom_goal?: string;
};

export type CreateWorkflowMissionResponse = {
  status: string;
  mission_id?: number | null;
  blueprint_key: string;
  title?: string;
  goal?: string;
  step_count?: number;
  created_at?: string;
  message?: string;
};

export const getWorkflowBlueprints = () =>
  apiGet<{ blueprints: WorkflowBlueprintItem[] }>("/api/workflows/blueprints");

export const getWorkflowBlueprint = (key: string) =>
  apiGet<WorkflowBlueprintDetail>(`/api/workflows/blueprints/${key}`);

export const createWorkflowMission = (
  key: string,
  workspace_id: number | null,
  payload: CreateWorkflowMissionPayload = {},
) =>
  apiPost<CreateWorkflowMissionResponse>(
    `/api/workflows/blueprints/${key}/create-mission`,
    {
      mission_title: payload.mission_title ?? "",
      custom_goal: payload.custom_goal ?? "",
      workspace_id,
    },
  );
