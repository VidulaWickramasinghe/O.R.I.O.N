"use client";

import { useEffect, useState } from "react";
import { useAuroraStore } from "@/store/auroraStore";

import { dashboardModels, dashboardTimeline } from "@/lib/aurora-data";
import { agents } from "@/lib/agent-data";
import { memoryItems } from "@/lib/memory-data";
import { projects } from "@/lib/project-data";
import { getDashboardIntelligence } from "@/lib/api/dashboard";
import { getDesktopShellStatus } from "@/lib/api/desktop";
import { createDeveloperPatchPlan, diagnoseDeveloperWorkspace, getDeveloperReports, inspectDeveloperWorkspace } from "@/lib/api/developer";
import { getFrontendRefactorStatus, saveFrontendRefactorReport } from "@/lib/api/frontend-refactor";
import { getKnowledgeDocuments, indexKnowledgeFolder, searchKnowledge } from "@/lib/api/knowledge";
import { createReminder, getNotificationEvents, getReminders, getStartupBriefing, updateReminderStatus } from "@/lib/api/notifications";
import { getPlugins, updatePluginStatus } from "@/lib/api/plugins";
import { generateReleaseCandidatePackage, getReleaseCandidateStatus, freezeReleaseCandidate, unfreezeReleaseCandidate } from "@/lib/api/release";
import { applySecurityProfile, getSecurityPolicy } from "@/lib/api/security";
import { getUserSettingsProfile, resetUserSettings, updateUserSetting } from "@/lib/api/settings";
import { getBackendSidecarStatus, runBackendSidecarAction as runSidecarApiAction } from "@/lib/api/sidecar";
import { runStabilizationScan, saveStabilizationReport } from "@/lib/api/stabilization";
import { getToolAudit, getToolPermissions } from "@/lib/api/tools";
import { getVectorItems, rebuildVectorIndex, searchVector } from "@/lib/api/vector";
import { getWorkspaces } from "@/lib/api/workspaces";
import { createWorkflowMission, getWorkflowBlueprint, getWorkflowBlueprints } from "@/lib/api/workflows";
import { FrontendRefactorPanel } from "@/components/aurora/panels/FrontendRefactorPanel";
import { BackendSidecarPanel } from "@/components/aurora/panels/BackendSidecarPanel";
import { DesktopShellPanel } from "@/components/aurora/panels/DesktopShellPanel";
import { NotificationEnginePanel } from "@/components/aurora/panels/NotificationEnginePanel";
import { PluginSystemPanel } from "@/components/aurora/panels/PluginSystemPanel";
import { SecurityPolicyPanel } from "@/components/aurora/panels/SecurityPolicyPanel";
import { ToolAuditPanel } from "@/components/aurora/panels/ToolAuditPanel";
import { ToolPermissionPanel } from "@/components/aurora/panels/ToolPermissionPanel";
import { UserSettingsPanel } from "@/components/aurora/panels/UserSettingsPanel";
import { GlassPanel } from "./glass-panel";
import { StatusChip } from "./status-chip";

import type {
  BackendSidecarStatus,
  DesktopShellStatus,
  NotificationEventItem,
  PluginItem,
  ReminderItem,
  SecurityPolicyEventItem,
  SecurityProfileItem,
  ToolAuditEventItem,
  ToolPermissionItem,
  UserSettingsProfile,
  WorkspaceItem,
} from "@/types/orion";

import type {
  DashboardIntelligence,
  ReleaseCandidatePackage,
  ReleaseCandidateStatus,
  StabilizationResult,
  FrontendRefactorResult,
} from "@/types/orion";
import { DashboardIntelligencePanel } from "@/components/aurora/panels/DashboardIntelligencePanel";
import { ReleaseCandidatePanel } from "@/components/aurora/panels/ReleaseCandidatePanel";
import { StabilizationPanel } from "@/components/aurora/panels/StabilizationPanel";

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

type PluginsResponse = {
  plugins: PluginItem[];
  metrics: Record<string, unknown>;
  report: string;
};

type BackendSidecarAction = {
  status: string;
  message: string;
  sidecar: BackendSidecarStatus;
};


type ToolPermissionResponse = {
  metrics: Record<string, unknown>;
  matrix: ToolPermissionItem[];
  report: string;
};


type ToolAuditResponse = {
  metrics: Record<string, unknown>;
  events: ToolAuditEventItem[];
  report: string;
};

type SecurityPolicyResponse = {
  active_policy: Record<string, unknown>;
  profiles: SecurityProfileItem[];
  events: SecurityPolicyEventItem[];
  report: string;
};


