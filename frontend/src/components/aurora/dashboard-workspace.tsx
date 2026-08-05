"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bot,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Code2,
  Cpu,
  Database,
  Gauge,
  HardDrive,
  LayoutDashboard,
  MemoryStick,
  Network,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Rocket,
  Search,
  Server,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  SquareTerminal,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { useAuroraStore } from "@/store/auroraStore";

import { dashboardModels, dashboardTimeline } from "@/lib/aurora-data";
import { agents } from "@/lib/agent-data";
import { projects } from "@/lib/project-data";
import { createDeveloperPatchPlan, diagnoseDeveloperWorkspace, getDeveloperReports, inspectDeveloperWorkspace } from "@/lib/api/developer";
import { getKnowledgeDocuments, indexKnowledgeFolder, searchKnowledge } from "@/lib/api/knowledge";
import { getVectorItems, rebuildVectorIndex, searchVector } from "@/lib/api/vector";
import { getWorkspaces } from "@/lib/api/workspaces";
import { createWorkflowMission, getWorkflowBlueprint, getWorkflowBlueprints } from "@/lib/api/workflows";
import { FrontendRefactorPanel } from "@/components/aurora/panels/FrontendRefactorPanel";
import { DashboardLayoutPanel } from "@/components/aurora/panels/DashboardLayoutPanel";
import { DashboardViewSelectorPanel } from "@/components/aurora/panels/DashboardViewSelectorPanel";
import { OfflineBanner } from "@/components/aurora/resilience/OfflineBanner";
import { PanelErrorBoundary } from "@/components/aurora/resilience/PanelErrorBoundary";
import { getPanelDefinition } from "@/lib/panelRegistry";
import type { AuroraPanelId } from "@/types/panels";
import { RecordingModeOverlay } from "@/components/aurora/resilience/RecordingModeOverlay";
import { PresenterControlsPanel } from "@/components/aurora/panels/PresenterControlsPanel";
import { DemoCalloutOverlay } from "@/components/aurora/resilience/DemoCalloutOverlay";
import { GuidedWalkthroughPanel } from "@/components/aurora/panels/GuidedWalkthroughPanel";
import { BackendSidecarPanel } from "@/components/aurora/panels/BackendSidecarPanel";
import { DesktopShellPanel } from "@/components/aurora/panels/DesktopShellPanel";
import { NotificationEnginePanel } from "@/components/aurora/panels/NotificationEnginePanel";
import { PluginSystemPanel } from "@/components/aurora/panels/PluginSystemPanel";
import { SecurityPolicyPanel } from "@/components/aurora/panels/SecurityPolicyPanel";
import { ToolAuditPanel } from "@/components/aurora/panels/ToolAuditPanel";
import { ToolPermissionPanel } from "@/components/aurora/panels/ToolPermissionPanel";
import { UserSettingsPanel } from "@/components/aurora/panels/UserSettingsPanel";
import { AnalyticsOverview } from "./analytics-overview";
import { GlassPanel } from "./glass-panel";
import { StatusChip } from "./status-chip";

import type { WorkspaceItem } from "@/types/orion";
import { DashboardIntelligencePanel } from "@/components/aurora/panels/DashboardIntelligencePanel";
import { ReleaseCandidatePanel } from "@/components/aurora/panels/ReleaseCandidatePanel";
import { StabilizationPanel } from "@/components/aurora/panels/StabilizationPanel";
import { StableReleasePanel } from "@/components/aurora/panels/StableReleasePanel";
import { PostReleaseMaintenancePanel } from "@/components/aurora/panels/PostReleaseMaintenancePanel";
import { PatchReleasePanel } from "@/components/aurora/panels/PatchReleasePanel";
import { RoadmapPlannerPanel } from "@/components/aurora/panels/RoadmapPlannerPanel";
import { SafetyReviewBoardPanel } from "@/components/aurora/panels/SafetyReviewBoardPanel";
import { ProductionReadinessPanel } from "@/components/aurora/panels/ProductionReadinessPanel";
import { PublicLandingPanel } from "@/components/aurora/panels/PublicLandingPanel";
import { UIPolishPanel } from "@/components/aurora/panels/UIPolishPanel";

function restoreDashboardPreferences() {
  const store = useAuroraStore.getState();
  void store.loadPanelLayout();
  store.loadDemoWalkthroughStateFromStore();
  store.loadRecordingModeStateFromStore();
  void store.loadActiveDashboardView();
}

type KnowledgeDocumentItem = {
  id: number;
  title: string;
  source_path: string;
  extension: string;
  size_bytes: number;
  summary: string;
  indexed_at: string;
  updated_at: string;
};

type KnowledgeSearchItem = {
  chunk_id: number;
  document_id: number;
  chunk_index: number;
  content: string;
  title: string;
  source_path: string;
  extension: string;
};

