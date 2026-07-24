import { apiPost } from "@/lib/api/client";
import type { QualityGateResult } from "@/types/orion";
export const runQualityGate=(runBuilds=false)=>apiPost<QualityGateResult>("/api/quality-gate/run",{run_builds:runBuilds}); export const saveQualityGateReport=()=>apiPost<QualityGateResult>("/api/quality-gate/report/save");
