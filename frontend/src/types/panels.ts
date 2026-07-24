export type AuroraPanelCategory = "core" | "security" | "release" | "desktop" | "memory" | "workflow" | "settings" | "diagnostics" | "developer";
export type AuroraPanelGroup = "mission-control" | "security" | "release" | "developer" | "desktop" | "productivity" | "settings";
export type AuroraDashboardViewId = "full-mission-control" | "security-view" | "developer-view" | "release-view" | "minimal-view";
export type AuroraPanelId = "dashboard-intelligence" | "dashboard-layout" | "dashboard-view-selector" | "release-candidate" | "stabilization" | "frontend-refactor" | "desktop-shell" | "backend-sidecar" | "plugin-system" | "security-policy" | "tool-permission" | "tool-audit" | "notification-engine" | "user-settings";
export type AuroraPanelDefinition = { id: AuroraPanelId; title: string; description: string; category: AuroraPanelCategory; group: AuroraPanelGroup; defaultVisible: boolean; defaultPinned: boolean; defaultOrder: number; version: string; };
export type AuroraPanelLayoutItem = { id: AuroraPanelId; visible: boolean; pinned: boolean; order: number; };
export type AuroraDashboardViewPreset = { id: AuroraDashboardViewId; name: string; description: string; icon: string; panelIds: AuroraPanelId[]; pinnedPanelIds: AuroraPanelId[]; };
