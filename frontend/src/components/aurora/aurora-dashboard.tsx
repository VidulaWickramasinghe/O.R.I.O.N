import type { ElementType } from "react";
import {
  Activity,
  Bot,
  Brain,
  CheckCircle2,
  CircleDot,
  Clock3,
  Database,
  FolderKanban,
  FolderPlus,
  Gauge,
  MessageSquarePlus,
  Orbit,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Workflow,
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

const modelRoster = [
  { name: "GPT-5.5", status: "Ready", tone: "text-emerald-300" },
  { name: "Claude 3.5 Opus", status: "Ready", tone: "text-emerald-300" },
  { name: "Gemini 1.5 Pro", status: "Ready", tone: "text-emerald-300" },
  { name: "Llama 3 70B", status: "Idle", tone: "text-slate-400" },
  { name: "Mistral Large 2", status: "Idle", tone: "text-slate-400" },
];

const agentRoster = [
  { name: "Planner Agent", detail: "Planning & orchestration", score: "92%" },
  { name: "Research Agent", detail: "Web research & analysis", score: "76%" },
  { name: "Code Agent", detail: "Code generation", score: "88%" },
  { name: "Test Agent", detail: "Testing & validation", score: "65%" },
];

const timelineSteps = [
  "User Request",
  "Planner",
  "Memory Search",
  "Research Agent",
  "Reasoning",
  "Code Generation",
  "Testing",
  "Documentation",
  "Deployment",
];

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

  const apiOnline = status?.status === "online";
  const projectCount = projects.length;
  const workspaceCount = workspaces.length;
  const activityCount = activity.length;

  const quickActions = [
    {
      label: "New Chat",
      description: "Start a conversation",
      icon: MessageSquarePlus,
      prompt: "Start a new O.R.I.O.N. planning session.",
    },
    {
      label: "Launch Agent",
      description: "Deploy an AI agent",
      icon: Sparkles,
      prompt: "Create a mission for improving O.R.I.O.N. Aurora OS.",
    },
    {
      label: "New Project",
      description: "Create a new project",
      icon: FolderPlus,
      prompt: "Register a new project in O.R.I.O.N.",
    },
    {
      label: "Search Memory",
      description: "Find anything",
      icon: Search,
      prompt: "Search persistent memory for O.R.I.O.N.",
    },
    {
      label: "Upload Files",
      description: "Import documents",
      icon: Upload,
      prompt: "Prepare a local knowledge base import plan.",
    },
    {
      label: "Start Workflow",
      description: "Run an automation",
      icon: Workflow,
      prompt: "Start a workflow for the current Aurora workspace.",
    },
  ];

  return (
    <div className="space-y-4 2xl:space-y-5">
      <AuroraCard className="border-cyan-400/10 bg-[#06101f]/80 p-4">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.28em] text-cyan-100">
              <SlidersHorizontal size={16} className="text-cyan-300" />
              Adaptive Dashboard Controls
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Toggle Aurora widgets to create a command-center layout that matches your mission.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {dashboardWidgets.map((widget) => (
              <button
                key={widget.id}
                onClick={() => toggleWidget(widget.id)}
                className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
                  widget.enabled
                    ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100 shadow-lg shadow-cyan-500/10"
                    : "border-white/10 bg-white/[0.035] text-slate-500 hover:text-slate-300"
                }`}
              >
                {widget.label}
              </button>
            ))}
          </div>
        </div>
      </AuroraCard>

      {widgetEnabled("metrics") && (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
          <MetricTile
            title="System Health"
            value={apiOnline ? "98.7%" : "--"}
            detail={apiOnline ? "Optimal" : "Offline"}
            icon={Activity}
            variant="wave"
          />
          <MetricTile
            title="Models Online"
            value="6 / 8"
            detail="Ready capacity"
            icon={Brain}
            variant="ring"
          />
          <MetricTile
            title="Active Projects"
            value={String(projectCount || 12)}
            detail="+2 today"
            icon={FolderKanban}
          />
          <MetricTile
            title="Running Agents"
            value={String(Math.max(activityCount, 24))}
            detail="+5 active"
            icon={Bot}
          />
          <MetricTile
            title="Memory Capacity"
            value="73%"
            detail="233 GB / 320 GB"
            icon={Database}
            variant="donut"
          />
          <MetricTile
            title="AI Confidence"
            value="96.4%"
            detail="High"
            icon={Gauge}
            variant="bars"
          />
        </section>
      )}

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          {widgetEnabled("hero") && (
            <AuroraCard className="relative overflow-hidden border-cyan-400/15 bg-[#06101f]/90 p-6 xl:p-7">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(59,130,246,0.16),transparent_36%),linear-gradient(180deg,rgba(14,165,233,0.08),transparent_55%)]" />
              <div className="relative">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-black text-white xl:text-3xl">
                      Good Evening, Alex
                    </h1>
                    <p className="mt-2 text-base text-slate-400">
                      Welcome back to O.R.I.O.N.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <AuroraStatusPill tone={apiOnline ? "green" : "red"}>
                      {apiOnline ? "System Online" : "System Offline"}
                    </AuroraStatusPill>
                    <AuroraStatusPill tone="cyan">Aurora OS v2.8</AuroraStatusPill>
                  </div>
                </div>

                <div className="mt-7 flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400">
                    System Overview
                  </p>
                  <div className="hidden gap-2 sm:flex">
                    {["1H", "6H", "24H", "7D", "30D"].map((range) => (
                      <span
                        key={range}
                        className={`rounded-lg border px-3 py-1 text-xs font-bold ${
                          range === "24H"
                            ? "border-cyan-400/40 bg-cyan-400/20 text-cyan-100"
                            : "border-white/10 bg-white/[0.04] text-slate-500"
                        }`}
                      >
                        {range}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="aurora-wave-field mt-5 h-48 rounded-3xl border border-cyan-400/10 bg-black/20" />

                <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                  <HeroStat label="Tasks Completed" value="1,482" />
                  <HeroStat label="Time Saved" value="248h" />
                  <HeroStat label="Success Rate" value="98.7%" />
                  <HeroStat label="Active Agents" value="24" />
                  <HeroStat label="Data Processed" value="12.4 TB" />
                  <HeroStat label="Est. Cost Saved" value="$12.47" />
                </div>
              </div>
            </AuroraCard>
          )}

          {widgetEnabled("quickActions") && (
            <AuroraCard className="border-cyan-400/10 bg-[#06101f]/85 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400">
                  Quick Actions
                </p>
                <Zap className="text-cyan-300" size={17} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
                {quickActions.map((action) => {
                  const Icon = action.icon;

                  return (
                    <button
                      key={action.label}
                      onClick={() => onQuickAction(action.prompt)}
                      className="group rounded-2xl border border-cyan-400/10 bg-cyan-950/20 p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-cyan-400/10 hover:shadow-xl hover:shadow-cyan-500/10"
                    >
                      <Icon className="text-cyan-300" size={22} />
                      <p className="mt-4 font-bold text-white">{action.label}</p>
                      <p className="mt-1 text-xs text-slate-500 group-hover:text-cyan-200">
                        {action.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </AuroraCard>
          )}

          <div className="grid gap-4 xl:grid-cols-[1fr_0.78fr]">
            <ProjectMatrix projects={projects} />
            <AgentMatrix />
          </div>

          {widgetEnabled("recentActivity") && (
            <div className="grid gap-4 xl:grid-cols-[1fr_0.68fr]">
              <ActivityFeed activity={activity} />
              <WorkflowStatus />
            </div>
          )}
        </div>

        <div className="space-y-4">
          {widgetEnabled("recentActivity") && <AuroraTimeline activity={activity} />}
          {widgetEnabled("models") && <ModelPanel />}
          <ResourcePanel workspaceCount={workspaceCount} />
        </div>
      </div>
    </div>
  );
}

function MetricTile({
  title,
  value,
  detail,
  icon: Icon,
  variant = "spark",
}: {
  title: string;
  value: string;
  detail: string;
  icon: ElementType;
  variant?: "spark" | "wave" | "ring" | "donut" | "bars";
}) {
  return (
    <AuroraCard className="relative min-h-[132px] overflow-hidden border-cyan-400/10 bg-[#06101f]/85 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.13),transparent_42%)]" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-300">{title}</p>
          <p className="mt-3 text-2xl font-black text-white">{value}</p>
          <p className="mt-3 text-xs font-semibold text-emerald-300">{detail}</p>
        </div>
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-200">
          <Icon size={17} />
        </div>
      </div>
      <MetricVisual variant={variant} />
    </AuroraCard>
  );
}

function MetricVisual({ variant }: { variant: "spark" | "wave" | "ring" | "donut" | "bars" }) {
  if (variant === "ring" || variant === "donut") {
    return (
      <div className="absolute bottom-4 right-4 h-14 w-14 rounded-full border-[7px] border-cyan-400/20 border-t-cyan-300 border-r-violet-400" />
    );
  }

  if (variant === "bars") {
    return (
      <div className="absolute bottom-4 right-4 flex h-12 items-end gap-1">
        {[18, 24, 14, 31, 22, 36, 28, 44].map((height, index) => (
          <span
            key={`${height}-${index}`}
            className="w-1.5 rounded-full bg-gradient-to-t from-violet-500 to-cyan-300"
            style={{ height }}
          />
        ))}
      </div>
    );
  }

  return <div className="aurora-mini-wave absolute bottom-4 left-4 right-4 h-9" />;
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
      <p className="text-lg font-black text-cyan-100">{value}</p>
      <p className="mt-1 text-[11px] text-slate-500">{label}</p>
    </div>
  );
}

function ProjectMatrix({ projects }: { projects: ProjectItem[] }) {
  const projectCards =
    projects.length > 0
      ? projects.slice(0, 4)
      : [
          {
            key: "orion-ai",
            name: "Orion AI Platform",
            type: "Core AI Operating System",
            status: "active",
            description: "Command-center shell",
          },
          {
            key: "nebula",
            name: "Nebula Analytics",
            type: "AI Data Analytics Platform",
            status: "active",
            description: "Signal intelligence",
          },
          {
            key: "sentinel",
            name: "Sentinel Security",
            type: "AI Security & Monitoring",
            status: "active",
            description: "Protection layer",
          },
          {
            key: "vector",
            name: "VectorDB Engine",
            type: "Vector Database Engine",
            status: "active",
            description: "Memory index",
          },
        ];

  return (
    <AuroraCard className="border-cyan-400/10 bg-[#06101f]/85 p-4">
      <PanelHeader title="Active Projects" action="View All" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {projectCards.map((project, index) => (
          <div
            key={project.key}
            className="rounded-2xl border border-cyan-400/10 bg-black/20 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-300">
                <FolderKanban size={16} />
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold text-white">{project.name}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{project.type}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>Progress</span>
              <span>{[78, 45, 62, 30][index] ?? 58}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                style={{ width: `${[78, 45, 62, 30][index] ?? 58}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </AuroraCard>
  );
}

function AgentMatrix() {
  return (
    <AuroraCard className="border-cyan-400/10 bg-[#06101f]/85 p-4">
      <PanelHeader title="Active Agents" action="View All" />
      <div className="mt-4 space-y-3">
        {agentRoster.map((agent) => (
          <div
            key={agent.name}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-3"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-300">
                <Bot size={15} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{agent.name}</p>
                <p className="text-xs text-slate-500">{agent.detail}</p>
              </div>
            </div>
            <span className="rounded-full border border-emerald-400/30 px-2 py-1 text-xs font-bold text-emerald-300">
              {agent.score}
            </span>
          </div>
        ))}
      </div>
    </AuroraCard>
  );
}

function ActivityFeed({ activity }: { activity: ActivityEvent[] }) {
  const feed = activity.slice(0, 6);

  return (
    <AuroraCard className="border-cyan-400/10 bg-[#06101f]/85 p-4">
      <PanelHeader title="Live Activity Feed" action="View All" />
      <div className="mt-4 space-y-3">
        {feed.length === 0 ? (
          <p className="text-sm text-slate-500">No recent activity yet.</p>
        ) : (
          feed.map((event) => (
            <div key={event.id} className="flex gap-3 text-sm">
              <CircleDot size={15} className="mt-1 text-cyan-300" />
              <div>
                <p className="text-slate-200">{event.message}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {event.source} · {event.type}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </AuroraCard>
  );
}

function WorkflowStatus() {
  return (
    <AuroraCard className="border-cyan-400/10 bg-[#06101f]/85 p-4">
      <PanelHeader title="Workflow Status" action="View All" />
      <div className="mt-5 flex items-center justify-center gap-5">
        <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-[18px] border-blue-500/80 border-r-cyan-300 border-b-amber-300">
          <div className="text-center">
            <p className="text-3xl font-black text-white">8</p>
            <p className="text-xs text-slate-500">Running</p>
          </div>
        </div>
        <div className="space-y-3 text-xs text-slate-400">
          <Legend color="bg-cyan-300" label="Running" value="8 (52%)" />
          <Legend color="bg-blue-400" label="Paused" value="3 (20%)" />
          <Legend color="bg-emerald-300" label="Completed" value="7 (23%)" />
          <Legend color="bg-pink-400" label="Failed" value="1 (5%)" />
        </div>
      </div>
    </AuroraCard>
  );
}

function AuroraTimeline({ activity }: { activity: ActivityEvent[] }) {
  return (
    <AuroraCard className="relative overflow-hidden border-cyan-400/10 bg-[#06101f]/85 p-5">
      <div className="pointer-events-none absolute bottom-4 left-5 top-14 w-px bg-cyan-400/30" />
      <PanelHeader title="Aurora Timeline" />
      <div className="mt-5 space-y-4">
        {timelineSteps.map((step, index) => (
          <div key={step} className="relative flex items-center justify-between gap-3 pl-7">
            <span className="absolute left-0 flex h-4 w-4 items-center justify-center rounded-full border border-cyan-300 bg-cyan-950 text-[8px] text-cyan-100">
              {index + 1}
            </span>
            <span className="text-sm text-slate-200">{step}</span>
            <span className="text-xs text-slate-500">
              {activity[index]?.timestamp?.slice(11, 19) || `08:4${index}:02 PM`}
            </span>
          </div>
        ))}
        <div className="relative flex items-center gap-3 pl-7 text-emerald-300">
          <CheckCircle2 className="absolute left-0" size={16} />
          <span className="text-sm font-bold">Completed</span>
        </div>
      </div>
    </AuroraCard>
  );
}

function ModelPanel() {
  return (
    <AuroraCard className="border-cyan-400/10 bg-[#06101f]/85 p-5">
      <PanelHeader title="AI Models" action="6 Online" />
      <div className="mt-4 space-y-3">
        {modelRoster.map((model) => (
          <div key={model.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-200">
              <Sparkles size={13} className="text-cyan-300" /> {model.name}
            </span>
            <span className={`text-xs font-bold ${model.tone}`}>{model.status}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-[96px_1fr] items-center gap-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border-[12px] border-blue-500/70 border-r-cyan-300 border-b-amber-300 text-center">
          <div>
            <p className="text-lg font-black text-white">2.4M</p>
            <p className="text-[10px] text-slate-500">tokens</p>
          </div>
        </div>
        <div className="space-y-2 text-xs text-slate-400">
          <Legend color="bg-blue-400" label="Input" value="1.2M" />
          <Legend color="bg-cyan-300" label="Output" value="1.0M" />
          <Legend color="bg-amber-300" label="Cache" value="0.2M" />
        </div>
      </div>
    </AuroraCard>
  );
}

function ResourcePanel({ workspaceCount }: { workspaceCount: number }) {
  const resources = [
    { label: "CPU", value: 14, color: "bg-cyan-300" },
    { label: "GPU", value: 38, color: "bg-emerald-300" },
    { label: "RAM", value: 62, color: "bg-violet-400" },
    { label: "DISK", value: 45, color: "bg-amber-300" },
    { label: "NETWORK", value: 73, color: "bg-sky-300" },
  ];

  return (
    <AuroraCard className="overflow-hidden border-cyan-400/10 bg-[#06101f]/85 p-5">
      <PanelHeader title="System Overview" />
      <div className="mt-4 space-y-4">
        {resources.map((resource) => (
          <div key={resource.label}>
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-300">{resource.label}</span>
              <span className="text-slate-400">{resource.value}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${resource.color}`}
                style={{ width: `${resource.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <MiniStatus icon={Clock3} label="Latency" value="412ms" />
        <MiniStatus icon={ShieldCheck} label="Workspace" value={`${workspaceCount || 1} active`} />
      </div>
      <div className="aurora-core-orb mt-6 flex h-56 items-center justify-center rounded-3xl border border-cyan-400/10 bg-black/25">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-cyan-300 bg-cyan-400/10 shadow-[0_0_42px_rgba(34,211,238,0.55)]">
          <Orbit className="text-cyan-100" size={42} />
        </div>
      </div>
    </AuroraCard>
  );
}

function PanelHeader({ title, action }: { title: string; action?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-xs font-black uppercase tracking-[0.25em] text-slate-300">
        {title}
      </h2>
      {action && <span className="text-xs font-bold text-cyan-300">{action}</span>}
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${color}`} /> {label}
      </span>
      <span>{value}</span>
    </div>
  );
}

function MiniStatus({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <Icon className="text-cyan-300" size={15} />
      <p className="mt-2 text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}
