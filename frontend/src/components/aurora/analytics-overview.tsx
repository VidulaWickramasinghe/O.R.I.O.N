"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Clock3,
  Cpu,
  Gauge,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Zap,
} from "lucide-react";

type RangeKey = "24h" | "7d" | "30d";
type SeriesKey = "executions" | "latency";

type TrendPoint = {
  label: string;
  executions: number;
  latency: number;
  success: number;
};

const trendData: Record<RangeKey, TrendPoint[]> = {
  "24h": [
    { label: "00:00", executions: 42, latency: 246, success: 97.8 },
    { label: "02:00", executions: 36, latency: 232, success: 98.1 },
    { label: "04:00", executions: 31, latency: 218, success: 98.4 },
    { label: "06:00", executions: 48, latency: 225, success: 98.6 },
    { label: "08:00", executions: 71, latency: 211, success: 99.0 },
    { label: "10:00", executions: 88, latency: 198, success: 99.1 },
    { label: "12:00", executions: 96, latency: 184, success: 99.3 },
    { label: "14:00", executions: 83, latency: 192, success: 99.0 },
    { label: "16:00", executions: 104, latency: 178, success: 99.4 },
    { label: "18:00", executions: 118, latency: 171, success: 99.5 },
    { label: "20:00", executions: 109, latency: 176, success: 99.2 },
    { label: "22:00", executions: 126, latency: 164, success: 99.6 },
  ],
  "7d": [
    { label: "Mon", executions: 738, latency: 214, success: 98.4 },
    { label: "Tue", executions: 824, latency: 205, success: 98.8 },
    { label: "Wed", executions: 782, latency: 199, success: 98.7 },
    { label: "Thu", executions: 963, latency: 190, success: 99.1 },
    { label: "Fri", executions: 1056, latency: 182, success: 99.3 },
    { label: "Sat", executions: 914, latency: 176, success: 99.2 },
    { label: "Sun", executions: 1128, latency: 168, success: 99.5 },
  ],
  "30d": [
    { label: "1 Jul", executions: 3112, latency: 238, success: 97.9 },
    { label: "5 Jul", executions: 3478, latency: 224, success: 98.2 },
    { label: "9 Jul", executions: 3826, latency: 211, success: 98.6 },
    { label: "13 Jul", executions: 3654, latency: 207, success: 98.5 },
    { label: "17 Jul", executions: 4218, latency: 194, success: 98.9 },
    { label: "21 Jul", executions: 4586, latency: 181, success: 99.2 },
    { label: "25 Jul", executions: 4932, latency: 169, success: 99.4 },
  ],
};

const agents = [
  { name: "Planner", utilisation: 88, tasks: 384, success: 99.4 },
  { name: "Research", utilisation: 74, tasks: 296, success: 98.7 },
  { name: "Developer", utilisation: 69, tasks: 241, success: 99.1 },
  { name: "Memory", utilisation: 58, tasks: 198, success: 99.8 },
  { name: "Security", utilisation: 43, tasks: 152, success: 100 },
];

const outcomes = [
  { label: "Completed", value: 72, stroke: "#67e8f9" },
  { label: "Executing", value: 16, stroke: "#a78bfa" },
  { label: "Waiting", value: 8, stroke: "#fbbf24" },
  { label: "Failed", value: 4, stroke: "#fb7185" },
];

const heatmap = [
  [1, 1, 2, 2, 3, 4, 4, 3, 2, 2, 1, 1],
  [1, 2, 2, 3, 4, 5, 5, 4, 3, 2, 2, 1],
  [1, 1, 2, 3, 4, 4, 5, 5, 4, 3, 2, 1],
  [1, 2, 3, 3, 4, 5, 5, 4, 4, 3, 2, 2],
  [1, 2, 2, 4, 5, 5, 4, 5, 4, 3, 2, 1],
  [1, 1, 2, 3, 4, 4, 3, 4, 3, 2, 2, 1],
  [1, 1, 2, 2, 3, 4, 4, 3, 3, 2, 1, 1],
];

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function pointsFor(values: number[], width: number, height: number, padding = 14) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  return values.map((value, index) => ({
    x: padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1),
    y: padding + ((max - value) / span) * (height - padding * 2),
    value,
  }));
}

function smoothPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const midX = (previous.x + point.x) / 2;
    return `${path} C ${midX} ${previous.y}, ${midX} ${point.y}, ${point.x} ${point.y}`;
  }, "");
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-AU", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function AnalyticsOverview() {
  const [range, setRange] = useState<RangeKey>("7d");
  const [series, setSeries] = useState<SeriesKey>("executions");
  const data = trendData[range];

  const chart = useMemo(() => {
    const width = 760;
    const height = 250;
    const values = data.map((point) => point[series]);
    const points = pointsFor(values, width, height, 24);
    const path = smoothPath(points);
    const area = `${path} L ${points.at(-1)?.x ?? width - 24} ${height - 20} L ${points[0]?.x ?? 24} ${height - 20} Z`;
    return { width, height, points, path, area };
  }, [data, series]);

  const totalExecutions = data.reduce((total, point) => total + point.executions, 0);
  const averageLatency = Math.round(data.reduce((total, point) => total + point.latency, 0) / data.length);
  const averageSuccess = data.reduce((total, point) => total + point.success, 0) / data.length;
  const peak = data.reduce((best, point) => (point.executions > best.executions ? point : best), data[0]);

  return (
    <section className="orion-panel overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-white/[0.07] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300/70">
            <Activity size={13} /> Operational analytics
          </div>
          <h2 className="mt-2 text-lg font-semibold text-white">Performance intelligence</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Execution volume, latency, reliability, workload distribution and mission outcomes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-white/[0.07] bg-black/20 p-1">
            {(["executions", "latency"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSeries(item)}
                className={`rounded-lg px-3 py-2 text-[11px] font-semibold capitalize transition ${series === item ? "bg-white/[0.09] text-white" : "text-slate-500 hover:text-slate-300"}`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="flex rounded-xl border border-white/[0.07] bg-black/20 p-1">
            {(["24h", "7d", "30d"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRange(item)}
                className={`rounded-lg px-3 py-2 text-[11px] font-semibold transition ${range === item ? "bg-cyan-300/[0.12] text-cyan-100" : "text-slate-500 hover:text-slate-300"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid border-b border-white/[0.07] sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsStat label="Total executions" value={formatCompact(totalExecutions)} detail={`${peak.label} peak period`} trend="+12.8%" positive icon={<Zap size={16} />} />
        <AnalyticsStat label="Success rate" value={`${averageSuccess.toFixed(1)}%`} detail="Across approved actions" trend="+0.7%" positive icon={<ShieldCheck size={16} />} />
        <AnalyticsStat label="Average latency" value={`${averageLatency} ms`} detail="End-to-end response" trend="-18 ms" positive icon={<Clock3 size={16} />} />
        <AnalyticsStat label="Compute efficiency" value="87.4%" detail="Token-to-result yield" trend="+3.1%" positive icon={<Cpu size={16} />} />
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.45fr)]">
        <div className="border-b border-white/[0.07] p-5 sm:p-6 xl:border-b-0 xl:border-r">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-200">{series === "executions" ? "Execution throughput" : "Response latency"}</p>
              <p className="mt-1 text-[10px] text-slate-600">{series === "executions" ? "Approved tasks processed across all agents" : "Median orchestration response in milliseconds"}</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-cyan-300" /> Current</span>
              <span className="flex items-center gap-1.5"><span className="h-px w-4 border-t border-dashed border-violet-300/70" /> Target</span>
            </div>
          </div>

          <div className="relative">
            <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="h-auto w-full overflow-visible" role="img" aria-label={`${series} trend for ${range}`}>
              <defs>
                <linearGradient id="analyticsArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="#67e8f9" stopOpacity="0" />
                </linearGradient>
                <filter id="analyticsGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {[40, 84, 128, 172, 216].map((y) => <line key={y} x1="24" x2="736" y1={y} y2={y} stroke="rgba(148,163,184,.09)" strokeWidth="1" />)}
              <line x1="24" x2="736" y1={series === "executions" ? 104 : 120} y2={series === "executions" ? 104 : 120} stroke="rgba(167,139,250,.45)" strokeDasharray="6 7" />
              <path d={chart.area} fill="url(#analyticsArea)" />
              <path d={chart.path} fill="none" stroke="#67e8f9" strokeWidth="3" strokeLinecap="round" filter="url(#analyticsGlow)" />
              {chart.points.map((point, index) => (
                <g key={`${data[index].label}-${point.value}`}>
                  <circle cx={point.x} cy={point.y} r="9" fill="transparent"><title>{`${data[index].label}: ${series === "latency" ? `${point.value} ms` : `${point.value} executions`}`}</title></circle>
                  <circle cx={point.x} cy={point.y} r={index === chart.points.length - 1 ? 4.5 : 3} fill="#071018" stroke="#67e8f9" strokeWidth="2" />
                </g>
              ))}
            </svg>
            <div className="mt-2 grid text-[9px] text-slate-600" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
              {data.map((point, index) => <span key={point.label} className={index % Math.max(Math.floor(data.length / 6), 1) === 0 || index === data.length - 1 ? "block text-center" : "hidden text-center sm:block"}>{point.label}</span>)}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <InsightChip icon={<ArrowUpRight size={14} />} label="Peak throughput" value={`${peak.executions} tasks`} detail={peak.label} tone="cyan" />
            <InsightChip icon={<Gauge size={14} />} label="P95 latency" value={`${averageLatency + 47} ms`} detail="Within 300 ms SLO" tone="violet" />
            <InsightChip icon={<Sparkles size={14} />} label="Forecast" value="+9.6%" detail="Next seven days" tone="green" />
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div><p className="text-xs font-semibold text-slate-200">Mission outcomes</p><p className="mt-1 text-[10px] text-slate-600">Current reporting window</p></div>
            <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-2.5 py-1 text-[10px] font-semibold text-emerald-200">Healthy</span>
          </div>
          <div className="mt-5 flex items-center justify-center">
            <DonutChart />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {outcomes.map((item) => (
              <div key={item.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.stroke }} /><span className="text-[10px] text-slate-500">{item.label}</span></div>
                <p className="mt-2 text-lg font-semibold text-white">{item.value}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid border-t border-white/[0.07] xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)]">
        <div className="border-b border-white/[0.07] p-5 sm:p-6 xl:border-b-0 xl:border-r">
          <div className="flex items-center justify-between">
            <div><p className="text-xs font-semibold text-slate-200">Agent utilisation</p><p className="mt-1 text-[10px] text-slate-600">Workload distribution and execution quality</p></div>
            <Bot size={16} className="text-cyan-200" />
          </div>
          <div className="mt-5 space-y-4">
            {agents.map((agent) => (
              <div key={agent.name} className="grid grid-cols-[84px_minmax(0,1fr)_48px] items-center gap-3">
                <div><p className="text-xs font-medium text-slate-300">{agent.name}</p><p className="mt-0.5 text-[9px] text-slate-700">{agent.tasks} tasks</p></div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.055]"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400/70 to-violet-400/80" style={{ width: `${agent.utilisation}%` }} /></div>
                <div className="text-right"><p className="text-xs font-semibold text-white">{agent.utilisation}%</p><p className="mt-0.5 text-[9px] text-emerald-300">{agent.success}%</p></div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs font-semibold text-slate-200">Activity heatmap</p><p className="mt-1 text-[10px] text-slate-600">Execution density by day and two-hour interval</p></div>
            <span className="text-[9px] text-slate-700">00:00 → 22:00</span>
          </div>
          <div className="mt-5 space-y-1.5">
            {heatmap.map((row, rowIndex) => (
              <div key={dayLabels[rowIndex]} className="grid grid-cols-[28px_repeat(12,minmax(0,1fr))] gap-1">
                <span className="self-center text-[9px] text-slate-600">{dayLabels[rowIndex]}</span>
                {row.map((level, columnIndex) => (
                  <span
                    key={`${rowIndex}-${columnIndex}`}
                    className="aspect-square min-h-3 rounded-[4px] border border-white/[0.035] transition hover:scale-110"
                    style={{ backgroundColor: `rgba(103,232,249,${0.04 + level * 0.105})` }}
                    title={`${dayLabels[rowIndex]} ${String(columnIndex * 2).padStart(2, "0")}:00 · activity level ${level}`}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between rounded-xl border border-amber-300/10 bg-amber-300/[0.04] p-3">
            <div className="flex items-start gap-2"><TriangleAlert size={14} className="mt-0.5 shrink-0 text-amber-200" /><div><p className="text-[10px] font-semibold text-amber-100">Workload concentration detected</p><p className="mt-1 text-[9px] leading-4 text-slate-600">Thursday–Friday between 10:00 and 16:00 carries 31% of weekly executions.</p></div></div>
            <ArrowUpRight size={13} className="shrink-0 text-amber-300/70" />
          </div>
        </div>
      </div>
    </section>
  );
}

function AnalyticsStat({ label, value, detail, trend, positive, icon }: { label: string; value: string; detail: string; trend: string; positive: boolean; icon: ReactNode }) {
  return (
    <div className="border-b border-white/[0.07] p-4 sm:border-r sm:last:border-r-0 xl:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-cyan-200">{icon}</span>
        <span className={`flex items-center gap-1 text-[10px] font-semibold ${positive ? "text-emerald-300" : "text-rose-300"}`}>{positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}{trend}</span>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-300">{label}</p>
      <p className="mt-1 text-[10px] text-slate-600">{detail}</p>
    </div>
  );
}

function InsightChip({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: string; detail: string; tone: "cyan" | "violet" | "green" }) {
  const tones = {
    cyan: "bg-cyan-300/[0.07] text-cyan-200",
    violet: "bg-violet-300/[0.07] text-violet-200",
    green: "bg-emerald-300/[0.07] text-emerald-200",
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.018] p-3">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>{icon}</span>
      <div className="min-w-0"><p className="text-[9px] uppercase tracking-[0.15em] text-slate-700">{label}</p><p className="mt-1 text-xs font-semibold text-slate-200">{value}</p><p className="mt-0.5 truncate text-[9px] text-slate-600">{detail}</p></div>
    </div>
  );
}

function DonutChart() {
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative h-[176px] w-[176px]">
      <svg viewBox="0 0 176 176" className="h-full w-full -rotate-90" role="img" aria-label="Mission outcomes: 72 percent completed, 16 percent executing, 8 percent waiting, 4 percent failed">
        <circle cx="88" cy="88" r={radius} fill="none" stroke="rgba(255,255,255,.055)" strokeWidth="16" />
        {outcomes.map((item, index) => {
          const dash = (item.value / 100) * circumference;
          const offset = outcomes.slice(0, index).reduce((total, outcome) => total + (outcome.value / 100) * circumference, 0);
          return <circle key={item.label} cx="88" cy="88" r={radius} fill="none" stroke={item.stroke} strokeWidth="16" strokeLinecap="butt" strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset} />;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-semibold text-white">96%</span><span className="mt-1 text-[9px] uppercase tracking-[0.18em] text-slate-600">Resolved</span></div>
    </div>
  );
}
