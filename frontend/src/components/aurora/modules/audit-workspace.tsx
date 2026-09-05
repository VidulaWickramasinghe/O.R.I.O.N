"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import {
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingSkeleton,
  MetricCard,
  OperationalStatusBanner,
  PageHeader,
} from "@/components/aurora/operational-ui";
import { ToolAuditPanel } from "@/components/aurora/panels/ToolAuditPanel";
import { getAuditEvents, getToolAudit } from "@/lib/api/tools";

function metricValue(source: Record<string, unknown> | undefined, key: string, fallback = "0") {
  const value = source?.[key];
  return value === undefined || value === null ? fallback : String(value);
}

export function AuditWorkspace() {
  const [phase, setPhase] = useState("");
  const [correlationId, setCorrelationId] = useState("");
  const durableQuery = useQuery({
    queryKey: ["durable-audit-events", phase, correlationId.trim()],
    queryFn: () => getAuditEvents({
      phase: phase || undefined,
      correlationId: correlationId.trim() || undefined,
      limit: 200,
    }),
  });
  const decisionsQuery = useQuery({
    queryKey: ["tool-audit"],
    queryFn: getToolAudit,
  });
  const events = useMemo(() => durableQuery.data?.events ?? [], [durableQuery.data?.events]);
  const eventMetrics = useMemo(() => ({
    failed: events.filter((event) => event.status === "failed").length,
    executing: events.filter((event) => event.status === "started").length,
    correlated: new Set(events.map((event) => event.correlation_id).filter(Boolean)).size,
  }), [events]);

  async function refresh() {
    await Promise.all([durableQuery.refetch(), decisionsQuery.refetch()]);
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <PageHeader
        eyebrow="Governance · Correlated durable evidence"
        title="Audit"
        description="Reconstruct decisions, execution starts, internal actions, results, and failures without treating authorization as proof of completion."
        metadata={<p className="text-[11px] text-slate-400">Newest durable events are shown first. Raw arguments are never stored; their canonical SHA-256 hash is retained.</p>}
        actions={
          <>
            <Link href="/activity" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:text-cyan-100">Human-readable activity</Link>
            <button type="button" onClick={() => void refresh()} disabled={durableQuery.isFetching || decisionsQuery.isFetching} className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/20 px-3 py-2 text-xs font-bold text-cyan-100 disabled:opacity-50"><RefreshCw size={13} className={durableQuery.isFetching || decisionsQuery.isFetching ? "animate-spin" : ""} />Refresh</button>
          </>
        }
      />

      <OperationalStatusBanner
        tone="info"
        title="Decision and execution evidence are separate"
        description="An allowed decision says policy permitted a capability. Only a correlated terminal execution event demonstrates that the operation succeeded, failed, or was cancelled."
      />

      <FilterBar>
        <label className="text-xs text-slate-300">Phase
          <select value={phase} onChange={(event) => setPhase(event.target.value)} className="ml-2 rounded-lg border border-white/10 bg-[#0b0f17] px-2 py-2 text-xs text-white">
            <option value="">All durable phases</option>
            <option value="decision">Decision</option>
            <option value="execution">Execution</option>
            <option value="action">Internal action</option>
            <option value="activity">Activity</option>
          </select>
        </label>
        <label className="min-w-0 flex-1 text-xs text-slate-300">Correlation ID
          <input value={correlationId} maxLength={128} onChange={(event) => setCorrelationId(event.target.value)} placeholder="Filter exact correlation ID" className="ml-2 w-full max-w-xl rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/35 sm:w-[min(100%,28rem)]" />
        </label>
      </FilterBar>

      {durableQuery.isLoading ? <LoadingSkeleton label="Loading durable audit evidence" /> : null}
      {durableQuery.isError ? <ErrorState title="Durable audit evidence unavailable" description="Decision and execution history could not be authenticated or read. Do not infer that any action completed." onRetry={() => void durableQuery.refetch()} /> : null}
      {durableQuery.data ? (
        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Returned events" value={events.length} detail="Bounded newest-first evidence" />
            <MetricCard label="Correlations" value={eventMetrics.correlated} detail="Distinct operation timelines" tone="info" />
            <MetricCard label="In progress" value={eventMetrics.executing} detail="Started without terminal result" tone={eventMetrics.executing ? "warning" : "neutral"} />
            <MetricCard label="Failed" value={eventMetrics.failed} detail="Terminal failed events" tone={eventMetrics.failed ? "danger" : "success"} />
          </div>
          <div className="orion-panel p-5">
            <h2 className="text-lg font-bold text-white">Correlated event stream</h2>
            <p className="mt-1 text-xs text-slate-400">Actor, mission ownership, policy, approval, hashes, duration, and result are returned from the durable audit store.</p>
            <div className="mt-4 max-h-[760px] space-y-3 overflow-y-auto pr-1">
              {events.length === 0 ? <EmptyState title="No matching audit evidence" description="No durable event matches the current phase and correlation filters." /> : events.map((event) => (
                <article key={event.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-200">{event.phase} · sequence {event.sequence}</p><h3 className="mt-1 text-sm font-bold text-white">{event.event_type}{event.tool_name ? ` · ${event.tool_name}` : ""}</h3></div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${event.status === "failed" ? "border-rose-300/25 text-rose-200" : event.status === "started" ? "border-amber-300/25 text-amber-200" : "border-emerald-300/20 text-emerald-200"}`}>{event.status || event.decision || "recorded"}</span>
                  </div>
                  {event.reason ? <p className="mt-3 text-xs leading-5 text-slate-300">{event.reason}</p> : null}
                  <dl className="mt-3 grid gap-2 text-[11px] text-slate-400 sm:grid-cols-2 xl:grid-cols-3">
                    <div><dt className="text-slate-500">Actor / source</dt><dd>{event.actor || "unknown"} / {event.source || "unknown"}</dd></div>
                    <div><dt className="text-slate-500">Mission / step / run</dt><dd>{event.mission_id ?? "none"} / {event.step_id ?? "none"} / {event.run_id ?? "none"}</dd></div>
                    <div><dt className="text-slate-500">Policy / approval</dt><dd>{event.policy_profile || "unknown"} / {event.approval_id ?? "none"}</dd></div>
                    <div><dt className="text-slate-500">Plugin / scope</dt><dd>{event.plugin_key || "unmapped"} / {event.scope || "none"}</dd></div>
                    <div><dt className="text-slate-500">Duration</dt><dd>{event.duration_ms === null || event.duration_ms === undefined ? "unavailable" : `${event.duration_ms.toFixed(2)} ms`}</dd></div>
                    <div><dt className="text-slate-500">Recorded</dt><dd>{event.created_at}</dd></div>
                  </dl>
                  <p className="mt-3 break-all font-mono text-[11px] text-cyan-200/75">Correlation: {event.correlation_id}</p>
                  {event.arguments_hash ? <p className="mt-1 break-all font-mono text-[11px] text-slate-400">Arguments SHA-256: {event.arguments_hash}</p> : null}
                  {event.result ? <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] leading-5 text-slate-300">{event.result}</pre> : null}
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {decisionsQuery.isLoading ? <LoadingSkeleton label="Loading policy decision ledger" /> : null}
      {decisionsQuery.isError ? <ErrorState title="Policy decision ledger unavailable" description="The legacy policy-decision store could not be read." onRetry={() => void decisionsQuery.refetch()} /> : null}
      {decisionsQuery.data ? (
        <ToolAuditPanel events={decisionsQuery.data.events} metrics={decisionsQuery.data.metrics} report={decisionsQuery.data.report} metricValue={metricValue} />
      ) : null}
    </div>
  );
}
