import { AURORA_PANEL_REGISTRY, createDefaultPanelLayout } from "@/lib/panelRegistry";
import type { AuroraPanelLayoutItem } from "@/types/panels";
const STORAGE_KEY = "orion_aurora_panel_layout_v4_6";
export function loadPanelLayoutFromStorage(): AuroraPanelLayoutItem[] { if (typeof window === "undefined") return createDefaultPanelLayout(); try { const raw = window.localStorage.getItem(STORAGE_KEY); if (!raw) return createDefaultPanelLayout(); const parsed = JSON.parse(raw) as AuroraPanelLayoutItem[]; const ids = new Set(parsed.map(({ id }) => id)); return [...parsed.filter((item) => AURORA_PANEL_REGISTRY.some((panel) => panel.id === item.id)), ...createDefaultPanelLayout().filter((item) => !ids.has(item.id))]; } catch { return createDefaultPanelLayout(); } }
export function savePanelLayoutToStorage(layout: AuroraPanelLayoutItem[]) { if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout)); }
export function resetPanelLayoutStorage() { const layout = createDefaultPanelLayout(); savePanelLayoutToStorage(layout); return layout; }
