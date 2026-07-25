"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, Clock3, RefreshCw, ShieldAlert, Target, Wrench } from "lucide-react";
import { apiGet } from "@/lib/api/client";
import { StatusBadge } from "@/components/aurora/data-display/StatusBadge";
import { WorkspaceState } from "@/components/aurora/feedback/WorkspaceState";

type Mission = { id: number; title: string; status: string; updated_at?: string; steps?: Array<{ status?: string }> };
type Approval = { id: number; status: string; risk_level?: string };
type AuditEvent = { id: number; decision: string; risk_level: string; tool_name: string; created_at: string };
type ActivityEvent = { event_type?: string; type?: string; message: string; source: string; created_at?: string; timestamp?: string };
type Intelligence = { intelligence_score: number; readiness_label: string; recommendations: string[]; mission_metrics: Record<string, unknown>; activity_metrics: Record<string, unknown> };
type Snapshot = { missions: Mission[]; approvals: Approval[]; audit: AuditEvent[]; activity: ActivityEvent[]; intelligence: Intelligence | null };

const empty: Snapshot = { missions: [], approvals: [], audit: [], activity: [], intelligence: null };

export function OperationalAnalytics() {
  const [snapshot, setSnapshot] = useState<Snapshot>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [range, setRange] = useState<"24h" | "7d" | "30d">("7d");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const results = await Promise.allSettled([
      apiGet<{ missions: Mission[] }>("/api/missions"),
      apiGet<{ approvals: Approval[] }>("/api/approvals"),
      apiGet<{ events: AuditEvent[] }>("/api/tools/audit"),
      apiGet<{ events: ActivityEvent[] }>("/api/activity"),
      apiGet<Intelligence>("/api/dashboard/intelligence"),
    ]);
    const failures = results.filter((result) => result.status === "rejected").length;
    setSnapshot({
      missions: results[0].status === "fulfilled" ? results[0].value.missions : [],
      approvals: results[1].status === "fulfilled" ? results[1].value.approvals : [],
      audit: results[2].status === "fulfilled" ? results[2].value.events : [],
      activity: results[3].status === "fulfilled" ? results[3].value.events : [],
      intelligence: results[4].status === "fulfilled" ? results[4].value : null,
    });
    if (failures === results.length) setError("Operational analytics could not reach the O.R.I.O.N. backend. No sample values are being shown.");
    else if (failures) setError(`${failures} analytics source${failures === 1 ? " is" : "s are"} unavailable. Available panels remain current.`);
    setUpdatedAt(new Date().toISOString()); setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  const metrics = useMemo(() => {
    const completed = snapshot.missions.filter((item) => item.status.toLowerCase() === "completed").length;
    const pending = snapshot.approvals.filter((item) => item.status.toLowerCase() === "pending").length;
    const allowed = snapshot.audit.filter((item) => item.decision.toLowerCase() === "allowed").length;
    const successRate = snapshot.audit.length ? Math.round((allowed / snapshot.audit.length) * 100) : null;
    return { completed, pending, successRate, active: snapshot.missions.filter((item) => ["running", "active", "in_progress"].includes(item.status.toLowerCase())).length };
  }, [snapshot]);
  const filteredActivity = useMemo(() => { const cutoff = Date.now() - (range === "24h" ? 1 : range === "7d" ? 7 : 30) * 86_400_000; return snapshot.activity.filter((event) => { const timestamp = Date.parse(event.created_at ?? event.timestamp ?? ""); return Number.isNaN(timestamp) || timestamp >= cutoff; }); }, [range, snapshot.activity]);
  const activitySeries = useMemo(() => { const days = range === "24h" ? 1 : range === "7d" ? 7 : 30; return Array.from({ length: days }, (_, index) => {
    const date = new Date(); date.setUTCDate(date.getUTCDate() - (days - 1 - index));
    const key = date.toISOString().slice(0, 10);
    return { label: days > 7 ? String(date.getUTCDate()) : date.toLocaleDateString(undefined, { weekday: "short" }), value: filteredActivity.filter((event) => (event.created_at ?? event.timestamp ?? "").startsWith(key)).length };
  })}, [filteredActivity, range]);
  const max = Math.max(1, ...activitySeries.map((item) => item.value));

  return <div className="mx-auto w-full max-w-[1600px] space-y-5">
    <header className="aurora-panel flex flex-col gap-5 p-5 sm:p-7 xl:flex-row xl:items-end xl:justify-between">
      <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-blue-300"><Activity size={16}/> Live backend intelligence</div><h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Operational Analytics</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">Understand mission throughput, approval pressure, tool outcomes, and platform activity from verified backend records.</p></div>
      <div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor="analytics-range">Date range</label><select id="analytics-range" value={range} onChange={(event)=>setRange(event.target.value as typeof range)} className="aurora-input"><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option></select><button onClick={()=>void load()} disabled={loading} className="aurora-button"><RefreshCw size={16} className={loading ? "animate-spin" : ""}/>Refresh data</button></div>
    </header>
    {error && <WorkspaceState kind={snapshot.activity.length ? "error" : "offline"} title={snapshot.activity.length ? "Analytics partially degraded" : "Analytics unavailable"} description={error} onRetry={()=>void load()}/>}
    <section aria-label="Analytics key performance indicators" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Kpi icon={Target} label="Mission throughput" value={String(metrics.completed)} detail={`${snapshot.missions.length} missions returned`} tone="blue"/>
      <Kpi icon={Activity} label="Active missions" value={String(metrics.active)} detail="Backend execution state" tone="cyan"/>
      <Kpi icon={Wrench} label="Tool success rate" value={metrics.successRate === null ? "Unavailable" : `${metrics.successRate}%`} detail={`${snapshot.audit.length} audited decisions`} tone="teal"/>
      <Kpi icon={ShieldAlert} label="Pending approvals" value={String(metrics.pending)} detail="Requires human attention" tone="amber"/>
      <Kpi icon={CheckCircle2} label="Intelligence score" value={snapshot.intelligence ? `${snapshot.intelligence.intelligence_score}` : "Unavailable"} detail={snapshot.intelligence?.readiness_label ?? "No dashboard source"} tone="violet"/>
    </section>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.7fr)]">
      <section className="aurora-panel p-5 sm:p-6"><div className="flex items-start justify-between"><div><h2 className="text-lg font-semibold text-white">Activity trend</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Recorded events by UTC day · selected view {range}</p></div><StatusBadge status={loading ? "Running" : "Ready"}/></div><div className="mt-8 flex h-64 items-end gap-3 border-b border-l border-white/10 px-3 pt-4">{activitySeries.map(item=><div key={item.label} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-semibold text-cyan-200 opacity-0 transition group-hover:opacity-100">{item.value}</span><div className="w-full max-w-16 rounded-t-lg bg-gradient-to-t from-blue-500/60 to-cyan-300 shadow-[0_0_24px_rgba(77,214,255,.12)] transition-[height] duration-500" style={{height:`${Math.max(4,(item.value/max)*82)}%`}}/><span className="text-[11px] text-[var(--text-muted)]">{item.label}</span></div>)}</div></section>
      <section className="aurora-panel p-5 sm:p-6"><h2 className="text-lg font-semibold text-white">Status distribution</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Mission records returned by the backend</p><div className="mt-6 space-y-4">{["completed","running","waiting","failed"].map((status)=>{const count=snapshot.missions.filter(m=>m.status.toLowerCase().includes(status)).length;const pct=snapshot.missions.length?Math.round(count/snapshot.missions.length*100):0;return <div key={status}><div className="mb-2 flex justify-between text-sm"><span className="capitalize text-[var(--text-secondary)]">{status}</span><span className="font-mono text-white">{count} · {pct}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-[var(--accent-blue)] transition-[width] duration-500" style={{width:`${pct}%`}}/></div></div>})}</div></section>
    </div>
    <section className="aurora-panel overflow-hidden"><div className="flex flex-col gap-2 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold text-white">Recent operational events</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Latest auditable activity across O.R.I.O.N.</p></div><span className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><Clock3 size={14}/>{updatedAt ? `Updated ${new Date(updatedAt).toLocaleTimeString()}` : "Waiting for backend"}</span></div>{loading && !snapshot.activity.length ? <div className="p-5"><WorkspaceState kind="loading" title="Loading operational events" description="Requesting verified activity from the backend."/></div> : filteredActivity.length ? <div className="divide-y divide-white/[.06]">{filteredActivity.slice(0,8).map((event,index)=><div key={`${event.created_at}-${index}`} className="grid gap-2 p-4 transition hover:bg-white/[.025] sm:grid-cols-[150px_1fr_160px] sm:items-center"><span className="font-mono text-xs text-cyan-300">{event.event_type ?? event.type ?? "EVENT"}</span><span className="text-sm text-[var(--text-secondary)]">{event.message}</span><span className="text-xs text-[var(--text-muted)] sm:text-right">{event.source}</span></div>)}</div> : <div className="p-5"><WorkspaceState kind="empty" title="No activity recorded" description="No backend events fall inside the selected date range."/></div>}</section>
  </div>;
}

function Kpi({icon:Icon,label,value,detail,tone}:{icon:typeof Activity;label:string;value:string;detail:string;tone:string}) { return <div className={`aurora-card aurora-accent-${tone} p-4`}><div className="flex items-center justify-between"><Icon size={18} className="text-[var(--feature-accent,var(--accent-cyan))]"/><span className="h-2 w-2 rounded-full bg-[var(--feature-accent,var(--accent-cyan))]"/></div><p className="mt-5 text-xs font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p><p className="mt-2 text-xs text-[var(--text-muted)]">{detail}</p></div> }
