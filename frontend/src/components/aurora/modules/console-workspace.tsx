"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CircleAlert,
  RefreshCw,
  ShieldCheck,
  SquareTerminal,
} from "lucide-react";

import { GlassPanel } from "@/components/aurora/glass-panel";
import { StatusChip } from "@/components/aurora/status-chip";
import { apiGet } from "@/lib/api/client";
import { getSystemStatus } from "@/lib/api/status";

type StatusRecord = Record<string, unknown>;

type ActivityEvent = {
  id?: number | string;
  event_type?: string;
  type?: string;
  title?: string;
  message?: string;
  source?: string;
  created_at?: string;
  timestamp?: string;
};

type ApprovalItem = {
  id?: number | string;
  title?: string;
  action_type?: string;
  status?: string;
  risk_level?: string;
  command?: string;
  requested_by?: string;
  created_at?: string;
  reason?: string;
  payload?: unknown;
};

function text(value: unknown, fallback = "Unavailable") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function normalizeActivity(value: unknown): ActivityEvent[] {
  if (Array.isArray(value)) return value as ActivityEvent[];

  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (Array.isArray(object.events)) return object.events as ActivityEvent[];
    if (Array.isArray(object.items)) return object.items as ActivityEvent[];
    if (Array.isArray(object.activity)) return object.activity as ActivityEvent[];
  }

  return [];
}

function normalizeApprovals(value: unknown): ApprovalItem[] {
  if (Array.isArray(value)) return value as ApprovalItem[];

  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (Array.isArray(object.approvals)) return object.approvals as ApprovalItem[];
    if (Array.isArray(object.items)) return object.items as ApprovalItem[];
    if (Array.isArray(object.requests)) return object.requests as ApprovalItem[];
  }

  return [];
}

function eventTime(event: ActivityEvent | ApprovalItem) {
  const raw = event.created_at || ("timestamp" in event ? event.timestamp : "");
  if (!raw) return "time unknown";

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(raw);

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ConsoleLiveWorkspace() {
  const [status, setStatus] = useState<StatusRecord | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const pendingApprovals = useMemo(
    () =>
      approvals.filter((approval) =>
        String(approval.status || "").toLowerCase().includes("pending"),
      ),
    [approvals],
  );

  async function refreshConsole() {
    setLoading(true);
    setMessage("");

    try {
      const [statusData, activityData, approvalData] = await Promise.all([
        getSystemStatus(),
        apiGet<unknown>("/api/activity"),
        apiGet<unknown>("/api/approvals"),
      ]);

      setStatus(statusData as StatusRecord);
      setActivity(normalizeActivity(activityData).slice(0, 40));
      setApprovals(normalizeApprovals(approvalData).slice(0, 40));
    } catch {
      setStatus(null);
      setActivity([]);
      setApprovals([]);
      setMessage("Live console data failed to load. Confirm the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshConsole();
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <header className="rounded-3xl border border-cyan-300/15 bg-black/25 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
              Safe live console
            </p>

            <h1 className="mt-2 text-3xl font-semibold text-white">
              Activity, approvals, and command safety
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Inspect live backend activity and approval-gated command requests.
              Direct terminal execution is intentionally not available on this
              route because no safe console execution endpoint is confirmed.
            </p>
          </div>

          <button
            onClick={() => void refreshConsole()}
            disabled={loading}
            className="rounded-xl border border-cyan-400/30 px-4 py-3 text-xs font-bold text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-60"
          >
            <RefreshCw className="inline" size={15} />{" "}
            {loading ? "Refreshing..." : "Refresh console"}
          </button>
        </div>
      </header>

      {message && (
        <p role="alert" className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
          {message}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Backend"
          value={text(status?.status)}
          detail={`v${text(status?.version, "unknown")}`}
        />

        <MetricCard
          label="Mode"
          value={text(status?.mode)}
          detail={text(status?.tagline, "Think. Plan. Act. Learn.")}
        />

        <MetricCard
          label="Activity events"
          value={String(activity.length)}
          detail="Loaded from /api/activity"
        />

        <MetricCard
          label="Pending approvals"
          value={String(pendingApprovals.length)}
          detail="Review in Tools"
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
        <GlassPanel className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <SquareTerminal size={18} className="text-cyan-300" />
                Operational activity stream
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Real backend events only. No simulated console output.
              </p>
            </div>

            <StatusChip tone={status?.status === "online" ? "success" : "warning"}>
              {status?.status === "online" ? "Backend live" : "Backend unchecked"}
            </StatusChip>
          </div>

          <div className="max-h-[560px] space-y-3 overflow-auto bg-black/25 p-4 font-mono text-xs leading-5">
            {activity.length === 0 ? (
              <p className="text-slate-500">
                No activity events returned by /api/activity.
              </p>
            ) : (
              activity.map((event, index) => (
                <article
                  key={`${event.id || event.created_at || event.timestamp || "event"}-${index}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.025] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-cyan-200">
                      {event.event_type || event.type || "EVENT"}
                    </span>
                    <span className="text-slate-600">{eventTime(event)}</span>
                  </div>

                  <p className="mt-2 whitespace-pre-wrap text-slate-300">
                    {event.message || event.title || "No event message."}
                  </p>

                  {event.source && (
                    <p className="mt-2 text-slate-600">source: {event.source}</p>
                  )}
                </article>
              ))
            )}
          </div>
        </GlassPanel>

        <aside className="space-y-5">
          <GlassPanel className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <ShieldCheck size={18} className="text-emerald-300" />
              Approval queue
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Terminal, file, desktop, and git actions must remain visible and
              approval-gated.
            </p>

            <div className="mt-4 space-y-3">
              {pendingApprovals.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-black/25 p-3 text-sm text-slate-500">
                  No pending approvals returned by /api/approvals.
                </p>
              ) : (
                pendingApprovals.slice(0, 8).map((approval, index) => (
                  <article
                    key={`${approval.id || approval.created_at || "approval"}-${index}`}
                    className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-3"
                  >
                    <p className="font-semibold text-amber-100">
                      {approval.title || approval.action_type || "Approval request"}
                    </p>

                    <p className="mt-2 break-words font-mono text-xs text-amber-200/80">
                      {approval.command || approval.reason || "Review request details in Tools."}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      {eventTime(approval)} · risk {approval.risk_level || "unknown"}
                    </p>
                  </article>
                ))
              )}
            </div>

            <Link
              href="/tools"
              className="mt-4 inline-flex rounded-xl border border-cyan-400/30 px-4 py-3 text-xs font-bold text-cyan-200 hover:bg-cyan-500/10"
            >
              Open Tools Approval Queue
            </Link>
          </GlassPanel>

          <GlassPanel className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <CircleAlert size={18} className="text-amber-300" />
              Command execution policy
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              This route does not run shell commands. Use Missions, Developer
              Mode, Tools, or approved backend workflows to create visible,
              reviewable command requests.
            </p>

            <pre className="mt-4 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/30 p-3 text-xs leading-5 text-slate-400">
{`Safe flow:
1. Assistant or mission proposes an action
2. Backend creates an approval request
3. Tools page shows approve/reject controls
4. Execution remains logged in activity`}
            </pre>
          </GlassPanel>
        </aside>
      </div>
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
