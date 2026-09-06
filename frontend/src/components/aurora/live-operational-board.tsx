"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock3, Radio, RefreshCw, ShieldCheck } from "lucide-react";

import {
  useAuroraApprovals,
  useAuroraMissions,
  useAuroraSecurityPolicy,
  useAuroraStatus,
} from "@/components/aurora/lib/aurora-queries";
import {
  ConnectionStatus,
  MissionStatusBadge,
  RiskBadge,
} from "@/components/aurora/operational-ui";
import { operationalMissionStatus } from "@/lib/mission-status";
import { ApiError } from "@/lib/api/client";

const riskOrder: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function formatFreshness(timestamp: number) {
  if (!timestamp) return "Not synchronized";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 10) return "Updated just now";
  if (seconds < 60) return `Updated ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `Updated ${minutes}m ago`;
}

export function LiveOperationalBoard() {
  const statusQuery = useAuroraStatus();
  const missionsQuery = useAuroraMissions(30000);
  const approvalsQuery = useAuroraApprovals(["pending", "executing"], 30000);
  const securityQuery = useAuroraSecurityPolicy(30000);

  const missions = missionsQuery.data?.missions ?? [];
  const approvals = approvalsQuery.data?.approvals ?? [];
  const activeMission = missions
    .filter((mission) => ["running", "waiting_for_approval"].includes(operationalMissionStatus(mission.status) ?? ""))
    .sort((left, right) => {
      const leftState = operationalMissionStatus(left.status);
      const rightState = operationalMissionStatus(right.status);
      const rank = (state: ReturnType<typeof operationalMissionStatus>) =>
        state === "running" ? 3 : state === "waiting_for_approval" ? 2 : 1;
      return rank(rightState) - rank(leftState) || right.updated_at.localeCompare(left.updated_at);
    })[0];
  const pendingApprovals = approvals.filter((approval) =>
    ["pending", "requested", "waiting", "waiting_approval"].includes(
      String(approval.status ?? "").trim().toLowerCase(),
    ),
  );
  const executingApprovals = approvals.filter(
    (approval) => String(approval.status ?? "").trim().toLowerCase() === "executing",
  );
  const highestRisk = pendingApprovals
    .map((approval) => String(approval.risk_level || "unavailable").toLowerCase())
    .sort((left, right) => (riskOrder[right] ?? 0) - (riskOrder[left] ?? 0))[0];
  const successfulUpdates = [
    statusQuery.dataUpdatedAt,
    missionsQuery.dataUpdatedAt,
    approvalsQuery.dataUpdatedAt,
    securityQuery.dataUpdatedAt,
  ].filter(Boolean);
  const lastUpdated = successfulUpdates.length > 0 ? Math.min(...successfulUpdates) : 0;
  const refreshing = [statusQuery, missionsQuery, approvalsQuery, securityQuery].some(
    (query) => query.isFetching,
  );
  const partialFailure = [statusQuery, missionsQuery, approvalsQuery, securityQuery].some(
    (query) => query.isError,
  );
  const connectionState = statusQuery.isPending
    ? "connecting"
    : statusQuery.isSuccess
      ? "online"
      : statusQuery.error instanceof ApiError && statusQuery.error.status === 401
        ? "auth_required"
        : "offline";
  const missionEvidence = missionsQuery.isPending
    ? "Loading active work…"
    : missionsQuery.isError
      ? "Active work unavailable"
      : "No running or approval-waiting mission in loaded records";
  const approvalEvidence = approvalsQuery.isPending
    ? "Loading approval queue…"
    : approvalsQuery.isError
      ? "Approval queue unavailable"
      : `${pendingApprovals.length} waiting · ${executingApprovals.length} executing`;

  async function refresh() {
    await Promise.all([
      statusQuery.refetch(),
      missionsQuery.refetch(),
      approvalsQuery.refetch(),
      securityQuery.refetch(),
    ]);
  }

  const nextAction = statusQuery.isError || missionsQuery.isError || approvalsQuery.isError
    ? { href: "/system", label: "Resolve connection" }
    : pendingApprovals.length > 0
    ? { href: "/approvals", label: "Review approvals" }
    : activeMission
      ? { href: "/missions", label: "Open active mission" }
      : { href: "/missions", label: "Create a mission" };

  return (
    <section
      aria-label="Live operational board"
      className="orion-panel p-5 sm:p-6"
    >
      <h1 className="text-2xl font-semibold text-white">Live operations</h1>
      <p className="mt-2 text-sm leading-6 text-slate-300">Current connection, work and decision queue. Ready plans are not running jobs. This snapshot is separate from the historical performance charts below.</p>
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <ConnectionStatus
          connected={statusQuery.isSuccess}
          authenticated={statusQuery.isSuccess}
          state={connectionState}
          compact
        />

        <div className="flex min-w-0 items-center gap-2 text-xs">
          <Radio size={12} className={activeMission ? "text-cyan-300" : "text-slate-600"} aria-hidden />
          <span className="text-slate-400">Current execution</span>
          {activeMission ? (
            <>
              <Link href="/missions" className="max-w-52 truncate font-semibold text-slate-200 hover:text-cyan-100">
                {activeMission.title}
              </Link>
              <MissionStatusBadge status={activeMission.status} />
            </>
          ) : (
            <span className="text-slate-400">{missionEvidence}</span>
          )}
        </div>

        <Link href="/approvals" className="flex items-center gap-2 text-xs text-slate-400 hover:text-amber-100">
          {pendingApprovals.length > 0 ? (
            <AlertTriangle size={12} className="text-amber-300" aria-hidden />
          ) : (
            <ShieldCheck size={12} className="text-emerald-300" aria-hidden />
          )}
          <span>{approvalEvidence}</span>
          {highestRisk ? <RiskBadge risk={highestRisk} /> : null}
        </Link>

        <Link href="/security" className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-violet-100">
          <ShieldCheck size={11} className="text-violet-300" aria-hidden />
          Policy: {String(securityQuery.data?.active_policy?.profile_name || securityQuery.data?.active_policy?.active_profile || "unavailable")}
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <span className={`hidden items-center gap-1.5 text-[11px] sm:flex ${partialFailure ? "text-amber-200" : "text-slate-400"}`}>
            <Clock3 size={11} aria-hidden />
            {partialFailure ? "Some evidence unavailable — cached values may be stale" : formatFreshness(lastUpdated)}
          </span>
          <button
            type="button"
            aria-label="Refresh operational state"
            onClick={() => void refresh()}
            disabled={refreshing}
            className="rounded-lg border border-white/10 p-1.5 text-slate-500 transition hover:border-cyan-300/20 hover:text-cyan-200 disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} aria-hidden />
          </button>
          <Link href={nextAction.href} className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-300 px-2.5 py-1.5 text-[10px] font-black text-slate-950 hover:bg-cyan-200">
            {nextAction.label}<ArrowRight size={11} aria-hidden />
          </Link>
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-400">Sources: /api/status, /api/missions, /api/approvals and /api/security/policy. Refreshes every 30 seconds while this board is open. Coverage: latest 20 missions and up to 100 records per approval state, not a lifetime total. Older work may be outside this snapshot. The time-range filter below applies only to historical charts.</p>
    </section>
  );
}
