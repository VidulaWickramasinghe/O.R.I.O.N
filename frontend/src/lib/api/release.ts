import { apiGet, apiPost } from "@/lib/api/client";
import type { ReleaseCandidatePackage, ReleaseCandidateStatus, ReleaseFreezeState } from "@/types/orion";
export const getReleaseCandidateStatus = () => apiGet<ReleaseCandidateStatus>("/api/release-candidate/status");
export const freezeReleaseCandidate = (reason: string) => apiPost<ReleaseFreezeState>("/api/release-candidate/freeze", { reason });
export const unfreezeReleaseCandidate = (reason: string) => apiPost<ReleaseFreezeState>("/api/release-candidate/unfreeze", { reason });
export const generateReleaseCandidatePackage = () => apiPost<ReleaseCandidatePackage>("/api/release-candidate/package");