type VectorItem = {
  id: number;
  source_type: string;
  source_id: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type SemanticSearchItem = {
  id: number;
  source_type: string;
  source_id: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  score: number;
  created_at: string;
  updated_at: string;
};

type WorkflowBlueprintItem = {
  key: string;
  name: string;
  description: string;
  priority: number;
  step_count: number;
};

type WorkflowBlueprintDetail = {
  key: string;
  name: string;
  description: string;
  priority: number;
  steps: string[];
  rendered: string;
};

type DeveloperReportItem = {
  id: number;
  workspace_id: number;
  report_type: string;
  title: string;
  content: string;
  artifact_path: string;
  created_at: string;
};

type DeveloperInspectResult = {
  workspace_id: number;
  status: string;
  content: string;
};



export function DashboardWorkspace() {
  const loadDemoWalkthroughStateFromStore = useAuroraStore(
    (state) => state.loadDemoWalkthroughStateFromStore,
  );
  const loadRecordingModeStateFromStore = useAuroraStore(
    (state) => state.loadRecordingModeStateFromStore,
  );
  const [widgets, setWidgets] = useState([
    "Hero",
    "Metrics",
    "Analytics",
    "Quick Actions",
    "Models",
    "Timeline",
    "Dashboard Intelligence",
    "Notification Engine",
    "Security Policy",
    "Desktop Shell",
    "Backend Sidecar",
    "Guided Walkthrough",
    "Presenter Controls",
    "Production Readiness",
    "Stable Public Release",
    "Post-Release Maintenance",
    "Patch Release",
    "Roadmap Planner",
    "Safety Review Board",
    "Public Landing Page",
    "UI Polish",
  ]);
  const [dashboardMode, setDashboardMode] = useState<"overview" | "operations" | "developer">("overview");
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [activityPaused, setActivityPaused] = useState(false);
  const [compactMetrics, setCompactMetrics] = useState(false);
  const [displayDate, setDisplayDate] = useState("");
  const [knowledgeDocuments, setKnowledgeDocuments] = useState<KnowledgeDocumentItem[]>([]);
  const [knowledgePath, setKnowledgePath] = useState("");
  const [knowledgeQuery, setKnowledgeQuery] = useState("");
  const [knowledgeResults, setKnowledgeResults] = useState<KnowledgeSearchItem[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeMessage, setKnowledgeMessage] = useState("");
  const [vectorItems, setVectorItems] = useState<VectorItem[]>([]);
  const [semanticQuery, setSemanticQuery] = useState("");
  const [semanticResults, setSemanticResults] = useState<SemanticSearchItem[]>([]);
  const [vectorLoading, setVectorLoading] = useState(false);
  const [vectorMessage, setVectorMessage] = useState("");
  const [workflowBlueprints, setWorkflowBlueprints] = useState<WorkflowBlueprintItem[]>([]);
  const [selectedWorkflowBlueprint, setSelectedWorkflowBlueprint] =
    useState<WorkflowBlueprintDetail | null>(null);
  const [workflowLoadingKey, setWorkflowLoadingKey] = useState<string | null>(null);
  const [workflowMessage, setWorkflowMessage] = useState("");
  const [workflowWorkspaceId, setWorkflowWorkspaceId] = useState("1");
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [developerReports, setDeveloperReports] = useState<DeveloperReportItem[]>([]);
  const [developerResult, setDeveloperResult] = useState<DeveloperInspectResult | null>(null);
  const [developerIssue, setDeveloperIssue] = useState("");
  const [developerLoadingAction, setDeveloperLoadingAction] = useState<string | null>(null);
  const [developerMessage, setDeveloperMessage] = useState("");
  const {
    dashboardIntelligence, dashboardIntelligenceLoading, plugins, pluginMetrics,
    pluginRegistryReport, pluginLoadingKey, toolPermissionMatrix, toolPermissionMetrics,
    toolPermissionReport, toolAuditEvents, toolAuditMetrics, toolAuditReport,
    securityProfiles, securityPolicyEvents, securityPolicyActive, securityPolicyReport,
    securityPolicyLoadingKey, releaseCandidateStatus, releaseCandidatePackage,
    releaseCandidateLoading, stabilizationResult, stabilizationLoading,
    frontendRefactorResult, frontendRefactorLoading,
    publicLandingResult, publicLandingLoading, uiPolishResult, uiPolishLoading,
    productionReadinessResult, finalReleaseCandidateV2, productionReadinessLoading,
    stableReleaseStatus, stableReleasePackage, stableReleaseLoading,
    postReleaseMaintenanceResult, knownIssues, patchPlan, postReleaseMaintenanceLoading,
    patchReleaseStatus, patchReleasePackage, patchReleaseLoading,
    roadmapPlannerResult, futureFeatures, roadmapPackage, roadmapPlannerLoading,
    safetyReviewBoardResult, featureReviews, safetyReviewPackage, safetyReviewBoardLoading,
    desktopShellStatus,
    desktopShellLoading, backendSidecarStatus, backendSidecarLoading, reminders,
    notificationEvents, startupBriefing, reminderTitle, reminderDueAt, reminderLoading,
    userSettingsProfile, settingsLoadingKey, setReminderTitle, setReminderDueAt,
    loadDashboardIntelligence, loadDesktopShellStatus,
    loadBackendSidecarStatus, loadStartupBriefing, updatePluginStatusFromStore,
    applySecurityProfileFromStore, freezeReleaseCandidateFromStore,
    unfreezeReleaseCandidateFromStore, generateReleaseCandidatePackageFromStore,
    runStabilizationScanFromStore, saveStabilizationReportFromStore,
    runFrontendRefactorScanFromStore, saveFrontendRefactorReportFromStore,
    loadPublicLandingStatusFromStore, savePublicLandingReportFromStore,
    loadUIPolishStatusFromStore, saveUIPolishReportFromStore,
    loadProductionReadinessStatusFromStore, saveProductionReadinessReportFromStore, generateFinalReleaseCandidateV2FromStore,
    loadStableReleaseStatusFromStore, lockStableReleaseFromStore, unlockStableReleaseFromStore, saveStableReleaseReportFromStore, generateStableReleasePackageFromStore,
    loadPostReleaseMaintenanceStatusFromStore, savePostReleaseMaintenanceReportFromStore, loadKnownIssuesFromStore, addKnownIssueFromStore,
    loadPatchReleaseStatusFromStore, startPatchReleaseFromStore, completePatchReleaseFromStore, savePatchReleaseReportFromStore, generatePatchReleasePackageFromStore,
    loadRoadmapPlannerStatusFromStore, saveRoadmapPlannerReportFromStore, loadFutureFeaturesFromStore, addFutureFeatureFromStore, generateRoadmapPackageFromStore,
    loadSafetyReviewBoardStatusFromStore, saveSafetyReviewBoardReportFromStore, loadFeatureReviewsFromStore, createFeatureReviewFromStore, generateSafetyReviewPackageFromStore,
    runBackendSidecarActionFromStore, createReminderFromStore,
    updateReminderStatusFromStore, updateUserSettingFromStore, resetUserSettingsFromStore,
    recordingModeState, startRecordingModeFromStore, stopRecordingModeFromStore, setRecordingSceneFromStore, toggleRecordingLargeCalloutFromStore, toggleRecordingHideNoisyPanelsFromStore, toggleRecordingTimerFromStore, toggleRecordingChecklistFromStore, resetRecordingModeFromStore,
    demoWalkthroughState, startDemoWalkthroughFromStore, stopDemoWalkthroughFromStore, nextDemoWalkthroughStepFromStore, previousDemoWalkthroughStepFromStore, resetDemoWalkthroughFromStore,
    panelLayout, togglePanelVisibility, togglePanelPinned, movePanelUp, movePanelDown, resetPanelLayout, activeDashboardView, applyDashboardViewPreset, backendOnline, backendLastCheckedAt, backendLastError, checkBackendHealth,
  } = useAuroraStore();
  const dashboardIntelligenceMessage = "";
  const notificationMessage = "";
  const settingsMessage = "";
  const pluginMessage = "";
  const backendSidecarMessage = "";
  const securityPolicyMessage = "";
  const releaseCandidateMessage = "";
  const stabilizationMessage = "";

  const panelVisible = (id: string) => panelLayout.length === 0 || panelLayout.some((item) => item.id === id && item.visible);

  function toggle(item: string) {
    setWidgets((current) =>
      current.includes(item)
        ? current.filter((widget) => widget !== item)
        : [...current, item]
    );
  }

  async function loadKnowledgeDocuments() { try { const data = await getKnowledgeDocuments(); setKnowledgeDocuments((data.documents || []) as KnowledgeDocumentItem[]); } catch { setKnowledgeDocuments([]); } }

  async function indexKnowledgeFolderFromUI() { const cleanPath = knowledgePath.trim(); if (!cleanPath || knowledgeLoading) return; setKnowledgeLoading(true); setKnowledgeMessage(""); try { const data = await indexKnowledgeFolder(cleanPath); setKnowledgeMessage(`Knowledge indexing status: ${data.status}. ${data.message}`); await loadKnowledgeDocuments(); } catch { setKnowledgeMessage("Knowledge folder indexing failed. Confirm backend is running."); } finally { setKnowledgeLoading(false); } }

  async function searchKnowledgeFromUI() { const cleanQuery = knowledgeQuery.trim(); if (!cleanQuery || knowledgeLoading) return; setKnowledgeLoading(true); setKnowledgeMessage(""); try { const data = await searchKnowledge(cleanQuery); setKnowledgeResults((data.results || []) as KnowledgeSearchItem[]); } catch { setKnowledgeResults([]); setKnowledgeMessage("Knowledge search failed. Confirm backend is running."); } finally { setKnowledgeLoading(false); } }



  async function loadVectorItems() { try { const data = await getVectorItems(); setVectorItems((data.items || []) as VectorItem[]); } catch { setVectorItems([]); } }

  async function rebuildVectorIndexFromUI() { setVectorLoading(true); setVectorMessage(""); try { const data = await rebuildVectorIndex(); setVectorMessage(`Vector index rebuild status: ${data.status}`); await loadVectorItems(); } catch { setVectorMessage("Vector index rebuild failed. Confirm backend is running and OPENAI_API_KEY is set."); } finally { setVectorLoading(false); } }

  async function runSemanticSearchFromUI() { const cleanQuery = semanticQuery.trim(); if (!cleanQuery || vectorLoading) return; setVectorLoading(true); setVectorMessage(""); try { const data = await searchVector(cleanQuery); setSemanticResults((data.results || []) as SemanticSearchItem[]); } catch { setSemanticResults([]); setVectorMessage("Semantic search failed. Confirm backend is running and OPENAI_API_KEY is set."); } finally { setVectorLoading(false); } }

  async function loadWorkflowBlueprints() { try { const data = await getWorkflowBlueprints(); setWorkflowBlueprints((data.blueprints || []) as WorkflowBlueprintItem[]); } catch { setWorkflowBlueprints([]); } }

  async function openWorkflowBlueprint(blueprintKey: string) { setWorkflowLoadingKey(blueprintKey); setWorkflowMessage(""); try { setSelectedWorkflowBlueprint((await getWorkflowBlueprint(blueprintKey)) as WorkflowBlueprintDetail); } catch { setSelectedWorkflowBlueprint(null); setWorkflowMessage("Workflow blueprint failed to load. Confirm backend is running."); } finally { setWorkflowLoadingKey(null); } }

  async function createMissionFromBlueprintUI(blueprintKey: string) { setWorkflowLoadingKey(blueprintKey); setWorkflowMessage(""); try { const parsed = Number.parseInt(workflowWorkspaceId, 10); const workspaceId = Number.isFinite(parsed) && parsed > 0 ? parsed : null; const data = await createWorkflowMission(blueprintKey, workspaceId); setWorkflowMessage(data.status === "created" ? `Workflow mission created: Mission ${data.mission_id} · ${data.title} · ${data.step_count} steps` : `Workflow mission creation failed: ${data.message}`); } catch { setWorkflowMessage("Workflow mission creation failed. Confirm backend is running."); } finally { setWorkflowLoadingKey(null); } }

  async function loadWorkspaces() { try { const data = await getWorkspaces(); setWorkspaces(data.workspaces || []); } catch { setWorkspaces([]); } }

  async function loadDeveloperReports() { try { const data = await getDeveloperReports(); setDeveloperReports((data.reports || []) as DeveloperReportItem[]); } catch { setDeveloperReports([]); } }

  async function runDeveloperInspect(workspaceId: number) { setDeveloperLoadingAction(`inspect-${workspaceId}`); setDeveloperMessage(""); try { setDeveloperResult((await inspectDeveloperWorkspace(workspaceId)) as DeveloperInspectResult); setDeveloperMessage(`Developer inspection generated for workspace ${workspaceId}.`); await loadDeveloperReports(); } catch { setDeveloperMessage("Developer inspection failed. Confirm backend is running."); } finally { setDeveloperLoadingAction(null); } }

  async function runDeveloperDiagnosis(workspaceId: number) { const cleanIssue = developerIssue.trim(); if (!cleanIssue) { setDeveloperMessage("Add an issue description before running developer diagnosis."); return; } setDeveloperLoadingAction(`diagnose-${workspaceId}`); setDeveloperMessage(""); try { setDeveloperResult((await diagnoseDeveloperWorkspace(workspaceId, cleanIssue)) as DeveloperInspectResult); setDeveloperMessage(`Developer diagnosis generated for workspace ${workspaceId}.`); await loadDeveloperReports(); } catch { setDeveloperMessage("Developer diagnosis failed. Confirm backend is running."); } finally { setDeveloperLoadingAction(null); } }

  async function runDeveloperPatchPlan(workspaceId: number) { const cleanIssue = developerIssue.trim(); if (!cleanIssue) { setDeveloperMessage("Add an issue or objective before creating a patch plan."); return; } setDeveloperLoadingAction(`patch-plan-${workspaceId}`); setDeveloperMessage(""); try { setDeveloperResult((await createDeveloperPatchPlan(workspaceId, cleanIssue)) as DeveloperInspectResult); setDeveloperMessage(`Patch plan generated for workspace ${workspaceId}.`); await loadDeveloperReports(); } catch { setDeveloperMessage("Patch plan generation failed. Confirm backend is running."); } finally { setDeveloperLoadingAction(null); } }



  useEffect(() => {
    setDisplayDate(new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" }));
  }, []);

  useEffect(() => {
    void loadKnowledgeDocuments(); void loadVectorItems(); void loadWorkflowBlueprints();
    void loadWorkspaces(); void loadDeveloperReports();
    const store = useAuroraStore.getState();
    void store.loadPanelLayout();
    loadDemoWalkthroughStateFromStore();
    loadRecordingModeStateFromStore();
    void store.loadActiveDashboardView();
    void useAuroraStore.getState().refreshAll();
    const timer = window.setInterval(() => {
      void loadKnowledgeDocuments(); void loadVectorItems(); void loadWorkflowBlueprints();
      void loadWorkspaces(); void loadDeveloperReports();
      void useAuroraStore.getState().refreshAll();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [loadDemoWalkthroughStateFromStore, loadRecordingModeStateFromStore]);

  function metricValue(
    source: Record<string, unknown> | undefined,
    key: string,
    fallback = "0"
  ) {
    const value = source?.[key];
    if (value === undefined || value === null) return fallback;
    return String(value);
  }

  const widgetGroups = [
    { title: "Overview", items: ["Hero", "Metrics", "Analytics", "Quick Actions", "Models", "Timeline"] },
    { title: "Intelligence", items: ["Dashboard Intelligence", "Knowledge Base", "Semantic Memory", "Workflow Blueprints"] },
    { title: "Development", items: ["Developer Mode", "Frontend Refactor", "Stabilization Manager", "Release Candidate"] },
    { title: "Operations", items: ["Notification Engine", "Plugin System", "Security Policy", "Desktop Shell", "Backend Sidecar", "Tool Permission Enforcement", "Tool Audit Center"] },
    { title: "Presentation", items: ["Dashboard Views", "Dashboard Layout", "Guided Walkthrough", "Presenter Controls", "User Settings"] },
  ];

  const applyMode = (mode: "overview" | "operations" | "developer") => {
    setDashboardMode(mode);
    if (mode === "overview") {
      setWidgets(["Hero", "Metrics", "Analytics", "Quick Actions", "Models", "Timeline", "Dashboard Intelligence", "Notification Engine", "Security Policy", "Desktop Shell", "Backend Sidecar", "Guided Walkthrough", "Presenter Controls"]);
    } else if (mode === "operations") {
      setWidgets(["Hero", "Metrics", "Analytics", "Timeline", "Dashboard Intelligence", "Notification Engine", "Plugin System", "Security Policy", "Desktop Shell", "Backend Sidecar", "Tool Permission Enforcement", "Tool Audit Center", "Release Candidate", "Stabilization Manager"]);
    } else {
      setWidgets(["Hero", "Metrics", "Analytics", "Quick Actions", "Models", "Developer Mode", "Knowledge Base", "Semantic Memory", "Workflow Blueprints", "Frontend Refactor", "Stabilization Manager", "Backend Sidecar", "Tool Audit Center"]);
    }
  };

  const refreshDashboard = () => {
    void loadKnowledgeDocuments();
    void loadVectorItems();
    void loadWorkflowBlueprints();
    void loadWorkspaces();
    void loadDeveloperReports();
    void useAuroraStore.getState().refreshAll();
  };

  const activeAgents = agents.filter((agent) => agent.status === "Running").length;
  const intelligenceScore = dashboardIntelligence ? Number(dashboardIntelligence.intelligence_score) : 92;

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            <span>Mission control</span><ChevronRight size={12} /><span className="text-cyan-300/80">Command overview</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Good evening, Wichel.</h1>
          <p className="mt-2 text-sm text-slate-500">{displayDate || "Loading date"} · O.R.I.O.N. is ready to think, plan and act.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-2xl border border-white/[0.07] bg-white/[0.025] p-1">
            {([
              ["overview", "Overview"],
              ["operations", "Operations"],
              ["developer", "Developer"],
            ] as const).map(([value, label]) => (
              <button key={value} onClick={() => applyMode(value)} className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${dashboardMode === value ? "bg-white/[0.09] text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}>{label}</button>
            ))}
          </div>
          <button onClick={refreshDashboard} className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"><RefreshCw size={14} /> Refresh</button>
          <button onClick={() => setCustomizerOpen(true)} className="flex items-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-2.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/[0.11]"><SlidersHorizontal size={14} /> Customise</button>
        </div>
      </div>

      {customizerOpen && (
        <div className="fixed inset-0 z-[80] flex justify-end bg-black/65 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Customise dashboard">
          <button className="absolute inset-0" aria-label="Close customiser" onClick={() => setCustomizerOpen(false)} />
          <aside className="orion-scrollbar relative h-full w-full max-w-[430px] overflow-y-auto border-l border-white/[0.08] bg-[#090c13]/98 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300/70">Workspace controls</p><h2 className="mt-2 text-xl font-semibold text-white">Customise dashboard</h2><p className="mt-2 text-sm leading-6 text-slate-500">Choose the panels visible in your command centre. Your API-backed tools remain unchanged.</p></div>
              <button onClick={() => setCustomizerOpen(false)} className="rounded-xl border border-white/[0.08] p-2 text-slate-500 hover:bg-white/[0.05] hover:text-white"><X size={16} /></button>
            </div>
            <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              <div><p className="text-sm font-semibold text-white">Compact metrics</p><p className="mt-1 text-xs text-slate-500">Reduce summary-card height</p></div>
              <button onClick={() => setCompactMetrics(!compactMetrics)} className={`relative h-6 w-11 rounded-full transition ${compactMetrics ? "bg-cyan-300" : "bg-white/10"}`} aria-pressed={compactMetrics}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${compactMetrics ? "left-6" : "left-1"}`} /></button>
            </div>
            <div className="mt-5 space-y-5">
              {widgetGroups.map((group) => (
                <section key={group.title}>
                  <div className="mb-2 flex items-center justify-between"><h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-600">{group.title}</h3><span className="text-[10px] text-slate-700">{group.items.filter((item) => widgets.includes(item)).length}/{group.items.length}</span></div>
                  <div className="space-y-2">
                    {group.items.map((item) => {
                      const enabled = widgets.includes(item);
                      return <button key={item} onClick={() => toggle(item)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${enabled ? "border-cyan-300/15 bg-cyan-300/[0.05]" : "border-white/[0.06] bg-white/[0.018] hover:bg-white/[0.035]"}`}><span className={`flex h-8 w-8 items-center justify-center rounded-xl ${enabled ? "bg-cyan-300/[0.1] text-cyan-200" : "bg-white/[0.04] text-slate-600"}`}>{enabled ? <CheckCircle2 size={15} /> : <Plus size={15} />}</span><span className={`flex-1 text-sm font-medium ${enabled ? "text-slate-200" : "text-slate-500"}`}>{item}</span><span className={`text-[10px] ${enabled ? "text-cyan-300" : "text-slate-700"}`}>{enabled ? "Visible" : "Hidden"}</span></button>;
                    })}
                  </div>
                </section>
              ))}
            </div>
            <div className="sticky bottom-0 mt-6 border-t border-white/[0.07] bg-[#090c13]/95 pt-4 backdrop-blur-xl"><button onClick={() => setCustomizerOpen(false)} className="w-full rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-200">Apply workspace</button></div>
          </aside>
        </div>
      )}

      <OfflineBanner online={backendOnline} lastCheckedAt={backendLastCheckedAt} lastError={backendLastError} onRetry={checkBackendHealth} />

      {widgets.includes("Hero") && (
        <section className="orion-panel overflow-hidden">
          <div className="grid min-h-[390px] xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.55fr)]">
            <div className="orion-command-visual relative flex min-h-[390px] flex-col justify-between border-b border-white/[0.07] p-5 sm:p-7 xl:border-b-0 xl:border-r">
              <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
                <div><div className="flex items-center gap-2"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" /></span><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-200/80">Neural core online</p></div><h2 className="mt-3 text-xl font-semibold text-white sm:text-2xl">System intelligence is operating normally</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Live orchestration across agents, memory, tools, permissions and active workspaces.</p></div>
                <StatusChip tone={backendOnline ? "success" : "warning"}>{backendOnline ? "Backend connected" : "Demo / offline mode"}</StatusChip>
              </div>

              <div className="relative z-10 flex flex-1 items-center justify-center py-8">
                <div className="relative flex h-[230px] w-[230px] items-center justify-center">
                  <span className="orion-radar-ring" />
                  <span className="orion-radar-ring" style={{ animationDelay: "1.6s" }} />
                  <div className="orion-core flex items-center justify-center"><Sparkles size={26} className="text-white/80" /></div>
                  <div className="absolute -left-7 top-10 rounded-xl border border-white/[0.08] bg-[#090d15]/85 px-3 py-2 backdrop-blur-xl"><p className="text-[9px] uppercase tracking-[0.16em] text-slate-600">Reasoning</p><p className="mt-1 text-xs font-semibold text-cyan-100">Stable</p></div>
                  <div className="absolute -right-9 bottom-12 rounded-xl border border-white/[0.08] bg-[#090d15]/85 px-3 py-2 backdrop-blur-xl"><p className="text-[9px] uppercase tracking-[0.16em] text-slate-600">Latency</p><p className="mt-1 text-xs font-semibold text-violet-100">184 ms</p></div>
                </div>
              </div>

              <div className="relative z-10 grid gap-3 sm:grid-cols-3">
                <HeroStat label="Active missions" value="03" detail="2 executing · 1 waiting" icon={<Rocket size={15} />} />
                <HeroStat label="Safety gates" value="100%" detail="All policies enforced" icon={<ShieldCheck size={15} />} />
                <HeroStat label="Runtime health" value="99.8%" detail="Last 24 hours" icon={<Activity size={15} />} />
              </div>
            </div>

            <div className="flex flex-col bg-black/10 p-5 sm:p-6">
              <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">Live orchestration</p><h3 className="mt-2 text-base font-semibold text-white">Mission pulse</h3></div><button onClick={() => setActivityPaused(!activityPaused)} className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-2.5 py-2 text-[10px] font-semibold text-slate-400 hover:text-white">{activityPaused ? <Play size={12} /> : <Pause size={12} />}{activityPaused ? "Resume" : "Pause"}</button></div>
              <div className="mt-5 flex-1 space-y-4">
                {(activityPaused ? ["Stream paused — no new events", "Memory context retained", "Approval queue preserved", "Tool sessions remain connected"] : ["Planner generated execution strategy", "Memory vault returned 8 relevant items", "Security policy approved browser tool", "Frontend agent validating dashboard build"]).map((item, index) => (
                  <div key={item} className="flex gap-3"><div className="relative pt-1.5"><span className={`block h-2 w-2 rounded-full ${index === 0 && !activityPaused ? "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,.65)]" : "bg-slate-600"}`} />{index < 3 && <span className="absolute left-[3.5px] top-4 h-[34px] w-px bg-white/[0.07]" />}</div><div className="min-w-0 flex-1"><p className="text-xs leading-5 text-slate-300">{item}</p><div className="mt-1 flex items-center gap-2 text-[10px] text-slate-600"><Clock3 size={10} /><span>{index === 0 ? "now" : `${index * 2 + 1}m ago`}</span></div></div></div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                <div className="flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">Execution throughput</p><p className="mt-2 text-2xl font-semibold text-white">1,482 <span className="text-xs font-normal text-slate-500">tasks</span></p></div><span className="flex items-center gap-1 text-xs font-semibold text-emerald-300"><ArrowUpRight size={13} />12.8%</span></div>
                <svg viewBox="0 0 300 72" className="mt-2 h-[72px] w-full" role="img" aria-label="Execution throughput trend increasing"><defs><linearGradient id="orionArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#67e8f9" stopOpacity=".25"/><stop offset="100%" stopColor="#67e8f9" stopOpacity="0"/></linearGradient></defs><path d="M0,58 C22,55 27,45 47,48 C70,51 78,35 99,39 C123,44 130,27 151,31 C174,35 184,19 205,24 C228,29 242,13 264,17 C278,19 289,9 300,11 L300,72 L0,72 Z" fill="url(#orionArea)"/><path className="orion-pulse-line" d="M0,58 C22,55 27,45 47,48 C70,51 78,35 99,39 C123,44 130,27 151,31 C174,35 184,19 205,24 C228,29 242,13 264,17 C278,19 289,9 300,11" fill="none" stroke="#67e8f9" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
            </div>
          </div>
        </section>
      )}

      {widgets.includes("Metrics") && (
        <section>
          <div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">System overview</h2><p className="mt-1 text-xs text-slate-600">Live operational metrics across the O.R.I.O.N. stack</p></div><span className="hidden items-center gap-1.5 text-[10px] text-slate-600 sm:flex"><Radio size={11} className="text-emerald-300" /> Updating every 5 seconds</span></div>
          <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-4 ${compactMetrics ? "2xl:grid-cols-8" : "2xl:grid-cols-4"}`}>
            <DashboardMetric label="Intelligence score" value={String(intelligenceScore)} detail="Excellent" trend="+4.2%" icon={<Gauge size={17} />} compact={compactMetrics} />
            <DashboardMetric label="Running agents" value={String(activeAgents)} detail={`${agents.length} registered`} trend="Live" icon={<Bot size={17} />} compact={compactMetrics} />
            <DashboardMetric label="Memory vectors" value={String(vectorItems.length || 1248)} detail={`${knowledgeDocuments.length} documents`} trend="+86" icon={<MemoryStick size={17} />} compact={compactMetrics} />
            <DashboardMetric label="Active projects" value={String(projects.length)} detail="Across 3 workspaces" trend="Stable" icon={<LayoutDashboard size={17} />} compact={compactMetrics} />
            <DashboardMetric label="Plugin registry" value={String(plugins.length || 12)} detail="All verified" trend="100%" icon={<Cpu size={17} />} compact={compactMetrics} />
            <DashboardMetric label="Dev reports" value={String(developerReports.length)} detail="Latest scan clean" trend="+2" icon={<Code2 size={17} />} compact={compactMetrics} />
            <DashboardMetric label="Reminders" value={String(reminders.length)} detail="2 due today" trend="Review" icon={<Clock3 size={17} />} compact={compactMetrics} />
            <DashboardMetric label="Backend sidecar" value={backendSidecarStatus?.status || (backendOnline ? "Ready" : "Offline")} detail={desktopShellStatus?.status || "Desktop linked"} trend={backendOnline ? "Nominal" : "Check"} icon={<Server size={17} />} compact={compactMetrics} />
          </div>
        </section>
      )}

      {widgets.includes("Analytics") && <AnalyticsOverview />}

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]">
        <div className="space-y-5">
          {widgets.includes("Quick Actions") && (
            <section className="orion-panel p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">Action launcher</p><h2 className="mt-2 text-base font-semibold text-white">Start from command centre</h2></div><button onClick={() => setCustomizerOpen(true)} className="flex items-center gap-2 text-xs font-semibold text-cyan-200 hover:text-cyan-100"><Settings2 size={13} /> Configure</button></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <QuickAction href="/assistant" title="Open assistant" detail="Start a contextual conversation" icon={<Sparkles size={18} />} tone="cyan" />
                <QuickAction href="/missions" title="Create mission" detail="Plan an approval-gated workflow" icon={<Rocket size={18} />} tone="violet" />
                <QuickAction href="/agents" title="Deploy agent" detail="Assign a specialised runtime" icon={<Bot size={18} />} tone="green" />
                <QuickAction href="/memory" title="Search memory" detail="Retrieve project context" icon={<Search size={18} />} tone="blue" />
                <QuickAction href="/workflows" title="Run workflow" detail={`${workflowBlueprints.length || 6} blueprints available`} icon={<Workflow size={18} />} tone="amber" />
                <QuickAction href="/console" title="Open console" detail="Inspect logs and commands" icon={<SquareTerminal size={18} />} tone="slate" />
              </div>
            </section>
          )}

          {widgets.includes("Timeline") && (
            <section className="orion-panel p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">Execution fabric</p><h2 className="mt-2 text-base font-semibold text-white">Mission lifecycle</h2></div><span className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-1.5 text-[10px] font-semibold text-emerald-200">Approval gates enforced</span></div>
              <div className="mt-6 overflow-x-auto pb-2"><div className="flex min-w-[720px] items-center">{dashboardTimeline.map((step, index) => <div key={step} className="flex flex-1 items-center last:flex-none"><div className="group flex min-w-[78px] flex-col items-center"><span className={`flex h-10 w-10 items-center justify-center rounded-2xl border text-xs font-bold ${index < 4 ? "border-cyan-300/20 bg-cyan-300/[0.075] text-cyan-100" : index === 4 ? "border-violet-300/25 bg-violet-300/[0.08] text-violet-100" : "border-white/[0.08] bg-white/[0.025] text-slate-600"}`}>{index < 4 ? <CheckCircle2 size={16} /> : index + 1}</span><span className={`mt-2 text-[10px] font-semibold ${index <= 4 ? "text-slate-300" : "text-slate-600"}`}>{step}</span></div>{index < dashboardTimeline.length - 1 && <div className={`mb-5 h-px flex-1 ${index < 4 ? "bg-gradient-to-r from-cyan-300/50 to-cyan-300/15" : "bg-white/[0.07]"}`} />}</div>)}</div></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3"><MiniStatus icon={<Brain size={15} />} title="Context matched" detail="8 memories loaded" /><MiniStatus icon={<ShieldCheck size={15} />} title="Policy evaluated" detail="Low-risk operation" /><MiniStatus icon={<Zap size={15} />} title="Next action" detail="Execute browser tool" /></div>
            </section>
          )}

          {widgets.includes("Models") && (
            <section className="orion-panel p-5 sm:p-6">
              <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">Model mesh</p><h2 className="mt-2 text-base font-semibold text-white">Connected intelligence</h2></div><span className="text-[10px] text-slate-600">Smart routing enabled</span></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{dashboardModels.map((model, index) => <div key={model} className="orion-panel-soft p-4"><div className="flex items-start justify-between"><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${index === 0 ? "bg-cyan-300/[0.09] text-cyan-200" : index === 1 ? "bg-violet-300/[0.09] text-violet-200" : index === 2 ? "bg-blue-300/[0.09] text-blue-200" : "bg-emerald-300/[0.09] text-emerald-200"}`}><Cpu size={17} /></div><span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,.55)]" /></div><p className="mt-4 text-sm font-semibold text-white">{model}</p><p className="mt-1 text-[10px] text-slate-600">{index === 0 ? "Primary reasoning" : index === 1 ? "Deep analysis" : index === 2 ? "Multimodal" : "Private fallback"}</p><div className="mt-4 flex items-center justify-between text-[10px]"><span className="text-slate-600">Latency</span><span className="font-mono text-slate-400">{[184, 241, 198, 86][index]}ms</span></div></div>)}</div>
            </section>
          )}
        </div>

        <div className="space-y-5">
          <section className="orion-panel p-5 sm:p-6">
            <div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">Infrastructure</p><h2 className="mt-2 text-base font-semibold text-white">System health</h2></div><span className="flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-2.5 py-1 text-[10px] font-semibold text-emerald-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Nominal</span></div>
            <div className="mt-5 space-y-4"><HealthBar label="API gateway" value={backendOnline ? 99 : 18} detail={backendOnline ? "Operational" : "Connection unavailable"} icon={<Network size={14} />} /><HealthBar label="Memory service" value={94} detail="1,248 vectors indexed" icon={<Database size={14} />} /><HealthBar label="Agent runtime" value={88} detail={`${activeAgents} agents executing`} icon={<Bot size={14} />} /><HealthBar label="Storage" value={67} detail="82.4 GB available" icon={<HardDrive size={14} />} /></div>
            <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-xs font-semibold text-slate-400 hover:bg-white/[0.045] hover:text-white">Open system diagnostics <ArrowUpRight size={13} /></button>
          </section>

          <section className="orion-panel p-5 sm:p-6">
            <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">Operational queue</p><h2 className="mt-2 text-base font-semibold text-white">Needs attention</h2></div><span className="rounded-full bg-amber-300/[0.08] px-2.5 py-1 text-[10px] font-semibold text-amber-200">3 items</span></div>
            <div className="mt-4 space-y-2"><AttentionItem tone="amber" title="Mission approval required" detail="Browser research · high-impact action" time="2m" /><AttentionItem tone="violet" title="Release candidate ready" detail="Package can be frozen for validation" time="12m" /><AttentionItem tone="cyan" title="Knowledge index updated" detail="86 new semantic vectors available" time="18m" /></div>
          </section>
        </div>
      </div>

      <section className="pt-2">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">Advanced workspace</p><h2 className="mt-2 text-lg font-semibold text-white">Operational modules</h2><p className="mt-1 text-sm text-slate-600">API-backed controls and specialist panels selected for the current dashboard mode.</p></div><button onClick={() => setCustomizerOpen(true)} className="flex items-center gap-2 rounded-xl border border-white/[0.07] px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-white/[0.04] hover:text-white"><SlidersHorizontal size={13} /> Manage modules</button></div>
        <div className="grid gap-5 2xl:grid-cols-2">
          <div className="space-y-5">
            {widgets.includes("Dashboard Intelligence") && panelVisible("dashboard-intelligence") && <SafePanel panelId="dashboard-intelligence"><DashboardIntelligencePanel intelligence={dashboardIntelligence} loading={dashboardIntelligenceLoading} message={dashboardIntelligenceMessage} onRefresh={loadDashboardIntelligence} /></SafePanel>}
            {widgets.includes("Knowledge Base") && <KnowledgeBasePanel documents={knowledgeDocuments} path={knowledgePath} query={knowledgeQuery} results={knowledgeResults} loading={knowledgeLoading} message={knowledgeMessage} setPath={setKnowledgePath} setQuery={setKnowledgeQuery} indexFolder={indexKnowledgeFolderFromUI} searchKnowledge={searchKnowledgeFromUI} />}
            {widgets.includes("Semantic Memory") && <SemanticMemoryPanel vectorItems={vectorItems} semanticQuery={semanticQuery} semanticResults={semanticResults} loading={vectorLoading} message={vectorMessage} setSemanticQuery={setSemanticQuery} rebuildVectorIndex={rebuildVectorIndexFromUI} runSemanticSearch={runSemanticSearchFromUI} />}
            {widgets.includes("Workflow Blueprints") && <WorkflowBlueprintsPanel blueprints={workflowBlueprints} selectedBlueprint={selectedWorkflowBlueprint} loadingKey={workflowLoadingKey} message={workflowMessage} workspaceId={workflowWorkspaceId} setWorkspaceId={setWorkflowWorkspaceId} inspectBlueprint={openWorkflowBlueprint} createMission={createMissionFromBlueprintUI} />}
            {widgets.includes("Developer Mode") && <AgenticDeveloperModePanel workspaces={workspaces} developerIssue={developerIssue} developerReports={developerReports} developerResult={developerResult} loadingAction={developerLoadingAction} message={developerMessage} setDeveloperIssue={setDeveloperIssue} inspectWorkspace={runDeveloperInspect} diagnoseWorkspace={runDeveloperDiagnosis} createPatchPlan={runDeveloperPatchPlan} />}
            {widgets.includes("Frontend Refactor") && panelVisible("frontend-refactor") && <SafePanel panelId="frontend-refactor"><FrontendRefactorPanel result={frontendRefactorResult} loading={frontendRefactorLoading} onScan={runFrontendRefactorScanFromStore} onSaveReport={saveFrontendRefactorReportFromStore} /></SafePanel>}
            {widgets.includes("Stabilization Manager") && panelVisible("stabilization") && <SafePanel panelId="stabilization"><StabilizationPanel result={stabilizationResult} loading={stabilizationLoading} message={stabilizationMessage} runAction={(action, runBuild) => action === "scan" ? runStabilizationScanFromStore(runBuild) : saveStabilizationReportFromStore(runBuild)} /></SafePanel>}
            {widgets.includes("Release Candidate") && panelVisible("release-candidate") && <SafePanel panelId="release-candidate"><ReleaseCandidatePanel status={releaseCandidateStatus} latestPackage={releaseCandidatePackage} loading={releaseCandidateLoading} message={releaseCandidateMessage} runAction={(action) => action === "freeze" ? freezeReleaseCandidateFromStore() : action === "unfreeze" ? unfreezeReleaseCandidateFromStore() : generateReleaseCandidatePackageFromStore()} /></SafePanel>}
            {widgets.includes("Production Readiness") && panelVisible("production-readiness") && <SafePanel panelId="production-readiness"><ProductionReadinessPanel result={productionReadinessResult} candidate={finalReleaseCandidateV2} loading={productionReadinessLoading} onCheck={loadProductionReadinessStatusFromStore} onSave={saveProductionReadinessReportFromStore} onGenerate={generateFinalReleaseCandidateV2FromStore} /></SafePanel>}
            {widgets.includes("Stable Public Release") && panelVisible("stable-release") && <SafePanel panelId="stable-release"><StableReleasePanel status={stableReleaseStatus} pkg={stableReleasePackage} loading={stableReleaseLoading} onCheck={loadStableReleaseStatusFromStore} onLock={lockStableReleaseFromStore} onUnlock={unlockStableReleaseFromStore} onSave={saveStableReleaseReportFromStore} onPackage={generateStableReleasePackageFromStore} /></SafePanel>}
            {widgets.includes("Post-Release Maintenance") && panelVisible("post-release-maintenance") && <SafePanel panelId="post-release-maintenance"><PostReleaseMaintenancePanel result={postReleaseMaintenanceResult} issues={knownIssues} plan={patchPlan} loading={postReleaseMaintenanceLoading} onCheck={loadPostReleaseMaintenanceStatusFromStore} onSave={savePostReleaseMaintenanceReportFromStore} onLoad={loadKnownIssuesFromStore} onAdd={addKnownIssueFromStore} onPlan={loadPostReleaseMaintenanceStatusFromStore} /></SafePanel>}
            {widgets.includes("Patch Release") && panelVisible("patch-release") && <SafePanel panelId="patch-release"><PatchReleasePanel status={patchReleaseStatus} pkg={patchReleasePackage} loading={patchReleaseLoading} onCheck={loadPatchReleaseStatusFromStore} onStart={startPatchReleaseFromStore} onComplete={completePatchReleaseFromStore} onSave={savePatchReleaseReportFromStore} onPackage={generatePatchReleasePackageFromStore} /></SafePanel>}
            {widgets.includes("Roadmap Planner") && panelVisible("roadmap-planner") && <SafePanel panelId="roadmap-planner"><RoadmapPlannerPanel result={roadmapPlannerResult} features={futureFeatures} pkg={roadmapPackage} loading={roadmapPlannerLoading} onCheck={loadRoadmapPlannerStatusFromStore} onSave={saveRoadmapPlannerReportFromStore} onLoad={loadFutureFeaturesFromStore} onAdd={addFutureFeatureFromStore} onPackage={generateRoadmapPackageFromStore} /></SafePanel>}
            {widgets.includes("Safety Review Board") && panelVisible("safety-review-board") && <SafePanel panelId="safety-review-board"><SafetyReviewBoardPanel result={safetyReviewBoardResult} reviews={featureReviews} pkg={safetyReviewPackage} loading={safetyReviewBoardLoading} onCheck={loadSafetyReviewBoardStatusFromStore} onSave={saveSafetyReviewBoardReportFromStore} onLoad={loadFeatureReviewsFromStore} onReview={createFeatureReviewFromStore} onPackage={generateSafetyReviewPackageFromStore} /></SafePanel>}
          </div>
          <div className="space-y-5">
            {widgets.includes("Dashboard Views") && panelVisible("dashboard-view-selector") && <SafePanel panelId="dashboard-view-selector"><DashboardViewSelectorPanel activeDashboardView={activeDashboardView} onApplyView={applyDashboardViewPreset} /></SafePanel>}
            {widgets.includes("Dashboard Layout") && <SafePanel panelId="dashboard-layout"><DashboardLayoutPanel panelLayout={panelLayout} onToggleVisible={togglePanelVisibility} onTogglePinned={togglePanelPinned} onMoveUp={movePanelUp} onMoveDown={movePanelDown} onReset={resetPanelLayout} /></SafePanel>}
            {widgets.includes("Guided Walkthrough") && panelVisible("guided-walkthrough") && <SafePanel panelId="guided-walkthrough"><GuidedWalkthroughPanel demoWalkthroughState={demoWalkthroughState} onStart={startDemoWalkthroughFromStore} onStop={stopDemoWalkthroughFromStore} onNext={nextDemoWalkthroughStepFromStore} onPrevious={previousDemoWalkthroughStepFromStore} onReset={resetDemoWalkthroughFromStore} /></SafePanel>}
            {widgets.includes("Presenter Controls") && panelVisible("presenter-controls") && <SafePanel panelId="presenter-controls"><PresenterControlsPanel recordingModeState={recordingModeState} onStart={startRecordingModeFromStore} onStop={stopRecordingModeFromStore} onSceneChange={setRecordingSceneFromStore} onToggleLargeCallout={toggleRecordingLargeCalloutFromStore} onToggleHideNoisyPanels={toggleRecordingHideNoisyPanelsFromStore} onToggleTimer={toggleRecordingTimerFromStore} onToggleChecklist={toggleRecordingChecklistFromStore} onReset={resetRecordingModeFromStore} /></SafePanel>}
            {widgets.includes("Notification Engine") && panelVisible("notification-engine") && <SafePanel panelId="notification-engine"><NotificationEnginePanel reminders={reminders} events={notificationEvents} startupBriefing={startupBriefing} reminderTitle={reminderTitle} reminderDueAt={reminderDueAt} loading={reminderLoading} message={notificationMessage} setReminderTitle={setReminderTitle} setReminderDueAt={setReminderDueAt} createReminder={createReminderFromStore} updateReminderStatus={updateReminderStatusFromStore} generateStartupBriefing={() => loadStartupBriefing()} /></SafePanel>}
            {widgets.includes("User Settings") && panelVisible("user-settings") && <SafePanel panelId="user-settings"><UserSettingsPanel profile={userSettingsProfile} loadingKey={settingsLoadingKey} message={settingsMessage} setProfile={(updater) => { const current = useAuroraStore.getState().userSettingsProfile; const next = updater(current); if (next) useAuroraStore.setState({ userSettingsProfile: next }); }} updateSetting={updateUserSettingFromStore} resetSettings={resetUserSettingsFromStore} /></SafePanel>}
            {widgets.includes("Plugin System") && panelVisible("plugin-system") && <SafePanel panelId="plugin-system"><PluginSystemPanel plugins={plugins} metrics={pluginMetrics} report={pluginRegistryReport} loadingKey={pluginLoadingKey} message={pluginMessage} metricValue={metricValue} updatePluginStatus={updatePluginStatusFromStore} /></SafePanel>}
            {widgets.includes("Security Policy") && panelVisible("security-policy") && <SafePanel panelId="security-policy"><SecurityPolicyPanel activePolicy={securityPolicyActive} profiles={securityProfiles} events={securityPolicyEvents} report={securityPolicyReport} loadingKey={securityPolicyLoadingKey} message={securityPolicyMessage} applyProfile={applySecurityProfileFromStore} /></SafePanel>}
            {widgets.includes("Desktop Shell") && panelVisible("desktop-shell") && <SafePanel panelId="desktop-shell"><DesktopShellPanel status={desktopShellStatus} loading={desktopShellLoading} refreshStatus={loadDesktopShellStatus} /></SafePanel>}
            {widgets.includes("Backend Sidecar") && panelVisible("backend-sidecar") && <SafePanel panelId="backend-sidecar"><BackendSidecarPanel status={backendSidecarStatus} loading={backendSidecarLoading} message={backendSidecarMessage} refreshStatus={loadBackendSidecarStatus} runAction={runBackendSidecarActionFromStore} /></SafePanel>}
            {widgets.includes("Tool Permission Enforcement") && panelVisible("tool-permission") && <SafePanel panelId="tool-permission"><ToolPermissionPanel matrix={toolPermissionMatrix} metrics={toolPermissionMetrics} report={toolPermissionReport} metricValue={metricValue} /></SafePanel>}
            {widgets.includes("Tool Audit Center") && panelVisible("tool-audit") && <SafePanel panelId="tool-audit"><ToolAuditPanel events={toolAuditEvents} metrics={toolAuditMetrics} report={toolAuditReport} metricValue={metricValue} /></SafePanel>}
            {widgets.includes("Public Landing Page") && panelVisible("public-landing") && <SafePanel panelId="public-landing"><PublicLandingPanel result={publicLandingResult} loading={publicLandingLoading} onCheck={loadPublicLandingStatusFromStore} onSave={savePublicLandingReportFromStore} /></SafePanel>}
            {widgets.includes("UI Polish") && panelVisible("ui-polish") && <SafePanel panelId="ui-polish"><UIPolishPanel result={uiPolishResult} loading={uiPolishLoading} onCheck={loadUIPolishStatusFromStore} onSave={saveUIPolishReportFromStore} /></SafePanel>}
          </div>
        </div>
      </section>

      <RecordingModeOverlay recordingModeState={recordingModeState} />
      <DemoCalloutOverlay demoWalkthroughState={demoWalkthroughState} onNext={nextDemoWalkthroughStepFromStore} onStop={stopDemoWalkthroughFromStore} />
    </div>
  );
}








