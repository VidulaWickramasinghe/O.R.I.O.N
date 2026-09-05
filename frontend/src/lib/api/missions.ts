import { apiGet, apiPost } from "@/lib/api/client";
import type { MissionItem } from "@/components/aurora/aurora-types";

export type MissionsResponse = {
  missions: MissionItem[];
};

export const getMissions = () =>
  apiGet<MissionsResponse>("/api/missions");

export const createMission = (draft: { title: string; goal: string; steps: string[]; priority: number }) =>
  apiPost<MissionItem>("/api/missions", draft);
