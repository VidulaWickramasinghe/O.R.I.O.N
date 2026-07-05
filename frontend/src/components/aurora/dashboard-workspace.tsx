"use client";

import { useEffect, useState } from "react";

import { dashboardModels, dashboardTimeline } from "@/lib/aurora-data";
import { agents } from "@/lib/agent-data";
import { memoryItems } from "@/lib/memory-data";
import { projects } from "@/lib/project-data";
import { GlassPanel } from "./glass-panel";
import { StatusChip } from "./status-chip";

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

type WorkspaceItem = {
  id: number;
  name: string;
  path: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
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

type ReminderItem = {
  id: number;
  title: string;
  description: string;
  due_at: string;
  status: string;
  priority: string;
  source: string;
  created_at: string;
  updated_at: string;
};

type NotificationEventItem = {
  id: number;
  event_type: string;
  title: string;
  message: string;
  source: string;
  created_at: string;
};

type StartupBriefing = {
  status: string;
  briefing: string;
};

type UserSettingItem = {
  key: string;
  value: string;
  description: string;
  updated_at: string;
  options: string[];
};

type UserSettingsProfile = {
  settings: UserSettingItem[];
  settings_map: Record<string, string>;
  profile_summary: string;
};

type PluginItem = {
  key: string;
  name: string;
  description: string;
  category: string;
  risk_level: string;
  permissions: string[];
  enabled: boolean;
  built_in: boolean;
  created_at: string;
  updated_at: string;
};

type PluginsResponse = {
  plugins: PluginItem[];
  metrics: Record<string, unknown>;
  report: string;
};

type DesktopShellStatus = {
  status: string;
  app_name: string;
  shell_version: string;
  backend_url: string;
  frontend_mode: string;
  message: string;
};

type DashboardIntelligence = {
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
  recommendations: string[];
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
    "Desktop Shell",
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
  const [dashboardIntelligence, setDashboardIntelligence] =
    useState<DashboardIntelligence | null>(null);
  const [dashboardIntelligenceLoading, setDashboardIntelligenceLoading] = useState(false);
  const [dashboardIntelligenceMessage, setDashboardIntelligenceMessage] = useState("");
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [notificationEvents, setNotificationEvents] = useState<NotificationEventItem[]>([]);
  const [startupBriefing, setStartupBriefing] = useState<StartupBriefing | null>(null);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDueAt, setReminderDueAt] = useState("tomorrow");
  const [reminderLoading, setReminderLoading] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [userSettingsProfile, setUserSettingsProfile] = useState<UserSettingsProfile | null>(null);
  const [settingsLoadingKey, setSettingsLoadingKey] = useState<string | null>(null);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [plugins, setPlugins] = useState<PluginItem[]>([]);
  const [pluginRegistryReport, setPluginRegistryReport] = useState("");
  const [pluginMetrics, setPluginMetrics] = useState<Record<string, unknown>>({});
  const [pluginLoadingKey, setPluginLoadingKey] = useState<string | null>(null);
  const [pluginMessage, setPluginMessage] = useState("");
  const [desktopShellStatus, setDesktopShellStatus] = useState<DesktopShellStatus | null>(null);
  const [desktopShellLoading, setDesktopShellLoading] = useState(false);

  function toggle(item: string) {
    setWidgets((current) =>
      current.includes(item)
        ? current.filter((widget) => widget !== item)
        : [...current, item]
    );
  }

  async function loadKnowledgeDocuments() {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/knowledge/documents");
      const data = await response.json();
      setKnowledgeDocuments(data.documents || []);
    } catch {
      setKnowledgeDocuments([]);
    }
  }

  async function indexKnowledgeFolderFromUI() {
    const cleanPath = knowledgePath.trim();
    if (!cleanPath || knowledgeLoading) return;

    setKnowledgeLoading(true);
    setKnowledgeMessage("");

    try {
      const response = await fetch("http://127.0.0.1:8000/api/knowledge/index-folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ folder_path: cleanPath }),
      });
      const data = await response.json();
      setKnowledgeMessage(`Knowledge indexing status: ${data.status}. ${data.message}`);
      await loadKnowledgeDocuments();
    } catch {
      setKnowledgeMessage("Knowledge folder indexing failed. Confirm backend is running.");
    } finally {
      setKnowledgeLoading(false);
    }
  }

  async function searchKnowledgeFromUI() {
    const cleanQuery = knowledgeQuery.trim();
    if (!cleanQuery || knowledgeLoading) return;

    setKnowledgeLoading(true);
    setKnowledgeMessage("");

    try {
      const response = await fetch("http://127.0.0.1:8000/api/knowledge/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: cleanQuery,
          limit: 8,
        }),
      });
      const data = await response.json();
      setKnowledgeResults(data.results || []);
    } catch {
      setKnowledgeResults([]);
      setKnowledgeMessage("Knowledge search failed. Confirm backend is running.");
    } finally {
      setKnowledgeLoading(false);
    }
  }



  async function loadVectorItems() {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/vector/items");
      const data = await response.json();
      setVectorItems(data.items || []);
    } catch {
      setVectorItems([]);
    }
  }

  async function rebuildVectorIndexFromUI() {
    setVectorLoading(true);
    setVectorMessage("");

    try {
      const response = await fetch("http://127.0.0.1:8000/api/vector/rebuild", {
        method: "POST",
      });
      const data = await response.json();
      setVectorMessage(`Vector index rebuild status: ${data.status}`);
      await loadVectorItems();
    } catch {
      setVectorMessage(
        "Vector index rebuild failed. Confirm backend is running and OPENAI_API_KEY is set."
      );
    } finally {
      setVectorLoading(false);
    }
  }

  async function runSemanticSearchFromUI() {
    const cleanQuery = semanticQuery.trim();
    if (!cleanQuery || vectorLoading) return;

    setVectorLoading(true);
    setVectorMessage("");

    try {
      const response = await fetch("http://127.0.0.1:8000/api/vector/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: cleanQuery,
          limit: 8,
        }),
      });
      const data = await response.json();
      setSemanticResults(data.results || []);
    } catch {
      setSemanticResults([]);
      setVectorMessage(
        "Semantic search failed. Confirm backend is running and OPENAI_API_KEY is set."
      );
    } finally {
      setVectorLoading(false);
    }
  }

  async function loadWorkflowBlueprints() {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/workflows/blueprints");
      const data = await response.json();
      setWorkflowBlueprints(data.blueprints || []);
    } catch {
      setWorkflowBlueprints([]);
    }
  }

  async function openWorkflowBlueprint(blueprintKey: string) {
    setWorkflowLoadingKey(blueprintKey);
    setWorkflowMessage("");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/workflows/blueprints/${blueprintKey}`
      );
      const data = await response.json();
      setSelectedWorkflowBlueprint(data);
    } catch {
      setSelectedWorkflowBlueprint(null);
      setWorkflowMessage("Workflow blueprint failed to load. Confirm backend is running.");
    } finally {
      setWorkflowLoadingKey(null);
    }
  }

  async function createMissionFromBlueprintUI(blueprintKey: string) {
    setWorkflowLoadingKey(blueprintKey);
    setWorkflowMessage("");

    try {
      const parsedWorkspaceId = Number.parseInt(workflowWorkspaceId, 10);
      const workspaceId = Number.isFinite(parsedWorkspaceId) && parsedWorkspaceId > 0
        ? parsedWorkspaceId
        : null;
      const response = await fetch(
        `http://127.0.0.1:8000/api/workflows/blueprints/${blueprintKey}/create-mission`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mission_title: "",
            custom_goal: "",
            workspace_id: workspaceId,
          }),
        }
      );
      const data = await response.json();

      if (data.status === "created") {
        setWorkflowMessage(
          `Workflow mission created: Mission ${data.mission_id} · ${data.title} · ${data.step_count} steps`
        );
      } else {
        setWorkflowMessage(`Workflow mission creation failed: ${data.message}`);
      }
    } catch {
      setWorkflowMessage("Workflow mission creation failed. Confirm backend is running.");
    } finally {
      setWorkflowLoadingKey(null);
    }
  }

  async function loadWorkspaces() {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/workspaces");
      const data = await response.json();
      setWorkspaces(data.workspaces || []);
    } catch {
      setWorkspaces([]);
    }
  }

  async function loadDeveloperReports() {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/developer/reports");
      const data = await response.json();
      setDeveloperReports(data.reports || []);
    } catch {
      setDeveloperReports([]);
    }
  }

  async function runDeveloperInspect(workspaceId: number) {
    setDeveloperLoadingAction(`inspect-${workspaceId}`);
    setDeveloperMessage("");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/developer/workspaces/${workspaceId}/inspect`
      );
      const data = await response.json();
      setDeveloperResult(data);
      setDeveloperMessage(`Developer inspection generated for workspace ${workspaceId}.`);
      await loadDeveloperReports();
    } catch {
      setDeveloperMessage("Developer inspection failed. Confirm backend is running.");
    } finally {
      setDeveloperLoadingAction(null);
    }
  }

  async function runDeveloperDiagnosis(workspaceId: number) {
    const cleanIssue = developerIssue.trim();
    if (!cleanIssue) {
      setDeveloperMessage("Add an issue description before running developer diagnosis.");
      return;
    }

    setDeveloperLoadingAction(`diagnose-${workspaceId}`);
    setDeveloperMessage("");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/developer/workspaces/${workspaceId}/diagnose`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            issue_description: cleanIssue,
            target_files: [],
          }),
        }
      );
      const data = await response.json();
      setDeveloperResult(data);
      setDeveloperMessage(`Developer diagnosis generated for workspace ${workspaceId}.`);
      await loadDeveloperReports();
    } catch {
      setDeveloperMessage("Developer diagnosis failed. Confirm backend is running.");
    } finally {
      setDeveloperLoadingAction(null);
    }
  }

  async function runDeveloperPatchPlan(workspaceId: number) {
    const cleanIssue = developerIssue.trim();
    if (!cleanIssue) {
      setDeveloperMessage("Add an issue or objective before creating a patch plan.");
      return;
    }

    setDeveloperLoadingAction(`patch-plan-${workspaceId}`);
    setDeveloperMessage("");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/developer/workspaces/${workspaceId}/patch-plan`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            issue_description: cleanIssue,
            target_files: [],
          }),
        }
      );
      const data = await response.json();
      setDeveloperResult(data);
      setDeveloperMessage(`Patch plan generated for workspace ${workspaceId}.`);
      await loadDeveloperReports();
    } catch {
      setDeveloperMessage("Patch plan generation failed. Confirm backend is running.");
    } finally {
      setDeveloperLoadingAction(null);
    }
  }

  async function loadDashboardIntelligence(showMessage = false) {
    setDashboardIntelligenceLoading(true);
    if (showMessage) {
      setDashboardIntelligenceMessage("");
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/api/dashboard/intelligence");
      const data = await response.json();
      setDashboardIntelligence(data);
      if (showMessage) {
        setDashboardIntelligenceMessage(
          `Dashboard Intelligence generated: ${data.intelligence_score}/100 · ${data.readiness_label}`
        );
      }
    } catch {
      if (showMessage) {
        setDashboardIntelligenceMessage("Dashboard Intelligence failed. Confirm backend is running.");
      }
    } finally {
      setDashboardIntelligenceLoading(false);
    }
  }


  async function loadReminders() {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/notifications/reminders");
      const data = await response.json();
      setReminders(data.reminders || []);
    } catch {
      setReminders([]);
    }
  }

  async function loadNotificationEvents() {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/notifications/events");
      const data = await response.json();
      setNotificationEvents(data.events || []);
    } catch {
      setNotificationEvents([]);
    }
  }

  async function loadStartupBriefing(showMessage = false) {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/notifications/startup-briefing");
      const data = await response.json();
      setStartupBriefing(data);
      if (showMessage) {
        setNotificationMessage("Startup briefing generated.");
      }
    } catch {
      if (showMessage) {
        setNotificationMessage("Startup briefing failed. Confirm backend is running.");
      }
    }
  }

  async function createReminderFromUI() {
    const cleanTitle = reminderTitle.trim();
    if (!cleanTitle || reminderLoading) return;

    setReminderLoading(true);
    setNotificationMessage("");

    try {
      const response = await fetch("http://127.0.0.1:8000/api/notifications/reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: cleanTitle,
          description: "Created from Aurora OS Notification Engine.",
          due_at: reminderDueAt,
          priority: "medium",
        }),
      });
      const data = await response.json();
      setNotificationMessage(`Reminder created: ${data.title} · Due ${data.due_at}`);
      setReminderTitle("");
      await loadReminders();
      await loadNotificationEvents();
    } catch {
      setNotificationMessage("Reminder creation failed. Confirm backend is running.");
    } finally {
      setReminderLoading(false);
    }
  }

  async function updateReminderStatusFromUI(reminderId: number, status: string) {
    try {
      await fetch(`http://127.0.0.1:8000/api/notifications/reminders/${reminderId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      setNotificationMessage(`Reminder ${reminderId} marked ${status}.`);
      await loadReminders();
      await loadNotificationEvents();
    } catch {
      setNotificationMessage(`Could not update reminder ${reminderId}.`);
    }
  }


  async function loadUserSettingsProfile() {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/settings/profile");
      const data = await response.json();
      setUserSettingsProfile(data);
    } catch {
      setUserSettingsProfile(null);
    }
  }

  async function updateUserSettingFromUI(key: string, value: string) {
    setSettingsLoadingKey(key);
    setSettingsMessage("");

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/settings/profile/${key}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value }),
      });
      const data = await response.json();

      if (data.status === "updated") {
        setSettingsMessage(`Setting updated: ${key} = ${data.setting.value}`);
      } else {
        setSettingsMessage(`Setting update failed: ${data.message}`);
      }

      await loadUserSettingsProfile();
      await loadDashboardIntelligence();
    } catch {
      setSettingsMessage(`Setting update failed for ${key}.`);
    } finally {
      setSettingsLoadingKey(null);
    }
  }

  async function resetUserSettingsFromUI() {
    setSettingsLoadingKey("reset");
    setSettingsMessage("");

    try {
      await fetch("http://127.0.0.1:8000/api/settings/profile/reset", {
        method: "POST",
      });
      setSettingsMessage("User profile settings reset to defaults.");
      await loadUserSettingsProfile();
      await loadDashboardIntelligence();
    } catch {
      setSettingsMessage("User settings reset failed.");
    } finally {
      setSettingsLoadingKey(null);
    }
  }

  async function loadPlugins() {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/plugins");
      const data: PluginsResponse = await response.json();
      setPlugins(data.plugins || []);
      setPluginMetrics(data.metrics || {});
      setPluginRegistryReport(data.report || "");
    } catch {
      setPlugins([]);
      setPluginMetrics({});
      setPluginRegistryReport("");
    }
  }

  async function updatePluginStatusFromUI(pluginKey: string, enabled: boolean) {
    setPluginLoadingKey(pluginKey);
    setPluginMessage("");

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/plugins/${pluginKey}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled }),
      });
      const data = await response.json();
      setPluginMessage(
        data.status === "updated"
          ? `Plugin updated: ${pluginKey} = ${enabled ? "enabled" : "disabled"}`
          : `Plugin update failed: ${data.message}`
      );
      await loadPlugins();
      await loadDashboardIntelligence();
    } catch {
      setPluginMessage(`Plugin update failed for ${pluginKey}.`);
    } finally {
      setPluginLoadingKey(null);
    }
  }

  async function loadDesktopShellStatus() {
    setDesktopShellLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/desktop-shell/status");
      const data: DesktopShellStatus = await response.json();
      setDesktopShellStatus(data);
    } catch {
      setDesktopShellStatus({
        status: "offline",
        app_name: "O.R.I.O.N. Aurora OS",
        shell_version: "3.5.0",
        backend_url: "http://127.0.0.1:8000",
        frontend_mode: "tauri_static_shell",
        message: "Backend is offline. Start O.R.I.O.N. backend first.",
      });
    } finally {
      setDesktopShellLoading(false);
    }
  }

  useEffect(() => {
    void loadKnowledgeDocuments();
    void loadVectorItems();
    void loadWorkflowBlueprints();
    void loadWorkspaces();
    void loadDeveloperReports();
    void loadDashboardIntelligence();
    void loadReminders();
    void loadNotificationEvents();
    void loadStartupBriefing();
    void loadUserSettingsProfile();
    void loadPlugins();
    void loadDesktopShellStatus();
    const timer = window.setInterval(() => {
      void loadKnowledgeDocuments();
      void loadVectorItems();
      void loadWorkflowBlueprints();
      void loadWorkspaces();
      void loadDeveloperReports();
      void loadDashboardIntelligence();
      void loadReminders();
      void loadNotificationEvents();
      void loadUserSettingsProfile();
      void loadPlugins();
      void loadDesktopShellStatus();
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

  function scoreTone(score: number) {
    if (score >= 85) return "text-emerald-200 border-emerald-400/30 bg-emerald-500/10";
    if (score >= 70) return "text-cyan-200 border-cyan-400/30 bg-cyan-500/10";
    if (score >= 50) return "text-yellow-200 border-yellow-400/30 bg-yellow-500/10";
    return "text-red-200 border-red-400/30 bg-red-500/10";
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
              Operational Response and Intelligent Orchestration Network · Think. Plan. Act. Learn. · v3.5
            </p>
          </div>
          <StatusChip tone="success">System Online</StatusChip>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {["Hero", "Metrics", "Quick Actions", "Models", "Timeline", "Knowledge Base", "Semantic Memory", "Workflow Blueprints", "Developer Mode", "Dashboard Intelligence", "Notification Engine", "User Settings", "Plugin System", "Desktop Shell"].map((item) => (
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-13">
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
          {widgets.includes("Dashboard Intelligence") && (
            <DashboardIntelligencePanel
              intelligence={dashboardIntelligence}
              loading={dashboardIntelligenceLoading}
              message={dashboardIntelligenceMessage}
              metricValue={metricValue}
              scoreTone={scoreTone}
              refreshIntelligence={() => loadDashboardIntelligence(true)}
            />
          )}

          {widgets.includes("Desktop Shell") && (
            <DesktopShellPanel
              status={desktopShellStatus}
              loading={desktopShellLoading}
              refreshStatus={loadDesktopShellStatus}
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
              createReminder={createReminderFromUI}
              updateReminderStatus={updateReminderStatusFromUI}
              generateStartupBriefing={() => loadStartupBriefing(true)}
            />
          )}

          {widgets.includes("User Settings") && (
            <UserSettingsPanel
              profile={userSettingsProfile}
              loadingKey={settingsLoadingKey}
              message={settingsMessage}
              setProfile={setUserSettingsProfile}
              updateSetting={updateUserSettingFromUI}
              resetSettings={resetUserSettingsFromUI}
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
              updatePluginStatus={updatePluginStatusFromUI}
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







function DesktopShellPanel({
  status,
  loading,
  refreshStatus,
}: {
  status: DesktopShellStatus | null;
  loading: boolean;
  refreshStatus: () => void;
}) {
  return (
    <GlassPanel className="border-cyan-400/20 bg-white/[0.06] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Desktop App Shell</h2>
          <p className="text-sm text-slate-400">
            Tauri desktop wrapper, backend connection, and packaged app status
          </p>
        </div>
        <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
          v3.5
        </span>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        <button
          onClick={refreshStatus}
          disabled={loading}
          className="w-full rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
        >
          {loading ? "Checking..." : "Check Desktop Shell"}
        </button>

        {!status ? (
          <p className="text-sm text-slate-500">Desktop shell status has not loaded yet.</p>
        ) : (
          <div
            className={`rounded-2xl border p-4 ${
              status.status === "online"
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                : "border-red-400/30 bg-red-500/10 text-red-200"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.25em]">Shell Status</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <span className="text-3xl font-black">{status.status}</span>
              <span className="text-xs uppercase tracking-[0.2em]">{status.shell_version}</span>
            </div>
            <div className="mt-4 space-y-2 text-xs leading-5">
              <p><strong>App:</strong> {status.app_name}</p>
              <p><strong>Backend:</strong> {status.backend_url}</p>
              <p><strong>Mode:</strong> {status.frontend_mode}</p>
              <p>{status.message}</p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Launch Notes</p>
          <p className="mt-3 text-xs leading-5 text-slate-400">
            Start the FastAPI backend first, then run the Tauri desktop shell. In this version, the packaged app connects to the local backend at 127.0.0.1:8000.
          </p>
        </div>
      </div>
    </GlassPanel>
  );
}

function PluginSystemPanel({
  plugins,
  metrics,
  report,
  loadingKey,
  message,
  metricValue,
  updatePluginStatus,
}: {
  plugins: PluginItem[];
  metrics: Record<string, unknown>;
  report: string;
  loadingKey: string | null;
  message: string;
  metricValue: (source: Record<string, unknown> | undefined, key: string, fallback?: string) => string;
  updatePluginStatus: (pluginKey: string, enabled: boolean) => void;
}) {
  return (
    <GlassPanel className="border-cyan-400/20 bg-white/[0.06] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Plugin System</h2>
          <p className="text-sm text-slate-400">
            Tool registry, plugin permissions, risk levels, and module status
          </p>
        </div>
        <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
          v3.5
        </span>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <IntelMetric label="Total" value={metricValue(metrics, "total_plugins")} />
          <IntelMetric label="Enabled" value={metricValue(metrics, "enabled_plugins")} />
          <IntelMetric label="Disabled" value={metricValue(metrics, "disabled_plugins")} />
          <IntelMetric label="High Risk" value={metricValue(metrics, "high_risk_enabled")} />
        </div>

        {message && (
          <p className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
            {message}
          </p>
        )}

        <div className="max-h-96 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-3">
          {plugins.length === 0 ? (
            <p className="text-sm text-slate-500">No plugins registered yet.</p>
          ) : (
            plugins.map((plugin) => (
              <div key={plugin.key} className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">{plugin.name}</h3>
                    <p className="mt-1 text-xs text-cyan-300">
                      {plugin.key} | {plugin.category}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
                      plugin.risk_level === "high"
                        ? "border-red-400/30 text-red-200"
                        : plugin.risk_level === "medium"
                          ? "border-yellow-400/30 text-yellow-200"
                          : "border-emerald-400/30 text-emerald-200"
                    }`}
                  >
                    {plugin.risk_level}
                  </span>
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-400">{plugin.description}</p>

                <div className="mt-2 flex flex-wrap gap-1">
                  {plugin.permissions.map((permission) => (
                    <span
                      key={permission}
                      className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-400"
                    >
                      {permission}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
                      plugin.enabled
                        ? "border-emerald-400/30 text-emerald-200"
                        : "border-slate-400/30 text-slate-300"
                    }`}
                  >
                    {plugin.enabled ? "enabled" : "disabled"}
                  </span>
                  <button
                    onClick={() => updatePluginStatus(plugin.key, !plugin.enabled)}
                    disabled={loadingKey === plugin.key}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition disabled:opacity-60 ${
                      plugin.enabled
                        ? "border-red-400/30 text-red-200 hover:bg-red-500/10"
                        : "border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/10"
                    }`}
                  >
                    {plugin.enabled ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <details className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-cyan-200">
            Plugin Registry Report
          </summary>
          <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">
            {report || "No plugin registry report loaded yet."}
          </pre>
        </details>

        <p className="text-xs leading-5 text-slate-500">
          Safety: v3.5 tracks plugin metadata, permissions, and enable/disable state. It does not dynamically execute third-party plugin code.
        </p>
      </div>
    </GlassPanel>
  );
}

function UserSettingsPanel({
  profile,
  loadingKey,
  message,
  setProfile,
  updateSetting,
  resetSettings,
}: {
  profile: UserSettingsProfile | null;
  loadingKey: string | null;
  message: string;
  setProfile: (updater: (current: UserSettingsProfile | null) => UserSettingsProfile | null) => void;
  updateSetting: (key: string, value: string) => void;
  resetSettings: () => void;
}) {
  return (
    <GlassPanel className="border-cyan-400/20 bg-white/[0.06] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">User Profile + Settings</h2>
          <p className="text-sm text-slate-400">
            Local preferences, safety level, workspace defaults, voice, theme, and model mode
          </p>
        </div>
        <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
          v3.5
        </span>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        {!profile ? (
          <p className="text-sm text-slate-500">User settings have not loaded yet.</p>
        ) : (
          <>
            {message && (
              <p className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
                {message}
              </p>
            )}

            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Profile Summary</p>
              <pre className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">
                {profile.profile_summary}
              </pre>
            </div>

            <div className="space-y-3">
              {profile.settings.map((setting) => (
                <div key={setting.key} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{setting.key}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{setting.description}</p>
                    </div>
                    <span className="text-[10px] text-slate-500">{setting.updated_at}</span>
                  </div>

                  {setting.options.length > 0 ? (
                    <select
                      value={setting.value}
                      disabled={loadingKey === setting.key}
                      onChange={(event) => updateSetting(setting.key, event.target.value)}
                      className="w-full rounded-xl border border-cyan-400/20 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-cyan-400/30"
                    >
                      {setting.options.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={setting.value}
                      disabled={loadingKey === setting.key}
                      onChange={(event) => {
                        setProfile((current) => {
                          if (!current) return current;
                          return {
                            ...current,
                            settings: current.settings.map((item) =>
                              item.key === setting.key ? { ...item, value: event.target.value } : item
                            ),
                          };
                        });
                      }}
                      onBlur={(event) => updateSetting(setting.key, event.target.value)}
                      className="w-full rounded-xl border border-cyan-400/20 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-cyan-400/30"
                    />
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={resetSettings}
              disabled={loadingKey === "reset"}
              className="w-full rounded-2xl border border-red-400/30 px-4 py-3 text-sm font-bold text-red-200 transition hover:bg-red-500/10 disabled:opacity-60"
            >
              Reset Settings
            </button>

            <p className="text-xs leading-5 text-slate-500">
              Safety: profile settings are local preferences only. Keep API keys and secrets inside .env, not in this settings database.
            </p>
          </>
        )}
      </div>
    </GlassPanel>
  );
}

function NotificationEnginePanel({
  reminders,
  events,
  startupBriefing,
  reminderTitle,
  reminderDueAt,
  loading,
  message,
  setReminderTitle,
  setReminderDueAt,
  createReminder,
  updateReminderStatus,
  generateStartupBriefing,
}: {
  reminders: ReminderItem[];
  events: NotificationEventItem[];
  startupBriefing: StartupBriefing | null;
  reminderTitle: string;
  reminderDueAt: string;
  loading: boolean;
  message: string;
  setReminderTitle: (value: string) => void;
  setReminderDueAt: (value: string) => void;
  createReminder: () => void;
  updateReminderStatus: (reminderId: number, status: string) => void;
  generateStartupBriefing: () => void;
}) {
  return (
    <GlassPanel className="border-cyan-400/20 bg-white/[0.06] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Notification Engine</h2>
          <p className="text-sm text-slate-400">
            Local reminders, due tasks, notification events, and startup briefing
          </p>
        </div>
        <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
          v3.5
        </span>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="grid gap-2">
          <input
            value={reminderTitle}
            onChange={(event) => setReminderTitle(event.target.value)}
            placeholder="Reminder title..."
            className="w-full rounded-2xl border border-cyan-400/20 bg-black/40 px-4 py-3 text-sm text-slate-100 outline-none ring-cyan-400/30 placeholder:text-slate-500 focus:ring-2"
          />
          <input
            value={reminderDueAt}
            onChange={(event) => setReminderDueAt(event.target.value)}
            placeholder="tomorrow, 30 minutes, 2 hours, or ISO date..."
            className="w-full rounded-2xl border border-cyan-400/20 bg-black/40 px-4 py-3 text-sm text-slate-100 outline-none ring-cyan-400/30 placeholder:text-slate-500 focus:ring-2"
          />
          <button
            onClick={createReminder}
            disabled={loading}
            className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Reminder"}
          </button>
        </div>

        <button
          onClick={generateStartupBriefing}
          className="w-full rounded-2xl border border-violet-400/30 px-4 py-3 text-sm font-bold text-violet-200 transition hover:bg-violet-500/10"
        >
          Generate Startup Briefing
        </button>

        {message && (
          <p className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
            {message}
          </p>
        )}

        {startupBriefing && (
          <details className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-cyan-200">
              Startup Briefing
            </summary>
            <pre className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">
              {startupBriefing.briefing}
            </pre>
          </details>
        )}

        <div className="max-h-80 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Reminders</p>
            <span className="text-xs text-cyan-300">{reminders.length}</span>
          </div>

          {reminders.length === 0 ? (
            <p className="text-sm text-slate-500">No reminders yet.</p>
          ) : (
            reminders.map((reminder) => (
              <div key={reminder.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-100">{reminder.title}</h3>
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
                      reminder.status === "due"
                        ? "border-red-400/30 text-red-200"
                        : reminder.status === "completed"
                          ? "border-emerald-400/30 text-emerald-200"
                          : "border-cyan-400/30 text-cyan-200"
                    }`}
                  >
                    {reminder.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Due: {reminder.due_at} | Priority: {reminder.priority}
                </p>
                {reminder.description && (
                  <p className="mt-2 text-xs leading-5 text-slate-400">{reminder.description}</p>
                )}
                {reminder.status !== "completed" && reminder.status !== "cancelled" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => updateReminderStatus(reminder.id, "completed")}
                      className="rounded-xl border border-emerald-400/30 px-3 py-2 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/10"
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => updateReminderStatus(reminder.id, "cancelled")}
                      className="rounded-xl border border-red-400/30 px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/10"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <details className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-cyan-200">
            Notification Events
          </summary>
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-sm text-slate-500">No notification events yet.</p>
            ) : (
              events.slice(0, 12).map((event) => (
                <div key={event.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{event.event_type}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">{event.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{event.created_at}</p>
                </div>
              ))
            )}
          </div>
        </details>
      </div>
    </GlassPanel>
  );
}

function DashboardIntelligencePanel({
  intelligence,
  loading,
  message,
  metricValue,
  scoreTone,
  refreshIntelligence,
}: {
  intelligence: DashboardIntelligence | null;
  loading: boolean;
  message: string;
  metricValue: (source: Record<string, unknown> | undefined, key: string, fallback?: string) => string;
  scoreTone: (score: number) => string;
  refreshIntelligence: () => void;
}) {
  return (
    <GlassPanel className="border-cyan-400/20 bg-white/[0.06] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Dashboard Intelligence</h2>
          <p className="text-sm text-slate-400">
            System scores, mission analytics, risk state, and readiness signals
          </p>
        </div>
        <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
          v3.5
        </span>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        <button
          onClick={refreshIntelligence}
          disabled={loading}
          className="w-full rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
        >
          {loading ? "Analyzing..." : "Refresh Intelligence"}
        </button>

        {message && (
          <p className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
            {message}
          </p>
        )}

        {!intelligence ? (
          <p className="text-sm text-slate-500">Dashboard intelligence has not loaded yet.</p>
        ) : (
          <>
            <div className={`rounded-2xl border p-4 ${scoreTone(intelligence.intelligence_score)}`}>
              <p className="text-xs uppercase tracking-[0.25em]">Intelligence Score</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <span className="text-5xl font-black">{intelligence.intelligence_score}</span>
                <span className="text-sm uppercase tracking-[0.25em]">
                  {intelligence.readiness_label}
                </span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/30">
                <div
                  className="h-full rounded-full bg-current"
                  style={{ width: `${intelligence.intelligence_score}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <IntelMetric label="Missions" value={metricValue(intelligence.mission_metrics, "total_missions")} />
              <IntelMetric label="Mission Runs" value={metricValue(intelligence.mission_metrics, "mission_runs")} />
              <IntelMetric label="Workspaces" value={metricValue(intelligence.workspace_metrics, "total_workspaces")} />
              <IntelMetric label="Knowledge Docs" value={metricValue(intelligence.memory_metrics, "knowledge_documents")} />
              <IntelMetric label="Vectors" value={metricValue(intelligence.memory_metrics, "vector_items")} />
              <IntelMetric label="Pending Approvals" value={metricValue(intelligence.risk_metrics, "pending_approvals")} />
              <IntelMetric label="Total Reminders" value={metricValue(intelligence.notification_metrics, "total_reminders")} />
              <IntelMetric label="Due Reminders" value={metricValue(intelligence.notification_metrics, "due_reminders")} />
              <IntelMetric label="Safety Level" value={intelligence.user_settings?.safety_level || "strict"} />
              <IntelMetric label="Voice Mode" value={intelligence.user_settings?.voice_mode || "text_first"} />
              <IntelMetric label="Plugins" value={metricValue(intelligence.plugin_metrics, "total_plugins")} />
              <IntelMetric label="Enabled Plugins" value={metricValue(intelligence.plugin_metrics, "enabled_plugins")} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Recommendations</p>
              <div className="mt-3 space-y-2">
                {intelligence.recommendations.map((item) => (
                  <p
                    key={item}
                    className="rounded-xl border border-white/10 bg-black/30 p-2 text-xs leading-5 text-slate-300"
                  >
                    {item}
                  </p>
                ))}
              </div>
            </div>

            <details className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-cyan-200">
                Full Intelligence Report
              </summary>
              <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">
                {intelligence.report}
              </pre>
            </details>
          </>
        )}
      </div>
    </GlassPanel>
  );
}

function IntelMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-100">{value}</p>
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
          v3.5
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
