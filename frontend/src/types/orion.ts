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

export type QualityGateResult = { status: string; generated_at: string; backend_check: Record<string, unknown>; frontend_check: Record<string, unknown>; verification: Record<string, unknown>; report: string; path: string; };

export type PublicReleasePackage = { status: string; version: string; name: string; generated_at: string; artifact_count: number; artifacts: Record<string,string>; summary_path: string; safety: Record<string,unknown>; report: string; };

export type GitHubPolishCheck = { name: string; ok: boolean; details: string; };
export type GitHubPolishResult = { status: string; generated_at: string; passed: number; failed: number; checks: GitHubPolishCheck[]; github_description: string; github_topics: string[]; report: string; artifacts: Record<string, string>; };

export type PortfolioShowcaseResult = { status: string; generated_at: string; expected_count: number; existing_count: number; missing_count: number; screenshots: Record<string, unknown>[]; existing: string[]; missing: Record<string, unknown>[]; report: string; path: string; };

export type FinalLaunchCheck = { name: string; ok: boolean; details: string; };
export type FinalLaunchStatus = { status: string; generated_at: string; passed: number; failed: number; checks: FinalLaunchCheck[]; final_freeze: Record<string, unknown>; report: string; path: string; };
export type FinalLaunchPackage = { status: string; generated_at: string; release_version: string; release_name: string; passed: number; failed: number; report_path: string; summary_path: string; safety: Record<string, unknown>; };
export type GitHubLaunchCheck={name:string;ok:boolean;details:string}; export type GitHubLaunchResult={status:string;generated_at:string;passed:number;failed:number;checks:GitHubLaunchCheck[];description:string;topics:string[];badges:string;release_draft:string;safe_push_checklist:string;report:string;artifacts:Record<string,string>;templates:Record<string,string>;summary_path:string;safety:Record<string,unknown>};

export type ReadinessFile = { path: string; exists: boolean };
export type ResponsiveMarker = { marker: string; present: boolean };
export type PublicLandingResult = {
  status: string; generated_at: string; route: string; files: ReadinessFile[];
  missing: ReadinessFile[]; missing_count: number; route_exists: boolean;
  screenshot_dir_exists: boolean; screenshot_count: number; static_export_ready: boolean;
  safety: Record<string, unknown>; report: string; path: string;
};
export type UIPolishResult = {
  status: string; generated_at: string; files: ReadinessFile[]; missing: ReadinessFile[];
  missing_count: number; responsive_markers: ResponsiveMarker[];
  responsive_marker_count: number; mobile_ready: boolean;
  safety: Record<string, unknown>; report: string; path: string;
};
export type ProductionReadinessCheck={name:string;ok:boolean;details:string};
export type ProductionReadinessResult={status:string;generated_at:string;release_version:string;release_name:string;readiness_score:number;passed:number;failed:number;checks:ProductionReadinessCheck[];stabilization:Record<string,unknown>;frontend:Record<string,unknown>;release:Record<string,unknown>;launch:Record<string,unknown>;presentation:Record<string,unknown>;public_release:Record<string,unknown>;safety:Record<string,unknown>;report:string;path:string};
export type FinalReleaseCandidateV2={status:string;generated_at:string;release_version:string;release_name:string;readiness_score:number;passed:number;failed:number;report_path:string;summary_path:string;safety:Record<string,unknown>};
export type StableReleaseStatus={status:string;generated_at:string;release_version:string;release_name:string;passed:number;failed:number;checks:ProductionReadinessCheck[];version_lock:Record<string,unknown>;production:Record<string,unknown>;verification:Record<string,unknown>;github_launch:Record<string,unknown>;safety:Record<string,unknown>;report:string;path:string};
export type StableReleasePackage={status:string;generated_at:string;release_version:string;release_name:string;passed:number;failed:number;report_path:string;changelog_path:string;workflow_path:string;release_draft_path:string;summary_path:string;safety:Record<string,unknown>};
export type KnownIssue={id:string;title:string;body:string;source:string;status:string;category:string;priority:string;suggested_action:string;created_at:string;updated_at:string};
export type PatchPlan={status:string;generated_at:string;recommended_patch:string;open_count:number;critical_count:number;high_count:number;medium_count:number;low_count:number;open_issues:KnownIssue[];patch_steps:string[]};
export type PostReleaseMaintenanceResult={status:string;generated_at:string;release_version:string;release_name:string;passed:number;failed:number;checks:ProductionReadinessCheck[];version_lock:Record<string,unknown>;stable_release:Record<string,unknown>;production:Record<string,unknown>;patch_plan:PatchPlan;safety:Record<string,unknown>;report:string;path:string};
export type PatchReleaseStatus={status:string;generated_at:string;patch_state:Record<string,unknown>;patch_plan:PatchPlan;passed:number;failed:number;checks:ProductionReadinessCheck[];verification:Record<string,unknown>;stable_release:Record<string,unknown>;safety:Record<string,unknown>;report:string;path:string};
export type PatchReleasePackage={status:string;generated_at:string;patch_version:string;patch_type:string;passed:number;failed:number;report_path:string;notes_path:string;checklist_path:string;summary_path:string;safety:Record<string,unknown>};
export type FutureFeature={id:string;title:string;description:string;source:string;status:string;category:string;safety_level:string;effort:string;release_bucket:string;priority_score:number;governance_note:string;created_at:string;updated_at:string};
export type RoadmapPlan={status:string;generated_at:string;total_features:number;proposed_count:number;patch_count:number;minor_count:number;safety_review_count:number;future_count:number;high_safety_count:number;medium_safety_count:number;low_safety_count:number;next_recommended_release:string;features:FutureFeature[];release_buckets:Record<string,FutureFeature[]>};
export type RoadmapPlannerResult={status:string;generated_at:string;release_version:string;release_name:string;passed:number;failed:number;checks:ProductionReadinessCheck[];roadmap_plan:RoadmapPlan;version_lock:Record<string,unknown>;safety:Record<string,unknown>;report:string;path:string};
export type RoadmapPackage={status:string;generated_at:string;release_version:string;release_name:string;passed:number;failed:number;next_recommended_release:string;report_path:string;future_plan_path:string;summary_path:string;safety:Record<string,unknown>};
export type FeatureReview={id:string;feature_id:string;feature_title:string;reviewer:string;decision:string;recommended_decision:string;risk_score:number;risk_level:string;risk_factors:string[];required_controls:string[];notes:string;development_eligible:boolean;created_at:string;updated_at:string};
export type SafetyReviewBoardResult={status:string;generated_at:string;release_version:string;release_name:string;passed:number;failed:number;checks:ProductionReadinessCheck[];roadmap_plan:RoadmapPlan;reviews:FeatureReview[];pending_features:FutureFeature[];safety_review_features:FutureFeature[];approved_count:number;rejected_count:number;needs_changes_count:number;pending_count:number;safety_review_pending_count:number;safety:Record<string,unknown>;report:string;path:string};
export type SafetyReviewPackage={status:string;generated_at:string;release_version:string;release_name:string;passed:number;failed:number;approved_count:number;rejected_count:number;needs_changes_count:number;pending_count:number;safety_review_pending_count:number;report_path:string;approval_plan_path:string;summary_path:string;safety:Record<string,unknown>};
