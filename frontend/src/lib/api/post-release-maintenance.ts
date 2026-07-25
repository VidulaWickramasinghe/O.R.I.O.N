import {apiGet,apiPost} from "@/lib/api/client";import type {KnownIssue,PatchPlan,PostReleaseMaintenanceResult} from "@/types/orion";
export const getPostReleaseMaintenanceStatus=()=>apiGet<PostReleaseMaintenanceResult>("/api/post-release-maintenance/status");
export const savePostReleaseMaintenanceReport=()=>apiPost<PostReleaseMaintenanceResult>("/api/post-release-maintenance/report/save");
export const getKnownIssues=()=>apiGet<{issues:KnownIssue[];updated_at:string}>("/api/post-release-maintenance/issues");
export const addKnownIssue=(title:string,body:string)=>apiPost<{issue:KnownIssue;patch_plan:PatchPlan}>("/api/post-release-maintenance/issues/add",{title,body,source:"manual"});
export const getPatchPlan=()=>apiGet<PatchPlan>("/api/post-release-maintenance/patch-plan");
