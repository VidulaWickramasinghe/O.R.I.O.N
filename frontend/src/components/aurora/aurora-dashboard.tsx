import {
  Brain,
  Briefcase,
  FolderPlus,
  MessageSquarePlus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react";

import { AuroraCard } from "./aurora-card";
import { AuroraStatusPill } from "./aurora-status-pill";
import {
  ActivityEvent,
  DashboardWidgetConfig,
  ProjectItem,
  Status,
  WorkspaceItem,
} from "./aurora-types";

type AuroraDashboardProps = {
  status: Status | null;
  projects: ProjectItem[];
  workspaces: WorkspaceItem[];
  activity: ActivityEvent[];
  dashboardWidgets: DashboardWidgetConfig[];
  setDashboardWidgets: (widgets: DashboardWidgetConfig[]) => void;
  onQuickAction: (message: string) => void;
};

export function AuroraDashboard({
  status,
  projects,
  workspaces,
  activity,
  dashboardWidgets,
  setDashboardWidgets,
  onQuickAction,
}: AuroraDashboardProps) {
  const widgetEnabled = (id: DashboardWidgetConfig["id"]) =>
    dashboardWidgets.find((widget) => widget.id === id)?.enabled ?? true;

  function toggleWidget(id: DashboardWidgetConfig["id"]) {
    setDashboardWidgets(
      dashboardWidgets.map((widget) =>
        widget.id === id ? { ...widget, enabled: !widget.enabled } : widget
      )
    );
  }

  const quickActions = [
    {
      label: "New Chat",
      icon: MessageSquarePlus,
      prompt: "Start a new O.R.I.O.N. planning session.",
    },
    {
      label: "Start Mission",
      icon: Sparkles,
      prompt: "Create a mission for improving O.R.I.O.N. Aurora OS.",
    },
    {
      label: "New Project",
      icon: FolderPlus,
      prompt: "Register a new project in O.R.I.O.N.",
    },
    {
      label: "Search Memory",
      icon: Search,
      prompt: "Search persistent memory for O.R.I.O.N.",
    },
    {
      label: "Upload Files",
      icon: Upload,
      prompt: "Prepare a local knowledge base import plan.",
    },
  ];

  return (
    <div className="space-y-6">
      <AuroraCard className="p-4">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <SlidersHorizontal size={18} className="text-cyan-300" />
              Dashboard Filters
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Customise which Aurora OS dashboard widgets are visible.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {dashboardWidgets.map((widget) => (
              <button
                key={widget.id}
                onClick={() => toggleWidget(widget.id)}
                className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
                  widget.enabled
                    ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                    : "border-white/10 bg-white/[0.04] text-slate-500"
                }`}
              >
                {widget.label}
              </button>
            ))}
          </div>
        </div>
      </AuroraCard>

      {widgetEnabled("hero") && (
        <AuroraCard className="overflow-hidden p-8">
          <div className="grid gap-8 xl:grid-cols-[1.25fr_0.75fr]">
            <div>
              <div className="flex flex-wrap gap-3">
                <AuroraStatusPill tone="green">System Online</AuroraStatusPill>
                <AuroraStatusPill tone="cyan">Aurora OS v2.6.1</AuroraStatusPill>
              </div>

              <p className="mt-8 text-sm uppercase tracking-[0.45em] text-cyan-300">
                Operational Response and Intelligent Orchestration Network
              </p>

              <h1 className="mt-5 max-w-3xl text-5xl font-black leading-tight text-white lg:text-6xl">
                Good Evening, Wichel. O.R.I.O.N. is ready.
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-400">
                Your AI-native command workspace for thinking, planning, acting,
                learning, project orchestration, memory, tools, agents, and
                development workflows.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard label="System Health" value="94%" />
              <MetricCard label="Memory" value="87%" />
              <MetricCard label="Projects" value={String(projects.length)} />
              <MetricCard label="Workspaces" value={String(workspaces.length)} />
            </div>
          </div>
        </AuroraCard>
      )}

      {(widgetEnabled("quickActions") || widgetEnabled("models")) && (
        <div className="grid gap-6 xl:grid-cols-[1fr_0.55fr]">
          {widgetEnabled("quickActions") && (
            <AuroraCard className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Quick Actions</h2>
                  <p className="text-sm text-slate-400">
                    Start common O.R.I.O.N. workflows.
                  </p>
                </div>
                <Zap className="text-amber-300" size={22} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {quickActions.map((action) => {
                  const Icon = action.icon;

                  return (
                    <button
                      key={action.label}
                      onClick={() => onQuickAction(action.prompt)}
                      className="group rounded-3xl border border-white/10 bg-black/25 p-5 text-left transition hover:border-cyan-400/40 hover:bg-cyan-400/10"
                    >
                      <Icon className="text-cyan-300" size={24} />
                      <p className="mt-6 font-bold text-white">{action.label}</p>
                      <p className="mt-4 text-slate-500 transition group-hover:text-cyan-300">
                        →
                      </p>
                    </button>
                  );
                })}
              </div>
            </AuroraCard>
          )}

          {widgetEnabled("models") && (
            <AuroraCard className="p-6">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-white">
                <Brain size={20} className="text-cyan-300" />
                Models
              </h2>

              <div className="space-y-3">
                {["GPT-5.5", "Claude", "Gemini"].map((model) => (
                  <div
                    key={model}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-4 py-4"
                  >
                    <span className="text-slate-200">{model}</span>
                    <AuroraStatusPill tone="green">Online</AuroraStatusPill>
                  </div>
                ))}
              </div>
            </AuroraCard>
          )}
        </div>
      )}

      {widgetEnabled("recentActivity") && (
        <AuroraCard className="p-6">
          <h2 className="mb-4 text-xl font-bold text-white">Recent Activity</h2>

          <div className="grid gap-3">
            {activity.slice(0, 6).length === 0 ? (
              <p className="text-sm text-slate-500">No recent activity yet.</p>
            ) : (
              activity.slice(0, 6).map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-white/10 bg-black/25 p-4"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                    {event.type}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">{event.message}</p>
                </div>
              ))
            )}
          </div>
        </AuroraCard>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}
