"use client";

import { useMemo } from "react";
import {
  Activity,
  BrainCircuit,
  ShieldCheck,
  X,
} from "lucide-react";

import { GlassPanel } from "@/components/aurora/glass-panel";
import { StatusChip } from "@/components/aurora/status-chip";
import {
  useAuroraActivity,
  useAuroraApprovals,
  useAuroraMemory,
  useAuroraMissions,
} from "@/components/aurora/lib/aurora-queries";
import { useUiStore } from "@/store/ui-store";

type SourceState = {
  activity: boolean;
  approvals: boolean;
  missions: boolean;
  memory: boolean;
};

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

function text(value: unknown, fallback = "Unavailable") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export function ContextPanel() {
  const setContextOpen = useUiStore(
    (state) => state.setContextOpen,
  );
  const activityQuery = useAuroraActivity();
  const approvalsQuery = useAuroraApprovals();
  const missionsQuery = useAuroraMissions();
  const memoryQuery = useAuroraMemory();
  const activity = listFrom<Record<string, unknown>>(activityQuery.data, ["events"]);
  const approvals = listFrom<Record<string, unknown>>(approvalsQuery.data, ["approvals"]);
  const missions = listFrom<Record<string, unknown>>(missionsQuery.data, ["missions"]);
  const memory = listFrom<Record<string, unknown>>(memoryQuery.data, ["items"]);
  const sources: SourceState = {
    activity: activityQuery.data !== undefined && !activityQuery.isError,
    approvals: approvalsQuery.data !== undefined && !approvalsQuery.isError,
    missions: missionsQuery.data !== undefined && !missionsQuery.isError,
    memory: memoryQuery.data !== undefined && !memoryQuery.isError,
  };

  const pendingApprovals = useMemo(
    () =>
      approvals.filter((item) =>
        text(item.status, "").toLowerCase().includes("pending"),
      ),
    [approvals],
  );

  return (
    <aside className="space-y-4">
      <GlassPanel className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-bold text-white">
              <BrainCircuit size={16} className="text-cyan-300" />
              Live Context
            </h2>

            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-600">
              Backend context stream
            </p>
          </div>

          <button
            type="button"
            aria-label="Close Live Context panel"
            title="Close Live Context"
            onClick={() => setContextOpen(false)}
            className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-2 text-slate-500 transition hover:border-cyan-300/20 hover:bg-white/[0.06] hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mt-2 text-xs leading-5 text-slate-500">
          Context values are loaded from backend endpoints. Missing sources are
          shown as unavailable instead of being simulated.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <MiniMetric label="Missions" value={String(missions.length)} ok={sources.missions} />
          <MiniMetric label="Approvals" value={String(pendingApprovals.length)} ok={sources.approvals} />
          <MiniMetric label="Memory" value={String(memory.length)} ok={sources.memory} />
          <MiniMetric label="Activity" value={String(activity.length)} ok={sources.activity} />
        </div>
      </GlassPanel>

      <GlassPanel className="p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
          <ShieldCheck size={15} className="text-emerald-300" />
          Attention
        </h3>

        <div className="mt-3 space-y-2">
          {pendingApprovals.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-black/25 p-3 text-xs text-slate-500">
              No pending approvals returned.
            </p>
          ) : (
            pendingApprovals.slice(0, 4).map((item, index) => (
              <div
                key={`${text(item.id, String(index))}-${index}`}
                className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-3"
              >
                <p className="text-xs font-bold text-yellow-100">
                  {text(item.title || item.action_type || item.type, "Pending approval")}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {text(item.risk_level || item.status, "Review required")}
                </p>
              </div>
            ))
          )}
        </div>
      </GlassPanel>

      <GlassPanel className="p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
          <Activity size={15} className="text-violet-300" />
          Recent Activity
        </h3>

        <div className="mt-3 space-y-2">
          {activity.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-black/25 p-3 text-xs text-slate-500">
              No activity records returned.
            </p>
          ) : (
            activity.slice(0, 5).map((item, index) => (
              <p
                key={`${text(item.id, String(index))}-${index}`}
                className="rounded-xl border border-white/10 bg-black/25 p-3 text-xs leading-5 text-slate-400"
              >
                {text(item.title || item.message || item.event || item.action || item.type)}
              </p>
            ))
          )}
        </div>
      </GlassPanel>
    </aside>
  );
}

function MiniMetric({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
          {label}
        </span>
        <StatusChip tone={ok ? "success" : "muted"}>{ok ? "Live" : "Off"}</StatusChip>
      </div>
      <p className="mt-2 text-lg font-black text-cyan-100">{value}</p>
    </div>
  );
}
