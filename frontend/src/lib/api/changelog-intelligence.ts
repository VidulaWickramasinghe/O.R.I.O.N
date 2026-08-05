import { apiGet, apiPost } from "@/lib/api/client";
import type { ChangelogIntelligenceResult } from "@/types/orion";

export async function getChangelogIntelligenceStatus() {
  return apiGet<ChangelogIntelligenceResult>(
    "/api/changelog-intelligence/status"
  );
}

export async function saveChangelogIntelligenceArtifacts() {
  return apiPost<ChangelogIntelligenceResult>(
    "/api/changelog-intelligence/artifacts/save"
  );
}
