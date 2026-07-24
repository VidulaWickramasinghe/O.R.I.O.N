export type AuroraPanelCategory = "core" | "security" | "release" | "desktop" | "memory" | "workflow" | "settings" | "diagnostics";
export type AuroraPanelId = "dashboard-intelligence" | "dashboard-layout" | "release-candidate" | "stabilization" | "frontend-refactor" | "desktop-shell" | "backend-sidecar" | "plugin-system" | "security-policy" | "tool-permission" | "tool-audit" | "notification-engine" | "user-settings";
export type AuroraPanelDefinition = { id: AuroraPanelId; title: string; description: string; category: AuroraPanelCategory; defaultVisible: boolean; defaultPinned: boolean; defaultOrder: number; version: string; };
export type AuroraPanelLayoutItem = { id: AuroraPanelId; visible: boolean; pinned: boolean; order: number; };
