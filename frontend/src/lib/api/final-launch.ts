import { apiGet, apiPost } from "@/lib/api/client";
import type { FinalLaunchPackage, FinalLaunchStatus } from "@/types/orion";
export const getFinalLaunchStatus=()=>apiGet<FinalLaunchStatus>("/api/final-launch/status");
export const freezeFinalLaunch=(reason:string)=>apiPost<{status:string;freeze_state:Record<string,unknown>;report:string}>("/api/final-launch/freeze",{reason});
export const unfreezeFinalLaunch=(reason:string)=>apiPost<{status:string;freeze_state:Record<string,unknown>;report:string}>("/api/final-launch/unfreeze",{reason});
export const saveFinalLaunchReport=()=>apiPost<FinalLaunchStatus>("/api/final-launch/report/save");
export const generateFinalLaunchPackage=()=>apiPost<FinalLaunchPackage>("/api/final-launch/package");