export function DashboardWorkspace() {
  const [widgets, setWidgets] = useState([
    "Hero",
    "Metrics",
    "Quick Actions",
    "Models",
    "Timeline",
    "Knowledge Base",
    "Semantic Memory",
    "Workflow Blueprints",
    "Developer Mode",
    "Dashboard Intelligence",
    "Notification Engine",
    "User Settings",
    "Plugin System",
    "Security Policy",
    "Release Candidate",
    "Stabilization Manager",
    "Frontend Refactor",
    "Desktop Shell",
    "Backend Sidecar",
    "Tool Permission Enforcement",
    "Tool Audit Center",
  ]);
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
    frontendRefactorResult, frontendRefactorLoading, desktopShellStatus,
    desktopShellLoading, backendSidecarStatus, backendSidecarLoading, reminders,
    notificationEvents, startupBriefing, reminderTitle, reminderDueAt, reminderLoading,
    userSettingsProfile, settingsLoadingKey, setReminderTitle, setReminderDueAt,
    patchLocalSettingValue, loadDashboardIntelligence, loadDesktopShellStatus,
    loadBackendSidecarStatus, loadStartupBriefing, updatePluginStatusFromStore,
    applySecurityProfileFromStore, freezeReleaseCandidateFromStore,
    unfreezeReleaseCandidateFromStore, generateReleaseCandidatePackageFromStore,
    runStabilizationScanFromStore, saveStabilizationReportFromStore,
    runFrontendRefactorScanFromStore, saveFrontendRefactorReportFromStore,
    runBackendSidecarActionFromStore, createReminderFromStore,
    updateReminderStatusFromStore, updateUserSettingFromStore, resetUserSettingsFromStore,
  } = useAuroraStore();
  const [dashboardIntelligenceMessage, setDashboardIntelligenceMessage] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [pluginMessage, setPluginMessage] = useState("");
  const [backendSidecarMessage, setBackendSidecarMessage] = useState("");
  const [securityPolicyMessage, setSecurityPolicyMessage] = useState("");
  const [releaseCandidateMessage, setReleaseCandidateMessage] = useState("");
  const [stabilizationMessage, setStabilizationMessage] = useState("");

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
    void loadKnowledgeDocuments(); void loadVectorItems(); void loadWorkflowBlueprints();
    void loadWorkspaces(); void loadDeveloperReports();
    void useAuroraStore.getState().refreshAll();
    const timer = window.setInterval(() => {
      void loadKnowledgeDocuments(); void loadVectorItems(); void loadWorkflowBlueprints();
      void loadWorkspaces(); void loadDeveloperReports();
      void useAuroraStore.getState().refreshAll();
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  function metricValue(
    source: Record<string, unknown> | undefined,
    key: string,
    fallback = "0"
  ) {
    const value = source?.[key];
    if (value === undefined || value === null) return fallback;
    return String(value);
  }

  return (
    <div className="space-y-4">
      <GlassPanel className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-white">
              Good Evening, Wichel. O.R.I.O.N. is ready.
            </h1>
            <p className="mt-1 text-slate-400">
              Operational Response and Intelligent Orchestration Network · Think. Plan. Act. Learn. · v4.5
            </p>
          </div>
          <StatusChip tone="success">System Online</StatusChip>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {["Hero", "Metrics", "Quick Actions", "Models", "Timeline", "Knowledge Base", "Semantic Memory", "Workflow Blueprints", "Developer Mode", "Dashboard Intelligence", "Notification Engine", "User Settings", "Plugin System", "Security Policy", "Desktop Shell", "Backend Sidecar", "Tool Permission Enforcement", "Tool Audit Center"].map((item) => (
            <button
              key={item}
              onClick={() => toggle(item)}
              className={`rounded-xl border px-3 py-2 text-xs ${
                widgets.includes(item)
                  ? "border-[#61DFFF]/40 bg-[#61DFFF]/10 text-white"
                  : "border-white/10 text-slate-500"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </GlassPanel>

      {widgets.includes("Metrics") && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-14">
          <Metric label="Models Online" value="4" />
          <Metric label="Memory" value="87%" />
          <Metric label="Knowledge Docs" value={String(knowledgeDocuments.length)} />
          <Metric label="Vectors" value={String(vectorItems.length)} />
          <Metric label="Blueprints" value={String(workflowBlueprints.length)} />
          <Metric label="Dev Reports" value={String(developerReports.length)} />
          <Metric label="Intel Score" value={dashboardIntelligence ? `${dashboardIntelligence.intelligence_score}` : "—"} />
          <Metric label="Reminders" value={String(reminders.length)} />
          <Metric label="Settings" value={String(userSettingsProfile?.settings.length || 0)} />
          <Metric label="Plugins" value={String(plugins.length)} />
          <Metric label="Desktop" value={desktopShellStatus?.status || "—"} />
          <Metric label="Sidecar" value={backendSidecarStatus?.status || "—"} />
          <Metric label="Active Projects" value={String(projects.length)} />
          <Metric label="Running Agents" value={String(agents.filter((agent) => agent.status === "Running").length)} />
        </div>
      )}

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          {widgets.includes("Hero") && (
            <GlassPanel className="overflow-hidden p-5">
              <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">
                    O.R.I.O.N. System Status
                  </p>
                  <div className="aurora-wave-field mt-4 h-64 rounded-[16px] border border-[#61DFFF]/15" />
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <Metric label="Tasks Completed" value="1,482" />
                    <Metric label="Success Rate" value="98.7%" />
                    <Metric label="Data Processed" value="12.4 TB" />
                    <Metric label="Cost Saved" value="$12.47" />
                  </div>
                </div>
                <div className="space-y-3">
                  <Panel title="Memory / Projects">
                    <p>{memoryItems.length} memory clusters · {projects.length} active projects</p>
                  </Panel>
                  <Panel title="Agent Runtime">
                    <p>{agents[0].name} is {agents[0].status}; {agents[2].name} is refactoring Aurora.</p>
                  </Panel>
                  <Panel title="Quick Actions">
                    <div className="grid grid-cols-2 gap-2">
                      {["New Chat", "Start Agent", "New Project", "Search Memory", "Upload Files"].map((action) => (
                        <button
                          key={action}
                          className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left text-sm text-slate-300"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  </Panel>
                </div>
              </div>
            </GlassPanel>
          )}

          {widgets.includes("Models") && (
            <GlassPanel className="p-5">
              <h2 className="font-black text-white">Model Status</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                {dashboardModels.map((model) => (
                  <div key={model} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <p className="font-bold text-white">{model}</p>
                    <StatusChip tone="success" className="mt-3">Ready</StatusChip>
                  </div>
                ))}
              </div>
            </GlassPanel>
          )}
        </div>

        <div className="space-y-4">
          {widgets.includes("Release Candidate") && (
            <ReleaseCandidatePanel
              status={releaseCandidateStatus}
              latestPackage={releaseCandidatePackage}
              loading={releaseCandidateLoading}
              message={releaseCandidateMessage}
              runAction={(action) => action === "freeze" ? freezeReleaseCandidateFromStore() : action === "unfreeze" ? unfreezeReleaseCandidateFromStore() : generateReleaseCandidatePackageFromStore()}
            />
          )}

          {widgets.includes("Stabilization Manager") && (
            <StabilizationPanel
              result={stabilizationResult}
              loading={stabilizationLoading}
              message={stabilizationMessage}
              runAction={(action, runBuild) => action === "scan" ? runStabilizationScanFromStore(runBuild) : saveStabilizationReportFromStore(runBuild)}
            />
          )}

          {widgets.includes("Frontend Refactor") && (
            <FrontendRefactorPanel
              result={frontendRefactorResult}
              loading={frontendRefactorLoading}
              onScan={runFrontendRefactorScanFromStore}
              onSaveReport={saveFrontendRefactorReportFromStore}
            />
          )}

          {widgets.includes("Dashboard Intelligence") && (
            <DashboardIntelligencePanel
              intelligence={dashboardIntelligence}
              loading={dashboardIntelligenceLoading}
              message={dashboardIntelligenceMessage}
              onRefresh={loadDashboardIntelligence}
            />
          )}

          {widgets.includes("Desktop Shell") && (
            <DesktopShellPanel
              status={desktopShellStatus}
              loading={desktopShellLoading}
              refreshStatus={loadDesktopShellStatus}
            />
          )}

          {widgets.includes("Backend Sidecar") && (
            <BackendSidecarPanel
              status={backendSidecarStatus}
              loading={backendSidecarLoading}
              message={backendSidecarMessage}
              refreshStatus={loadBackendSidecarStatus}
              runAction={runBackendSidecarActionFromStore}
            />
          )}

          {widgets.includes("Tool Permission Enforcement") && (
            <ToolPermissionPanel
              matrix={toolPermissionMatrix}
              metrics={toolPermissionMetrics}
              report={toolPermissionReport}
              metricValue={metricValue}
            />
          )}

          {widgets.includes("Tool Audit Center") && (
            <ToolAuditPanel
              events={toolAuditEvents}
              metrics={toolAuditMetrics}
              report={toolAuditReport}
              metricValue={metricValue}
            />
          )}

          {widgets.includes("Notification Engine") && (
            <NotificationEnginePanel
              reminders={reminders}
              events={notificationEvents}
              startupBriefing={startupBriefing}
              reminderTitle={reminderTitle}
              reminderDueAt={reminderDueAt}
              loading={reminderLoading}
              message={notificationMessage}
              setReminderTitle={setReminderTitle}
              setReminderDueAt={setReminderDueAt}
              createReminder={createReminderFromStore}
              updateReminderStatus={updateReminderStatusFromStore}
              generateStartupBriefing={() => loadStartupBriefing(true)}
            />
          )}

          {widgets.includes("User Settings") && (
            <UserSettingsPanel
              profile={userSettingsProfile}
              loadingKey={settingsLoadingKey}
              message={settingsMessage}
              setProfile={(updater) => { const current = useAuroraStore.getState().userSettingsProfile; const next = updater(current); if (next) useAuroraStore.setState({ userSettingsProfile: next }); }}
              updateSetting={updateUserSettingFromStore}
              resetSettings={resetUserSettingsFromStore}
            />
          )}

          {widgets.includes("Plugin System") && (
            <PluginSystemPanel
              plugins={plugins}
              metrics={pluginMetrics}
              report={pluginRegistryReport}
              loadingKey={pluginLoadingKey}
              message={pluginMessage}
              metricValue={metricValue}
              updatePluginStatus={updatePluginStatusFromStore}
            />
          )}



          {widgets.includes("Security Policy") && (
            <SecurityPolicyPanel
              activePolicy={securityPolicyActive}
              profiles={securityProfiles}
              events={securityPolicyEvents}
              report={securityPolicyReport}
              loadingKey={securityPolicyLoadingKey}
              message={securityPolicyMessage}
              applyProfile={applySecurityProfileFromStore}
            />
          )}

          {widgets.includes("Knowledge Base") && (
            <KnowledgeBasePanel
              documents={knowledgeDocuments}
              path={knowledgePath}
              query={knowledgeQuery}
              results={knowledgeResults}
              loading={knowledgeLoading}
              message={knowledgeMessage}
              setPath={setKnowledgePath}
              setQuery={setKnowledgeQuery}
              indexFolder={indexKnowledgeFolderFromUI}
              searchKnowledge={searchKnowledgeFromUI}
            />
          )}

          {widgets.includes("Semantic Memory") && (
            <SemanticMemoryPanel
              vectorItems={vectorItems}
              semanticQuery={semanticQuery}
              semanticResults={semanticResults}
              loading={vectorLoading}
              message={vectorMessage}
              setSemanticQuery={setSemanticQuery}
              rebuildVectorIndex={rebuildVectorIndexFromUI}
              runSemanticSearch={runSemanticSearchFromUI}
            />
          )}

          {widgets.includes("Workflow Blueprints") && (
            <WorkflowBlueprintsPanel
              blueprints={workflowBlueprints}
              selectedBlueprint={selectedWorkflowBlueprint}
              loadingKey={workflowLoadingKey}
              message={workflowMessage}
              workspaceId={workflowWorkspaceId}
              setWorkspaceId={setWorkflowWorkspaceId}
              inspectBlueprint={openWorkflowBlueprint}
              createMission={createMissionFromBlueprintUI}
            />
          )}

          {widgets.includes("Developer Mode") && (
            <AgenticDeveloperModePanel
              workspaces={workspaces}
              developerIssue={developerIssue}
              developerReports={developerReports}
              developerResult={developerResult}
              loadingAction={developerLoadingAction}
              message={developerMessage}
              setDeveloperIssue={setDeveloperIssue}
              inspectWorkspace={runDeveloperInspect}
              diagnoseWorkspace={runDeveloperDiagnosis}
              createPatchPlan={runDeveloperPatchPlan}
            />
          )}

          {widgets.includes("Timeline") && (
            <GlassPanel className="p-5">
              <h2 className="font-black text-white">Aurora Timeline</h2>
              <div className="mt-4 space-y-3">
                {dashboardTimeline.map((step, index) => (
                  <div key={step} className="flex items-center gap-3 text-sm">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#61DFFF]/40 text-xs text-[#61DFFF]">
                      {index + 1}
                    </span>
                    <span className="text-slate-300">{step}</span>
                  </div>
                ))}
              </div>
            </GlassPanel>
          )}
        </div>
      </div>
    </div>
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
          v4.5
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <GlassPanel className="p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </GlassPanel>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[16px] border border-white/10 bg-black/20 p-4">
      <p className="font-bold text-white">{title}</p>
      <div className="mt-2 text-sm text-slate-400">{children}</div>
    </div>
  );
}
