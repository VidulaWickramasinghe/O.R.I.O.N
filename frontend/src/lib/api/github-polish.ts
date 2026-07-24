import { apiGet, apiPost } from "@/lib/api/client";
import type { GitHubPolishResult } from "@/types/orion";

export const getGitHubPolishStatus = () => apiGet<GitHubPolishResult>("/api/github-polish/status");
export const saveGitHubPolishArtifacts = () => apiPost<GitHubPolishResult>("/api/github-polish/artifacts/save");
