import {
  AURORA_PANEL_REGISTRY,
  createDefaultPanelLayout,
  sortPanelLayout,
} from "@/lib/panelRegistry";
import type {
  AuroraDashboardViewId,
  AuroraPanelId,
  AuroraPanelLayoutItem,
} from "@/types/panels";

const LAYOUT_STORAGE_KEY = "orion_aurora_panel_layout_v4_7";
const ACTIVE_VIEW_STORAGE_KEY = "orion_aurora_active_view_v4_7";
const DEFAULT_VIEW: AuroraDashboardViewId = "full-mission-control";

const PANEL_IDS = new Set<AuroraPanelId>(
  AURORA_PANEL_REGISTRY.map((panel) => panel.id)
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Treat browser storage as untrusted input and reconcile it with the current
 * registry. Invalid, duplicate, and retired panel entries are discarded while
 * newly registered panels receive their defaults.
 */
export function normalizePanelLayout(value: unknown): AuroraPanelLayoutItem[] {
  const defaults = createDefaultPanelLayout();
  const defaultById = new Map(defaults.map((item) => [item.id, item]));
  const normalized = new Map<AuroraPanelId, AuroraPanelLayoutItem>();

  if (Array.isArray(value)) {
    for (const candidate of value) {
      if (!isRecord(candidate) || typeof candidate.id !== "string") continue;

      const id = candidate.id as AuroraPanelId;
      const fallback = defaultById.get(id);
      if (!PANEL_IDS.has(id) || !fallback || normalized.has(id)) continue;

      normalized.set(id, {
        id,
        visible:
          typeof candidate.visible === "boolean"
            ? candidate.visible
            : fallback.visible,
        pinned:
          typeof candidate.pinned === "boolean"
            ? candidate.pinned
            : fallback.pinned,
        order:
          typeof candidate.order === "number" && Number.isFinite(candidate.order)
            ? candidate.order
            : fallback.order,
      });
    }
  }

  for (const item of defaults) {
    if (!normalized.has(item.id)) normalized.set(item.id, item);
  }

  return sortPanelLayout([...normalized.values()]);
}

export function loadPanelLayoutFromStorage(): AuroraPanelLayoutItem[] {
  if (typeof window === "undefined") return createDefaultPanelLayout();

  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return createDefaultPanelLayout();
    return normalizePanelLayout(JSON.parse(raw) as unknown);
  } catch {
    return createDefaultPanelLayout();
  }
}

export function savePanelLayoutToStorage(layout: AuroraPanelLayoutItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    LAYOUT_STORAGE_KEY,
    JSON.stringify(normalizePanelLayout(layout))
  );
}

export function resetPanelLayoutStorage() {
  const layout = createDefaultPanelLayout();
  savePanelLayoutToStorage(layout);
  return layout;
}

export function loadActiveDashboardView(): AuroraDashboardViewId {
  if (typeof window === "undefined") return DEFAULT_VIEW;

  const value = window.localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY);
  return value === "security-view" ||
    value === "developer-view" ||
    value === "release-view" ||
    value === "minimal-view" ||
    value === DEFAULT_VIEW
    ? value
    : DEFAULT_VIEW;
}

export function saveActiveDashboardView(value: AuroraDashboardViewId) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, value);
  }
}
