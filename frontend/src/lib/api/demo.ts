import { apiGet, apiPost } from "@/lib/api/client";
import type { DemoStatus } from "@/components/aurora/aurora-types";

export const getDemoStatus = () => apiGet<DemoStatus>("/api/demo/status");
export const setDemoMode = (enabled: boolean) =>
  apiPost<DemoStatus>("/api/demo/mode", { enabled });
export const generateDemoReleasePack = () =>
  apiPost<{ files: string[] }>("/api/demo/release-pack");
