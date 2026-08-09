import { apiGet } from "@/lib/api/client";
import type { MissionItem } from "@/components/aurora/aurora-types";

export type MissionsResponse = {
  missions: MissionItem[];
};

export const getMissions = () =>
  apiGet<MissionsResponse>("/api/missions");
