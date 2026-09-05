export type AuroraView =
  | "dashboard"
  | "assistant"
  | "memory"
  | "projects"
  | "missions"
  | "workspaces"
  | "tools"
  | "browser"
  | "voice"
  | "security"
  | "system"
  | "demo"
  | "console";

export type Status = {
  name: string;
  version: string;
  mode: string;
  status: string;
  tagline: string;
  modules: string[];
};

export type ActivityEvent = {
  id: number;
  timestamp: string;
  type: string;
  source: string;
  message: string;
  correlation_id?: string;
  mission_id?: number | null;
  step_id?: number | null;
  approval_id?: number | null;
};

export type ProjectItem = {
  key: string;
  name: string;
  type: string;
  status: string;
  description: string;
  updated_at?: string | null;
};

export type WorkspaceItem = {
  id: number;
  name: string;
  path: string;
  description: string;
  status: string;
  trusted: boolean;
  source_consent: boolean;
  consent_source: string;
  consented_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type MemoryItem = {
  id: number;
  category: string;
  title: string;
  content: string;
  source: string;
  importance: number;
  created_at: string;
  updated_at: string;
  workspace_id?: number | null;
  project_key: string;
  sensitivity: "public" | "internal" | "sensitive";
  expires_at: string;
  excluded: boolean;
  exclusion_reason: string;
  provenance: Record<string, unknown>;
  retrieval_reason?: string;
};

export type MissionItem = {
  id: number;
  title: string;
  goal: string;
  status: string;
  priority: number;
  created_at: string;
  updated_at: string;
  state_version?: number;
  terminal_reason?: string;
};

export type MissionRunItem = {
  id: number;
  mission_id: number;
  step_id?: number | null;
  mission_title: string;
  step_title: string;
  status: string;
  output: string;
  error: string;
  started_at: string;
  completed_at: string;
  created_at: string;
};

export type ApprovalItem = {
  id: number;
  action_type: string;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  payload_hash?: string;
  idempotency_key?: string;
  mission_id?: number | null;
  step_id?: number | null;
  run_id?: number | null;
  session_id?: string;
  risk_level: string;
  status: string;
  result: string;
  source: string;
  execution_started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  execution?: Record<string, unknown> | null;
  continuation?: Record<string, unknown> | null;
};

export type VoiceStatus = {
  mode: string;
  wake_phrase: string;
  listening: boolean;
  last_transcript: string;
  last_response: string;
  last_event: string;
  updated_at: string;
};

export type SystemDoctorCheck = {
  name: string;
  ok: boolean;
  details: string;
  recommendation: string;
};

export type SystemDoctorResult = {
  status: string;
  passed: number;
  failed: number;
  checks: SystemDoctorCheck[];
  report: string;
};

export type DemoStatus = {
  demo_mode: boolean;
  release_version: string;
  project_name: string;
  interface_name: string;
  tagline: string;
  last_generated_pack: string;
  updated_at: string;
  readiness_report: string;
};

export type BrowserResearchResult = {
  status: string;
  title?: string | null;
  url?: string | null;
  content: string;
  artifact_path?: string | null;
};
export type DashboardWidgetId =
  | "hero"
  | "quickActions"
  | "models"
  | "recentActivity"
  | "metrics";

export type DashboardWidgetConfig = {
  id: DashboardWidgetId;
  label: string;
  enabled: boolean;
};
