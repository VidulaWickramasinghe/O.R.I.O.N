"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock3, Radio, RefreshCw, ShieldCheck } from "lucide-react";

import {
  useAuroraActivity,
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
import { isMissionActive, operationalMissionStatus } from "@/lib/mission-status";
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

export function OperationalStatusBar() {
  const statusQuery = useAuroraStatus();
  const missionsQuery = useAuroraMissions();
  const approvalsQuery = useAuroraApprovals(["pending", "executing"]);
  const activityQuery = useAuroraActivity();
  const securityQuery = useAuroraSecurityPolicy();

  const missions = missionsQuery.data?.missions ?? [];
  const approvals = approvalsQuery.data?.approvals ?? [];
  const activeMission = missions
    .filter((mission) => isMissionActive(mission.status))
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
    activityQuery.dataUpdatedAt,
    securityQuery.dataUpdatedAt,
  ].filter(Boolean);
  const lastUpdated = successfulUpdates.length > 0 ? Math.min(...successfulUpdates) : 0;
  const refreshing = [statusQuery, missionsQuery, approvalsQuery, activityQuery, securityQuery].some(
    (query) => query.isFetching,
  );
  const partialFailure = [statusQuery, missionsQuery, approvalsQuery, activityQuery, securityQuery].some(
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
      : "No active mission";
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
      activityQuery.refetch(),
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
      aria-label="O.R.I.O.N. operational status"
      className="relative z-20 shrink-0 border-b border-white/[0.07] bg-[#080b12]/88 px-3 py-2 backdrop-blur-2xl sm:px-5"
    >
      <div className="mx-auto flex w-full max-w-[1880px] flex-wrap items-center gap-x-5 gap-y-2">
        <ConnectionStatus
          connected={statusQuery.isSuccess}
          authenticated={statusQuery.isSuccess}
          state={connectionState}
          compact
        />

        <div className="flex min-w-0 items-center gap-2 text-xs">
          <Radio size={12} className={activeMission ? "text-cyan-300" : "text-slate-600"} aria-hidden />
          <span className="hidden text-slate-600 sm:inline">Active work</span>
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

        <Link href="/security" className="hidden items-center gap-1.5 text-[10px] text-slate-500 hover:text-violet-100 2xl:flex">
          <ShieldCheck size={11} className="text-violet-300" aria-hidden />
          Policy: {String(securityQuery.data?.active_policy?.profile_name || securityQuery.data?.active_policy?.active_profile || "unavailable")}
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <span className={`hidden items-center gap-1.5 text-[11px] sm:flex ${partialFailure ? "text-amber-200" : "text-slate-400"}`}>
            <Clock3 size={11} aria-hidden />
            {partialFailure ? "Some evidence unavailable" : formatFreshness(lastUpdated)}
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
    </section>
  );
}
