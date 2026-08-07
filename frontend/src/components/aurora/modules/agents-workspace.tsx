"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  BrainCircuit,
  CheckCircle2,
  FileText,
  GitBranch,
  RefreshCw,
  ShieldCheck,
  Workflow,
} from "lucide-react";

import { GlassPanel } from "@/components/aurora/glass-panel";
import { StatusChip } from "@/components/aurora/status-chip";
import { apiGet } from "@/lib/api/client";
import { getSystemStatus } from "@/lib/api/status";

type SystemSnapshot = Record<string, unknown> & {
  status?: string;
  version?: string;
  modules?: unknown[];
};

type MissionItem = {
  id?: number | string;
  title?: string;
  name?: string;
  status?: string;
  goal?: string;
  current_step?: string;
  updated_at?: string;
  created_at?: string;
};

type MissionRunItem = {
  id?: number | string;
  mission_id?: number | string;
  mission_title?: string;
  status?: string;
  step_title?: string;
  created_at?: string;
  completed_at?: string;
};

type ApprovalItem = {
  id?: number | string;
  title?: string;
  status?: string;
  action_type?: string;
  risk_level?: string;
  created_at?: string;
};

type IntelligenceSnapshot = Record<string, unknown> & {
  intelligence_score?: number;
  readiness_label?: string;
  recommendations?: string[];
  mission_metrics?: Record<string, unknown>;
  risk_metrics?: Record<string, unknown>;
};

type SourceState = {
  status: boolean;
  missions: boolean;
  runs: boolean;
  approvals: boolean;
  intelligence: boolean;
};

type Tone = "primary" | "secondary" | "success" | "warning" | "danger" | "muted";

function text(value: unknown, fallback = "Unavailable") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function listFrom<T>(value: unknown, keys: string[]): T[] {
  if (Array.isArray(value)) return value as T[];

  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;

    for (const key of keys) {
      if (Array.isArray(object[key])) return object[key] as T[];
    }
  }

  return [];
}

function toneForStatus(status: unknown): Tone {
  const normalized = text(status, "").toLowerCase();

  if (
    normalized.includes("ready") ||
    normalized.includes("online") ||
    normalized.includes("available") ||
    normalized.includes("complete") ||
    normalized.includes("success")
  ) {
    return "success";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("waiting") ||
    normalized.includes("review")
  ) {
    return "warning";
  }

  if (
    normalized.includes("error") ||
    normalized.includes("failed") ||
    normalized.includes("blocked")
  ) {
    return "danger";
  }

  if (normalized.includes("not reported") || normalized.includes("unchecked")) {
    return "muted";
  }

  return "primary";
}

function isActiveMission(item: MissionItem) {
  const status = text(item.status, "").toLowerCase();

  return ["active", "running", "in_progress", "pending", "queued"].some((value) =>
    status.includes(value),
  );
}

function isPendingApproval(item: ApprovalItem) {
  return text(item.status, "").toLowerCase().includes("pending");
}