type DashboardVisualProps = {
  icon: React.ReactNode;
  title: string;
  detail: string;
};

function HeroStat({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.075] bg-black/25 p-3.5 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600"><span className="text-cyan-300/80">{icon}</span>{label}</div>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      <p className="mt-1 text-[10px] text-slate-600">{detail}</p>
    </div>
  );
}

function DashboardMetric({ label, value, detail, trend, icon, compact }: { label: string; value: string; detail: string; trend: string; icon: React.ReactNode; compact: boolean }) {
  return (
    <div className={`orion-metric-card ${compact ? "p-3" : "p-4"}`}>
      <div className="relative z-10 flex items-start justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-cyan-200">{icon}</span>
        <span className={`rounded-full border px-2 py-1 text-[9px] font-semibold ${trend === "Check" || trend === "Review" ? "border-amber-300/15 bg-amber-300/[0.06] text-amber-200" : "border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-200"}`}>{trend}</span>
      </div>
      <p className={`relative z-10 font-semibold tracking-tight text-white ${compact ? "mt-3 text-xl" : "mt-5 text-2xl"}`}>{value}</p>
      <p className="relative z-10 mt-1 text-xs font-medium text-slate-300">{label}</p>
      {!compact && <p className="relative z-10 mt-1 text-[10px] text-slate-600">{detail}</p>}
    </div>
  );
}

