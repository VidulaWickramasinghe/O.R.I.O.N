import {apiGet,apiPost} from "@/lib/api/client";import type {FinalReleaseCandidateV2,ProductionReadinessResult} from "@/types/orion";
export const getProductionReadinessStatus=()=>apiGet<ProductionReadinessResult>("/api/production-readiness/status");
export const saveProductionReadinessReport=()=>apiPost<ProductionReadinessResult>("/api/production-readiness/report/save");
export const generateFinalReleaseCandidateV2=()=>apiPost<FinalReleaseCandidateV2>("/api/production-readiness/release-candidate-v2");
