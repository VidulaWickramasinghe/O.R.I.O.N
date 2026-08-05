import {apiGet,apiPost} from "@/lib/api/client";import type {PatchReleasePackage,PatchReleaseStatus} from "@/types/orion";
export const getPatchReleaseStatus=()=>apiGet<PatchReleaseStatus>("/api/patch-release/status");
export const startPatchRelease=()=>apiPost("/api/patch-release/start",{patch_version:"v6.5.1",patch_type:"maintenance",reason:"Post-release maintenance patch."});
export const completePatchRelease=()=>apiPost("/api/patch-release/complete",{reason:"Patch release workflow completed locally."});
export const savePatchReleaseReport=()=>apiPost<PatchReleaseStatus>("/api/patch-release/report/save");
export const generatePatchReleasePackage=()=>apiPost<PatchReleasePackage>("/api/patch-release/package");