function QuickAction({ href, title, detail, icon, tone }: DashboardVisualProps & { href: string; tone: "cyan" | "violet" | "green" | "blue" | "amber" | "slate" }) {
  const tones = {
    cyan: "bg-cyan-300/[0.08] text-cyan-200 group-hover:bg-cyan-300/[0.12]",
    violet: "bg-violet-300/[0.08] text-violet-200 group-hover:bg-violet-300/[0.12]",
    green: "bg-emerald-300/[0.08] text-emerald-200 group-hover:bg-emerald-300/[0.12]",
    blue: "bg-blue-300/[0.08] text-blue-200 group-hover:bg-blue-300/[0.12]",
    amber: "bg-amber-300/[0.08] text-amber-200 group-hover:bg-amber-300/[0.12]",
    slate: "bg-white/[0.05] text-slate-300 group-hover:bg-white/[0.08]",
  };
  return (
    <a href={href} className="group flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.018] p-3.5 transition hover:-translate-y-0.5 hover:border-white/[0.13] hover:bg-white/[0.035]">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${tones[tone]}`}>{icon}</span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-200 group-hover:text-white">{title}</span><span className="mt-1 block truncate text-[10px] text-slate-600">{detail}</span></span>
      <ArrowUpRight size={14} className="text-slate-700 transition group-hover:text-slate-400" />
    </a>
  );
}

function MiniStatus({ icon, title, detail }: DashboardVisualProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.065] bg-white/[0.02] p-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-300/[0.07] text-cyan-200">{icon}</span>
      <span className="min-w-0"><span className="block truncate text-xs font-semibold text-slate-300">{title}</span><span className="mt-1 block truncate text-[10px] text-slate-600">{detail}</span></span>
    </div>
  );
}

function HealthBar({ label, value, detail, icon }: { label: string; value: number; detail: string; icon: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2"><span className="text-slate-500">{icon}</span><span className="flex-1 text-xs font-medium text-slate-300">{label}</span><span className={`text-[10px] font-semibold ${value > 80 ? "text-emerald-300" : value > 50 ? "text-amber-300" : "text-rose-300"}`}>{value}%</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.055]"><div className={`h-full rounded-full ${value > 80 ? "bg-gradient-to-r from-emerald-400 to-cyan-300" : value > 50 ? "bg-gradient-to-r from-amber-400 to-orange-300" : "bg-gradient-to-r from-rose-400 to-amber-300"}`} style={{ width: `${value}%` }} /></div>
      <p className="mt-1.5 text-[10px] text-slate-600">{detail}</p>
    </div>
  );
}

function AttentionItem({ tone, title, detail, time }: { tone: "amber" | "violet" | "cyan"; title: string; detail: string; time: string }) {
  const toneClass = tone === "amber" ? "bg-amber-300 text-amber-300" : tone === "violet" ? "bg-violet-300 text-violet-300" : "bg-cyan-300 text-cyan-300";
  return (
    <button className="group flex w-full items-center gap-3 rounded-2xl border border-transparent p-3 text-left transition hover:border-white/[0.07] hover:bg-white/[0.025]">
      <span className={`h-2 w-2 shrink-0 rounded-full shadow-[0_0_8px_currentColor] ${toneClass}`} />
      <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-300 group-hover:text-white">{title}</span><span className="mt-1 block truncate text-[10px] text-slate-600">{detail}</span></span>
      <span className="text-[10px] text-slate-700">{time}</span>
      <ChevronRight size={12} className="text-slate-700" />
    </button>
  );
}

function AgenticDeveloperModePanel({
  workspaces,
  developerIssue,
  developerReports,
  developerResult,
  loadingAction,
  message,
  setDeveloperIssue,
  inspectWorkspace,
  diagnoseWorkspace,
  createPatchPlan,
}: {
  workspaces: WorkspaceItem[];
  developerIssue: string;
  developerReports: DeveloperReportItem[];
  developerResult: DeveloperInspectResult | null;
  loadingAction: string | null;
  message: string;
  setDeveloperIssue: (value: string) => void;
  inspectWorkspace: (workspaceId: number) => void;
  diagnoseWorkspace: (workspaceId: number) => void;
  createPatchPlan: (workspaceId: number) => void;
}) {
  return (
    <GlassPanel className="border-cyan-400/20 bg-white/[0.06] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Agentic Developer Mode</h2>
          <p className="text-sm text-slate-400">
            Workspace inspection, diagnosis, patch planning, and approval-gated edits
          </p>
        </div>
        <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
          v4.6
        </span>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        <textarea
          value={developerIssue}
          onChange={(event) => setDeveloperIssue(event.target.value)}
          placeholder="Describe a bug, error, UI issue, backend issue, or development objective..."
          className="min-h-28 w-full rounded-2xl border border-cyan-400/20 bg-black/40 px-4 py-3 text-sm text-slate-100 outline-none ring-cyan-400/30 placeholder:text-slate-500 focus:ring-2"
        />

        {message && (
          <p className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
            {message}
          </p>
        )}

        {workspaces.length === 0 ? (
          <p className="text-sm text-slate-500">Register a workspace first to use Developer Mode.</p>
        ) : (
          <div className="space-y-3">
            {workspaces.map((workspace) => (
              <div key={workspace.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-100">{workspace.name}</h3>
                  <span className="text-[10px] text-slate-500">ID {workspace.id}</span>
                </div>
                <p className="break-all text-xs text-slate-500">{workspace.path}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => inspectWorkspace(workspace.id)}
                    disabled={loadingAction === `inspect-${workspace.id}`}
                    className="rounded-xl border border-cyan-400/30 px-3 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/10 disabled:opacity-60"
                  >
                    Inspect
                  </button>
                  <button
                    onClick={() => diagnoseWorkspace(workspace.id)}
                    disabled={loadingAction === `diagnose-${workspace.id}`}
                    className="rounded-xl border border-violet-400/30 px-3 py-2 text-xs font-bold text-violet-200 transition hover:bg-violet-500/10 disabled:opacity-60"
                  >
                    Diagnose
                  </button>
                  <button
                    onClick={() => createPatchPlan(workspace.id)}
                    disabled={loadingAction === `patch-plan-${workspace.id}`}
                    className="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
                  >
                    Patch Plan
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {developerResult && (
          <div className="max-h-96 overflow-y-auto rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
              Latest Developer Output
            </p>
            <pre className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-300">
              {developerResult.content}
            </pre>
          </div>
        )}

        <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Developer Reports
          </p>
          {developerReports.length === 0 ? (
            <p className="text-sm text-slate-500">No developer reports yet.</p>
          ) : (
            developerReports.slice(0, 8).map((report) => (
              <div key={report.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-100">{report.title}</p>
                  <span className="text-[10px] text-slate-500">#{report.id}</span>
                </div>
                <p className="mt-1 text-xs text-cyan-300">{report.report_type}</p>
                <p className="mt-1 break-all text-xs text-slate-500">{report.artifact_path}</p>
              </div>
            ))
          )}
        </div>

        <p className="text-xs leading-5 text-slate-500">
          Safety: Developer Mode creates diagnosis and patch plans first. File edits require Command Approval.
        </p>
      </div>
    </GlassPanel>
  );
}

function WorkflowBlueprintsPanel({
  blueprints,
  selectedBlueprint,
  loadingKey,
  message,
  workspaceId,
  setWorkspaceId,
  inspectBlueprint,
  createMission,
}: {
  blueprints: WorkflowBlueprintItem[];
  selectedBlueprint: WorkflowBlueprintDetail | null;
  loadingKey: string | null;
  message: string;
  workspaceId: string;
  setWorkspaceId: (value: string) => void;
  inspectBlueprint: (blueprintKey: string) => void;
  createMission: (blueprintKey: string) => void;
}) {
  return (
    <GlassPanel className="border-cyan-400/20 bg-white/[0.06] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Workflow Blueprints</h2>
          <p className="text-sm text-slate-400">
            Reusable mission templates for releases, bugs, research, and demos
          </p>
        </div>
        <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
          {blueprints.length} blueprints
        </span>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4">
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Workspace ID
          </span>
          <input
            value={workspaceId}
            onChange={(event) => setWorkspaceId(event.target.value)}
            placeholder="1"
            className="mt-2 w-full rounded-2xl border border-cyan-400/20 bg-black/40 px-4 py-3 text-sm text-slate-100 outline-none ring-cyan-400/30 placeholder:text-slate-500 focus:ring-2"
          />
        </label>

        {message && (
          <p className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
            {message}
          </p>
        )}

        {blueprints.length === 0 ? (
          <p className="text-sm text-slate-500">No workflow blueprints loaded yet.</p>
        ) : (
          blueprints.map((blueprint) => (
            <div key={blueprint.key} className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-100">{blueprint.name}</h3>
                <span className="text-[10px] text-slate-500">{blueprint.step_count} steps</span>
              </div>

              <p className="text-xs text-cyan-300">
                {blueprint.key} | Priority {blueprint.priority}
              </p>

              <p className="mt-2 text-sm leading-5 text-slate-400">{blueprint.description}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => inspectBlueprint(blueprint.key)}
                  disabled={loadingKey === blueprint.key}
                  className="rounded-xl border border-cyan-400/30 px-3 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/10 disabled:opacity-60"
                >
                  Inspect
                </button>

                <button
                  onClick={() => createMission(blueprint.key)}
                  disabled={loadingKey === blueprint.key}
                  className="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
                >
                  Create Mission
                </button>
              </div>
            </div>
          ))
        )}

        {selectedBlueprint && (
          <div className="max-h-80 overflow-y-auto rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
              Selected Blueprint
            </p>
            <h3 className="mt-2 text-sm font-semibold text-slate-100">
              {selectedBlueprint.name}
            </h3>
            <pre className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-300">
              {selectedBlueprint.rendered}
            </pre>
          </div>
        )}
      </div>
    </GlassPanel>
  );
}

function SemanticMemoryPanel({
  vectorItems,
  semanticQuery,
  semanticResults,
  loading,
  message,
  setSemanticQuery,
  rebuildVectorIndex,
  runSemanticSearch,
}: {
  vectorItems: VectorItem[];
  semanticQuery: string;
  semanticResults: SemanticSearchItem[];
  loading: boolean;
  message: string;
  setSemanticQuery: (value: string) => void;
  rebuildVectorIndex: () => void;
  runSemanticSearch: () => void;
}) {
  return (
    <GlassPanel className="border-cyan-400/20 bg-white/[0.06] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Semantic Memory</h2>
          <p className="text-sm text-slate-400">
            Vector search across memory and indexed knowledge
          </p>
        </div>
        <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
          {vectorItems.length} vectors
        </span>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        <button
          onClick={rebuildVectorIndex}
          disabled={loading}
          className="w-full rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
        >
          {loading ? "Rebuilding..." : "Rebuild Vector Index"}
        </button>

        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">
            Semantic Search
          </p>
          <div className="flex gap-2">
            <input
              value={semanticQuery}
              onChange={(event) => setSemanticQuery(event.target.value)}
              placeholder="Ask by meaning, not exact words..."
              className="min-w-0 flex-1 rounded-2xl border border-cyan-400/20 bg-black/40 px-4 py-3 text-sm outline-none ring-cyan-400/30 placeholder:text-slate-500 focus:ring-2"
            />
            <button
              onClick={runSemanticSearch}
              disabled={loading}
              className="rounded-2xl border border-cyan-400/30 px-4 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/10 disabled:opacity-60"
            >
              Search
            </button>
          </div>
        </div>

        {message && (
          <p className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
            {message}
          </p>
        )}

        {semanticResults.length === 0 ? (
          <p className="text-sm text-slate-500">
            Rebuild the vector index, then run a semantic search.
          </p>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3">
            {semanticResults.map((result) => (
              <div key={result.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-100">{result.title}</h3>
                  <span className="text-[10px] text-cyan-300">
                    {result.score.toFixed(3)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {result.source_type} | Source ID: {result.source_id}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-300">
                  {result.content.slice(0, 700)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassPanel>
  );
}


function KnowledgeBasePanel({
  documents,
  path,
  query,
  results,
  loading,
  message,
  setPath,
  setQuery,
  indexFolder,
  searchKnowledge,
}: {
  documents: KnowledgeDocumentItem[];
  path: string;
  query: string;
  results: KnowledgeSearchItem[];
  loading: boolean;
  message: string;
  setPath: (value: string) => void;
  setQuery: (value: string) => void;
  indexFolder: () => void;
  searchKnowledge: () => void;
}) {
  return (
    <GlassPanel className="border-cyan-400/20 bg-white/[0.06] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Knowledge Base</h2>
          <p className="text-sm text-slate-400">
            Local documents, project files, notes, and searchable knowledge
          </p>
        </div>
        <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
          {documents.length} docs
        </span>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">
            Index Folder
          </p>
          <div className="flex gap-2">
            <input
              value={path}
              onChange={(event) => setPath(event.target.value)}
              placeholder="/home/titanvx/O.R.I.O.N/orion-ai/docs"
              className="min-w-0 flex-1 rounded-2xl border border-cyan-400/20 bg-black/40 px-4 py-3 text-sm outline-none ring-cyan-400/30 placeholder:text-slate-500 focus:ring-2"
            />
            <button
              onClick={indexFolder}
              disabled={loading}
              className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
            >
              Index
            </button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">
            Search Knowledge
          </p>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search local knowledge..."
              className="min-w-0 flex-1 rounded-2xl border border-cyan-400/20 bg-black/40 px-4 py-3 text-sm outline-none ring-cyan-400/30 placeholder:text-slate-500 focus:ring-2"
            />
            <button
              onClick={searchKnowledge}
              disabled={loading}
              className="rounded-2xl border border-cyan-400/30 px-4 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/10 disabled:opacity-60"
            >
              Search
            </button>
          </div>
        </div>

        {message && (
          <p className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
            {message}
          </p>
        )}

        <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-3">
          {documents.length === 0 ? (
            <p className="text-sm text-slate-500">No knowledge documents indexed yet.</p>
          ) : (
            documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setQuery(`Summarize knowledge document ${doc.id}`)}
                className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-left transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-100">{doc.title}</h3>
                  <span className="text-[10px] text-slate-500">ID {doc.id}</span>
                </div>
                <p className="mt-1 break-all text-xs text-slate-500">{doc.source_path}</p>
              </button>
            ))
          )}
        </div>

        {results.length > 0 && (
          <div className="max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
              Search Results
            </p>
            {results.map((result) => (
              <div key={result.chunk_id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                <p className="text-sm font-semibold text-slate-100">{result.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Document ID: {result.document_id} | Chunk {result.chunk_index}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-300">
                  {result.content.slice(0, 700)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassPanel>
  );
}

function SafePanel({ panelId, children }: { panelId: AuroraPanelId; children: React.ReactNode }) {
  const definition = getPanelDefinition(panelId);
  return <PanelErrorBoundary panelName={definition?.title || panelId}>{children}</PanelErrorBoundary>;
}
