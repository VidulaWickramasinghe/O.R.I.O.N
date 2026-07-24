import { apiGet, apiPost } from "@/lib/api/client";
import type { PublicReleasePackage } from "@/types/orion";
export const generatePublicReleasePackage=()=>apiPost<PublicReleasePackage>("/api/public-release/package"); export const getPublicReleaseReport=()=>apiGet<PublicReleasePackage>("/api/public-release/report");
