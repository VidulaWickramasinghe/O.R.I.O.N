import type { AuroraDashboardViewId } from "@/types/panels";
import type { WorkspaceViewPreference } from "@/types/workspaceViews";

const STORAGE_KEY = "orion_workspace_view_preferences_v4_7";
const VALID_VIEWS = new Set<AuroraDashboardViewId>([
  "full-mission-control",
  "security-view",
  "developer-view",
  "release-view",
  "minimal-view",
]);

function normalizePreference(value: unknown): WorkspaceViewPreference | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const item = value as Record<string, unknown>;
  if (
    typeof item.workspaceId !== "number" ||
    !Number.isSafeInteger(item.workspaceId) ||
    item.workspaceId <= 0 ||
    typeof item.workspaceName !== "string" ||
    !item.workspaceName.trim() ||
    typeof item.preferredDashboardView !== "string" ||
    !VALID_VIEWS.has(item.preferredDashboardView as AuroraDashboardViewId) ||
    typeof item.updatedAt !== "string" ||
    Number.isNaN(Date.parse(item.updatedAt))
  ) {
    return null;
  }

  return {
    workspaceId: item.workspaceId,
    workspaceName: item.workspaceName.trim().slice(0, 200),
    preferredDashboardView:
      item.preferredDashboardView as AuroraDashboardViewId,
    updatedAt: item.updatedAt,
  };
}

function loadPreferences(): WorkspaceViewPreference[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) || "[]"
    ) as unknown;
    if (!Array.isArray(parsed)) return [];

    const preferences = new Map<number, WorkspaceViewPreference>();
    for (const value of parsed) {
      const preference = normalizePreference(value);
      if (preference) preferences.set(preference.workspaceId, preference);
    }
    return [...preferences.values()];
  } catch {
    return [];
  }
}

function savePreferences(preferences: WorkspaceViewPreference[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }
}

export function getWorkspaceViewPreference(workspaceId: number) {
  return (
    loadPreferences().find((item) => item.workspaceId === workspaceId) || null
  );
}

export function setWorkspaceViewPreference(
  workspaceId: number,
  workspaceName: string,
  preferredDashboardView: AuroraDashboardViewId
) {
  if (!Number.isSafeInteger(workspaceId) || workspaceId <= 0) {
    throw new Error("workspaceId must be a positive integer.");
  }
  if (!workspaceName.trim()) throw new Error("workspaceName is required.");
  if (!VALID_VIEWS.has(preferredDashboardView)) {
    throw new Error("preferredDashboardView is invalid.");
  }

  const preferences = loadPreferences().filter(
    (item) => item.workspaceId !== workspaceId
  );
  preferences.push({
    workspaceId,
    workspaceName: workspaceName.trim().slice(0, 200),
    preferredDashboardView,
    updatedAt: new Date().toISOString(),
  });
  savePreferences(preferences);
}

export function listWorkspaceViewPreferences() {
  return loadPreferences();
}
