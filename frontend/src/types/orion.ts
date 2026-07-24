export type DashboardIntelligence = {
  intelligence_score: number;
  readiness_label: string;
  mission_metrics: Record<string, unknown>;
  workspace_metrics: Record<string, unknown>;
  memory_metrics: Record<string, unknown>;
  risk_metrics: Record<string, unknown>;
  activity_metrics: Record<string, unknown>;
  developer_metrics: Record<string, unknown>;
  notification_metrics: Record<string, unknown>;
  user_settings?: Record<string, string>;
  plugin_metrics?: Record<string, unknown>;
  tool_permission_metrics?: Record<string, unknown>;
  tool_audit_metrics?: Record<string, unknown>;
  security_policy?: Record<string, string>;
  release_candidate?: Record<string, unknown>;
  stabilization?: Record<string, unknown>;
  recommendations: string[];
  report: string;
};

export type ReleaseFreezeState = {
  frozen: boolean;
  release_version: string;
  release_name: string;
  freeze_reason: string;
  frozen_at: string;
  unfrozen_at: string;
  updated_at: string;
};

export type ReleaseChecklistItem = { item: string; ok: boolean; details: string };

export type ReleaseCandidateStatus = {
  freeze_state: ReleaseFreezeState;
  checklist: { passed: number; failed: number; items: ReleaseChecklistItem[] };
  events: Array<{ id: number; event_type: string; title: string; message: string; artifact_path: string; created_at: string }>;
  report: string;
};

export type ReleaseCandidatePackage = {
  status: string;
  generated_at: string;
  summary_path: string;
  artifacts: Record<string, string>;
  checklist: Record<string, unknown>;
};

export type StabilizationResult = {
  status: string;
  generated_at: string;
  scan: Record<string, unknown>;
  report: string;
  path: string;
};

export type FrontendRefactorResult = {
  status: string;
  generated_at: string;
  scan: Record<string, unknown>;
  report: string;
  path: string;
};

export type PluginItem = {
  key: string; name: string; description: string; category: string; risk_level: string;
  permissions: string[]; enabled: boolean; built_in: boolean; created_at: string; updated_at: string;
};

export type ToolPermissionItem = {
  tool_name: string; plugin_key: string; plugin_name: string; enabled: boolean; risk_level: string;
  category: string; permissions: string[]; protected: boolean;
};

export type ToolAuditEventItem = {
  id: number; tool_name: string; plugin_key: string; decision: string; reason: string;
  risk_level: string; category: string; source: string; created_at: string;
};

export type SecurityProfileItem = {
  key: string; name: string; description: string; safety_level: string;
  enabled_plugin_count: number; disabled_plugin_count: number;
};

export type SecurityPolicyEventItem = {
  id: number; profile_key: string; profile_name: string; summary: string;
  enabled_count: number; disabled_count: number; source: string; created_at: string;
};

export type DesktopShellStatus = {
  status: string; app_name: string; shell_version: string; backend_url: string;
  frontend_mode: string; message: string;
};

export type BackendSidecarStatus = {
  managed_by: string; status: string; pid?: number | null; host: string; port: number;
  backend_url: string; started_at: string; updated_at: string; last_error: string;
  pid_running: boolean; port_open: boolean; log_file: string; state_file: string; report: string;
};

export type ReminderItem = {
  id: number; title: string; description: string; due_at: string; status: string;
  priority: string; source: string; created_at: string; updated_at: string;
};

export type NotificationEventItem = {
  id: number; event_type: string; title: string; message: string; source: string; created_at: string;
};

export type StartupBriefing = { status: string; briefing: string };

export type UserSettingItem = {
  key: string; value: string; description: string; updated_at: string; options: string[];
};

export type UserSettingsProfile = {
  settings: UserSettingItem[]; settings_map: Record<string, string>; profile_summary: string;
};

export type WorkspaceItem = {
  id: number; name: string; path: string; description: string; status: string;
  created_at: string; updated_at: string;
};

export type SystemStatus = {
  status: string;
  version: string;
  active_modules?: string[];
};

export type ActivityEvent = {
  id?: number;
  type?: string;
  event_type?: string;
  message: string;
  source: string;
  timestamp?: string;
  created_at?: string;
};
