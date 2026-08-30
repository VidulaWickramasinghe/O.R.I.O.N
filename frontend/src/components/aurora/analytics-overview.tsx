"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, Bot, Clock3, ShieldCheck, Zap } from "lucide-react";

import {
  getOperationalTelemetry,
  type AnalyticsRange,
  type OperationalTelemetry,
} from "@/lib/api/analytics";

type SeriesKey = "executions" | "latency_ms";

const outcomeColours: Record<string, string> = {
  completed: "#67e8f9", running: "#a78bfa", waiting: "#fbbf24",
  failed: "#fb7185", cancelled: "#94a3b8", paused: "#f59e0b",
  recovery_required: "#f97316",
};
const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function pointsFor(values: number[], width: number, height: number, padding = 20) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  return values.map((value, index) => ({
    x: padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1),
    y: padding + ((max - value) / span) * (height - padding * 2),
    value,
  }));
}

function pathFor(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-AU", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function periodLabel(value: string, range: AnalyticsRange) {
  const date = new Date(value);
  return range === "24h"
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function AnalyticsOverview() {
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [series, setSeries] = useState<SeriesKey>("executions");
  const [telemetry, setTelemetry] = useState<OperationalTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getOperationalTelemetry(range)
      .then((data) => active && setTelemetry(data))
      .catch(() => {
        if (active) {
          setTelemetry(null);
          setError("Operational telemetry is unavailable. No values are being estimated.");
        }
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [range]);

  const chart = useMemo(() => {
    const data = telemetry?.series ?? [];
    const values = data.map((point) => series === "executions" ? point.executions : point.latency_ms ?? 0);
    const points = values.length ? pointsFor(values, 760, 250) : [];
    return { points, path: pathFor(points) };
  }, [telemetry, series]);

  const maximumHeat = Math.max(0, ...(telemetry?.heatmap.flat() ?? []));
  const outcomeTotal = telemetry?.outcomes.reduce((sum, outcome) => sum + outcome.count, 0) ?? 0;

  return (
    <section className="orion-panel overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-white/[0.07] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300/70"><Activity size={13} /> Operational analytics · persisted events</div>
          <h2 className="mt-2 text-lg font-semibold text-white">Performance intelligence</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Capability decisions, agent runs and mission transitions from local event stores.</p>
        </div>
        <div className="flex rounded-xl border border-white/[0.07] bg-black/20 p-1">
          {(["24h", "7d", "30d"] as const).map((item) => <button key={item} type="button" onClick={() => setRange(item)} className={`rounded-lg px-3 py-2 text-[11px] font-semibold ${range === item ? "bg-cyan-300/[0.12] text-cyan-100" : "text-slate-500"}`}>{item}</button>)}
        </div>
      </div>

      {loading ? <AnalyticsMessage>Loading persisted events…</AnalyticsMessage> : error ? <AnalyticsMessage>{error}</AnalyticsMessage> : !telemetry?.has_data ? (
        <AnalyticsMessage>No operational events exist in this window. Metrics will appear after a mission, agent run, or governed action occurs.</AnalyticsMessage>
      ) : (
        <>
          <div className="grid border-b border-white/[0.07] sm:grid-cols-2 xl:grid-cols-4">
            <AnalyticsStat icon={<Zap size={16} />} label="Total executions" value={formatCompact(telemetry.summary.total_executions)} detail="Persisted decisions and agent runs" />
            <AnalyticsStat icon={<ShieldCheck size={16} />} label="Success rate" value={telemetry.summary.success_rate == null ? "No sample" : `${telemetry.summary.success_rate.toFixed(1)}%`} detail="Allowed/completed event ratio" />
            <AnalyticsStat icon={<Clock3 size={16} />} label="Average latency" value={telemetry.summary.average_latency_ms == null ? "No sample" : `${telemetry.summary.average_latency_ms} ms`} detail="Completed agent runs only" />
            <AnalyticsStat icon={<Bot size={16} />} label="Token usage" value={formatCompact(telemetry.summary.token_usage)} detail="Provider-reported input + output" />
          </div>

          <div className="grid xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.45fr)]">
            <div className="border-b border-white/[0.07] p-5 sm:p-6 xl:border-b-0 xl:border-r">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div><p className="text-xs font-semibold text-slate-200">Observed trend</p><p className="mt-1 text-[10px] text-slate-600">No forecast or synthetic target</p></div>
                <div className="flex rounded-xl border border-white/[0.07] bg-black/20 p-1">{(["executions", "latency_ms"] as const).map((item) => <button key={item} type="button" onClick={() => setSeries(item)} className={`rounded-lg px-3 py-2 text-[11px] ${series === item ? "bg-white/[0.09] text-white" : "text-slate-500"}`}>{item === "latency_ms" ? "latency" : item}</button>)}</div>
              </div>
              <svg viewBox="0 0 760 250" className="h-auto w-full" role="img" aria-label={`${series} from persisted events`}>
                {[40, 90, 140, 190, 230].map((y) => <line key={y} x1="20" x2="740" y1={y} y2={y} stroke="rgba(148,163,184,.09)" />)}
                <path d={chart.path} fill="none" stroke="#67e8f9" strokeWidth="3" />
                {chart.points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="3" fill="#071018" stroke="#67e8f9"><title>{String(point.value)}</title></circle>)}
              </svg>
              <div className="mt-2 grid text-center text-[9px] text-slate-600" style={{ gridTemplateColumns: `repeat(${telemetry.series.length}, minmax(0, 1fr))` }}>{telemetry.series.map((point) => <span key={point.label}>{periodLabel(point.label, range)}</span>)}</div>
            </div>

            <div className="p-5 sm:p-6">
              <p className="text-xs font-semibold text-slate-200">Latest mission states</p><p className="mt-1 text-[10px] text-slate-600">Last transition per mission in this window</p>
              <div className="mt-5 space-y-2">{telemetry.outcomes.length ? telemetry.outcomes.map((outcome) => <div key={outcome.label} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"><span className="flex items-center gap-2 text-xs capitalize text-slate-400"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: outcomeColours[outcome.label] ?? "#64748b" }} />{outcome.label.replaceAll("_", " ")}</span><span className="text-sm font-semibold text-white">{outcome.count}</span></div>) : <p className="text-xs text-slate-600">No mission transitions in this window.</p>}{outcomeTotal > 0 && <p className="pt-2 text-[10px] text-slate-600">{outcomeTotal} missions represented</p>}</div>
            </div>
          </div>

          <div className="grid border-t border-white/[0.07] xl:grid-cols-2">
            <div className="border-b border-white/[0.07] p-5 sm:p-6 xl:border-b-0 xl:border-r"><p className="text-xs font-semibold text-slate-200">Observed workload</p><div className="mt-5 space-y-4">{telemetry.agents.map((agent) => <div key={agent.name} className="grid grid-cols-[130px_minmax(0,1fr)_56px] items-center gap-3"><div><p className="truncate text-xs text-slate-300">{agent.name}</p><p className="text-[9px] text-slate-700">{agent.tasks} events</p></div><div className="h-2 overflow-hidden rounded-full bg-white/[0.055]"><div className="h-full bg-cyan-300/70" style={{ width: `${agent.utilisation ?? 0}%` }} /></div><span className="text-right text-xs text-white">{agent.utilisation?.toFixed(1) ?? "0.0"}%</span></div>)}</div></div>
            <div className="p-5 sm:p-6"><p className="text-xs font-semibold text-slate-200">Event density</p><p className="mt-1 text-[10px] text-slate-600">UTC weekday and two-hour interval</p><div className="mt-5 space-y-1.5">{telemetry.heatmap.map((row, rowIndex) => <div key={dayLabels[rowIndex]} className="grid grid-cols-[28px_repeat(12,minmax(0,1fr))] gap-1"><span className="self-center text-[9px] text-slate-600">{dayLabels[rowIndex]}</span>{row.map((count, columnIndex) => <span key={columnIndex} className="aspect-square min-h-3 rounded-[4px] border border-white/[0.035]" style={{ backgroundColor: `rgba(103,232,249,${maximumHeat ? 0.05 + (count / maximumHeat) * 0.55 : 0.03})` }} title={`${count} persisted events`} />)}</div>)}</div></div>
          </div>
        </>
      )}
    </section>
  );
}

function AnalyticsMessage({ children }: { children: ReactNode }) {
  return <div className="p-10 text-center text-sm leading-6 text-slate-500">{children}</div>;
}

function AnalyticsStat({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: ReactNode }) {
  return <div className="border-b border-white/[0.07] p-4 sm:border-r xl:border-b-0"><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-cyan-200">{icon}</span><p className="mt-4 text-2xl font-semibold text-white">{value}</p><p className="mt-1 text-xs font-medium text-slate-300">{label}</p><p className="mt-1 text-[10px] text-slate-600">{detail}</p></div>;
}
