import {apiGet,apiPost} from "@/lib/api/client";import type {StableReleasePackage,StableReleaseStatus} from "@/types/orion";
export const getStableReleaseStatus=()=>apiGet<StableReleaseStatus>("/api/stable-release/status");
export const lockStableRelease=(reason:string)=>apiPost("/api/stable-release/lock",{reason});
export const unlockStableRelease=(reason:string)=>apiPost("/api/stable-release/unlock",{reason});
export const saveStableReleaseReport=()=>apiPost<StableReleaseStatus>("/api/stable-release/report/save");
export const generateStableReleasePackage=()=>apiPost<StableReleasePackage>("/api/stable-release/package");
