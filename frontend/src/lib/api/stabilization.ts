import { apiPost } from "@/lib/api/client";
import type { StabilizationResult } from "@/types/orion";
export const runStabilizationScan = (runBuild = false) => apiPost<StabilizationResult>("/api/stabilization/scan", { run_build: runBuild });
export const saveStabilizationReport = (runBuild = false) => apiPost<StabilizationResult>("/api/stabilization/report/save", { run_build: runBuild });