export function AgentsLiveWorkspace() {
  const [system, setSystem] = useState<SystemSnapshot | null>(null);
  const [missions, setMissions] = useState<MissionItem[]>([]);
  const [runs, setRuns] = useState<MissionRunItem[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [intelligence, setIntelligence] = useState<IntelligenceSnapshot | null>(null);
  const [sources, setSources] = useState<SourceState>({
    status: false,
    missions: false,
    runs: false,
    approvals: false,
    intelligence: false,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState("");

  const loadAgentSources = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const [statusResult, missionsResult, runsResult, approvalsResult, intelligenceResult] =
      await Promise.allSettled([
        getSystemStatus(),
        apiGet<unknown>("/api/missions"),
        apiGet<unknown>("/api/mission-runs"),
        apiGet<unknown>("/api/approvals"),
        apiGet<unknown>("/api/dashboard/intelligence"),
      ]);

    setSources({
      status: statusResult.status === "fulfilled",
      missions: missionsResult.status === "fulfilled",
      runs: runsResult.status === "fulfilled",
      approvals: approvalsResult.status === "fulfilled",
      intelligence: intelligenceResult.status === "fulfilled",
    });

    if (statusResult.status === "fulfilled") {
      setSystem(statusResult.value as SystemSnapshot);
    } else {
      setSystem(null);
    }

    if (missionsResult.status === "fulfilled") {
      setMissions(
        listFrom<MissionItem>(missionsResult.value, ["missions", "items", "results"]),
      );
    } else {
      setMissions([]);
    }

    if (runsResult.status === "fulfilled") {
      setRuns(listFrom<MissionRunItem>(runsResult.value, ["runs", "items", "results"]));
    } else {
      setRuns([]);
    }

    if (approvalsResult.status === "fulfilled") {
      setApprovals(
        listFrom<ApprovalItem>(approvalsResult.value, ["approvals", "items", "results"]),
      );
    } else {
      setApprovals([]);
    }

    if (intelligenceResult.status === "fulfilled") {
      setIntelligence(intelligenceResult.value as IntelligenceSnapshot);
    } else {
      setIntelligence(null);
    }

    const failures = [
      statusResult,
      missionsResult,
      runsResult,
      approvalsResult,
      intelligenceResult,
    ].filter((result) => result.status === "rejected").length;

    if (failures === 5) {
      setMessage("Agent capability sources failed to load. Confirm the backend is running.");
    } else if (failures > 0) {
      setMessage(
        `${failures} live source${failures === 1 ? "" : "s"} unavailable. Loaded sources are shown without substitute data.`,
      );
    }

    setLastLoadedAt(
      new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAgentSources();
  }, [loadAgentSources]);

  const modules = useMemo(
    () =>
      Array.isArray(system?.modules)
        ? system.modules.map((item) => text(item, "")).filter(Boolean)
        : [],
    [system],
  );

  const pendingApprovals = useMemo(
    () => approvals.filter((item) => isPendingApproval(item)),
    [approvals],
  );

  const activeMissions = useMemo(
    () => missions.filter((item) => isActiveMission(item)),
    [missions],
  );

  const developerAgentReported = modules.some((module) => {
    const lower = module.toLowerCase();
    return lower.includes("developer") || lower.includes("agentic");
  });

  const capabilityCards = useMemo(
    () => [
      {
        id: "assistant-core",
        name: "Assistant Core",
        role: "Chat + reasoning interface",
        status: sources.status ? "Available" : "Unchecked",
        detail: sources.status
          ? `Backend ${text(system?.status, "responded")} · v${text(system?.version, "unknown")}`
          : "No /api/status response loaded.",
      },
      {
        id: "mission-planner",
        name: "Mission Planner",
        role: "Mission records and safe planning",
        status: sources.missions ? "Available" : "Unchecked",
        detail: sources.missions
          ? `${missions.length} mission records · ${activeMissions.length} active/queued`
          : "No /api/missions response loaded.",
      },
      {
        id: "mission-runner",
        name: "Mission Runner",
        role: "Controlled mission execution history",
        status: sources.runs ? "Available" : "Unchecked",
        detail: sources.runs
          ? `${runs.length} mission run records returned`
          : "No /api/mission-runs response loaded.",
      },
      {
        id: "approval-guardian",
        name: "Approval Guardian",
        role: "Human approval boundary",
        status: pendingApprovals.length > 0 ? "Waiting Review" : sources.approvals ? "Available" : "Unchecked",
        detail: sources.approvals
          ? `${pendingApprovals.length} pending approvals · ${approvals.length} total loaded`
          : "No /api/approvals response loaded.",
      },
      {
        id: "developer-agent",
        name: "Developer Agent Mode",
        role: "Workspace inspection and patch planning",
        status: developerAgentReported ? "Reported" : "Not Reported",
        detail: developerAgentReported
          ? "Developer/agentic module appears in backend status modules."
          : "No developer-agent module name reported in /api/status modules.",
      },
      {
        id: "dashboard-intelligence",
        name: "Dashboard Intelligence",
        role: "System score and recommendations",
        status: sources.intelligence ? "Available" : "Unchecked",
        detail: sources.intelligence
          ? `Score ${text(intelligence?.intelligence_score, "unavailable")} · ${text(intelligence?.readiness_label, "no label")}`
          : "No /api/dashboard/intelligence response loaded.",
      },
    ],
    [
      activeMissions.length,
      approvals.length,
      developerAgentReported,
      intelligence,
      missions.length,
      pendingApprovals.length,
      runs.length,
      sources,
      system,
    ],
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <header className="rounded-3xl border border-cyan-300/15 bg-black/25 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
              Live agent capability centre
            </p>

            <h1 className="mt-2 text-3xl font-semibold text-white">
              Agent readiness from backend state
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Inspect agent-related capability state from live backend status,
              missions, mission runs, approvals, and dashboard intelligence.
              Static fake CPU, memory, token, runtime, and progress metrics are
              not used on this route.
            </p>
          </div>

          <button
            onClick={() => void loadAgentSources()}
            disabled={loading}
            className="rounded-xl border border-cyan-400/30 px-4 py-3 text-xs font-bold text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-60"
          >
            <RefreshCw className="inline" size={15} />{" "}
            {loading ? "Refreshing..." : "Refresh agent state"}
          </button>
        </div>
      </header>

      {message && (
        <p
          role="alert"
          className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-4 text-sm leading-6 text-yellow-100"
        >
          {message}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Backend"
          value={sources.status ? text(system?.status, "Available") : "Unchecked"}
          detail={sources.status ? `Version ${text(system?.version, "unknown")}` : "No status source"}
        />

        <MetricCard
          label="Missions"
          value={String(missions.length)}
          detail={`${activeMissions.length} active or queued`}
        />

        <MetricCard
          label="Mission runs"
          value={String(runs.length)}
          detail="Loaded from /api/mission-runs"
        />

        <MetricCard
          label="Pending approvals"
          value={String(pendingApprovals.length)}
          detail="Loaded from /api/approvals"
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-5">
          <GlassPanel className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                  <Bot size={18} className="text-cyan-300" />
                  Agent capability map
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Availability is derived from live backend endpoints, not local fake agent data.
                </p>
              </div>

              <StatusChip tone="primary">{capabilityCards.length} capabilities</StatusChip>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {capabilityCards.map((capability) => (
                <article
                  key={capability.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-white">{capability.name}</h3>
                      <p className="mt-1 text-xs text-slate-500">{capability.role}</p>
                    </div>

                    <StatusChip tone={toneForStatus(capability.status)}>
                      {capability.status}
                    </StatusChip>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    {capability.detail}
                  </p>
                </article>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Workflow size={18} className="text-violet-300" />
              Mission context for agents
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Current mission records and latest run history.
            </p>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <section>
                <h3 className="text-sm font-bold text-cyan-100">Active / queued missions</h3>

                <div className="mt-3 space-y-2">
                  {activeMissions.length === 0 ? (
                    <p className="rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-slate-500">
                      No active or queued mission records returned.
                    </p>
                  ) : (
                    activeMissions.slice(0, 6).map((mission, index) => (
                      <div
                        key={`${mission.id || mission.title || index}`}
                        className="rounded-xl border border-white/10 bg-black/25 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-white">
                            {mission.title || mission.name || `Mission ${text(mission.id, String(index + 1))}`}
                          </p>
                          <StatusChip tone={toneForStatus(mission.status)}>
                            {text(mission.status, "unknown")}
                          </StatusChip>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          {mission.goal || mission.current_step || "No mission detail reported."}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-violet-100">Latest mission runs</h3>

                <div className="mt-3 space-y-2">
                  {runs.length === 0 ? (
                    <p className="rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-slate-500">
                      No mission run records returned.
                    </p>
                  ) : (
                    runs.slice(0, 6).map((run, index) => (
                      <div
                        key={`${run.id || run.mission_id || index}`}
                        className="rounded-xl border border-white/10 bg-black/25 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-white">
                            {run.mission_title || `Mission ${text(run.mission_id, "unknown")}`}
                          </p>
                          <StatusChip tone={toneForStatus(run.status)}>
                            {text(run.status, "unknown")}
                          </StatusChip>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          {run.step_title || run.created_at || "No run detail reported."}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </GlassPanel>
        </div>

        <aside className="space-y-5">
          <GlassPanel className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <BrainCircuit size={18} className="text-cyan-300" />
              Live source status
            </h2>

            <div className="mt-4 space-y-2">
              <SourceRow label="/api/status" ok={sources.status} />
              <SourceRow label="/api/missions" ok={sources.missions} />
              <SourceRow label="/api/mission-runs" ok={sources.runs} />
              <SourceRow label="/api/approvals" ok={sources.approvals} />
              <SourceRow label="/api/dashboard/intelligence" ok={sources.intelligence} />
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              Last refresh: {lastLoadedAt || "Unchecked"}
            </p>
          </GlassPanel>

          <GlassPanel className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <FileText size={18} className="text-violet-300" />
              Recommendations
            </h2>

            {Array.isArray(intelligence?.recommendations) &&
            intelligence.recommendations.length > 0 ? (
              <div className="mt-4 space-y-2">
                {intelligence.recommendations.slice(0, 5).map((item, index) => (
                  <p
                    key={`${item}-${index}`}
                    className="rounded-xl border border-white/10 bg-black/25 p-3 text-xs leading-5 text-slate-300"
                  >
                    {item}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                No dashboard intelligence recommendations returned.
              </p>
            )}
          </GlassPanel>

          <GlassPanel className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <ShieldCheck size={18} className="text-emerald-300" />
              Agent safety boundary
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              This page is read-only. It does not start, pause, restart, deploy,
              or simulate agents. Mission execution remains inside the existing
              Missions and Tools approval flow.
            </p>

            <div className="mt-4 grid gap-2">
              <Link
                href="/missions"
                className="rounded-xl border border-violet-400/30 px-3 py-2 text-center text-xs font-bold text-violet-200 hover:bg-violet-500/10"
              >
                <Workflow className="inline" size={14} /> Open Missions
              </Link>

              <Link
                href="/tools"
                className="rounded-xl border border-cyan-400/30 px-3 py-2 text-center text-xs font-bold text-cyan-200 hover:bg-cyan-500/10"
              >
                <ShieldCheck className="inline" size={14} /> Open Tool Approvals
              </Link>

              <Link
                href="/workspaces"
                className="rounded-xl border border-emerald-400/30 px-3 py-2 text-center text-xs font-bold text-emerald-200 hover:bg-emerald-500/10"
              >
                <GitBranch className="inline" size={14} /> Open Workspaces
              </Link>
            </div>
          </GlassPanel>
        </aside>
      </div>
    </div>
  );
}

function SourceRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 p-3">
      <span className="break-all text-xs text-slate-400">{label}</span>
      <StatusChip tone={ok ? "success" : "muted"}>
        {ok ? (
          <>
            <CheckCircle2 size={13} /> Loaded
          </>
        ) : (
          "Unavailable"
        )}
      </StatusChip>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 break-words text-2xl font-black text-cyan-100">
        {value}
      </p>
      <p className="mt-2 break-words text-xs leading-5 text-slate-500">
        {detail}
      </p>
    </div>
  );
}
