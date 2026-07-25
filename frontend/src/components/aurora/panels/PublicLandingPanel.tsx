import Link from "next/link";
import type { PublicLandingResult } from "@/types/orion";
import { GlassPanel } from "@/components/aurora/ui/GlassPanel";
import { LoadingSkeleton } from "@/components/aurora/resilience/LoadingSkeleton";
import { StatusPill } from "@/components/aurora/ui/StatusPill";

export function PublicLandingPanel({ result, loading, onCheck, onSave }: { result: PublicLandingResult | null; loading: boolean; onCheck: () => void; onSave: () => void }) {
  return <GlassPanel className="p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[.25em] text-cyan-300">Public showcase</p><h2 className="mt-2 text-xl font-black text-white">Public Landing Page</h2><p className="mt-2 text-sm text-slate-400">Static route, screenshots, and export readiness.</p></div><StatusPill tone={result?.status === "ready" ? "success" : "warning"}>{result?.status ?? "unchecked"}</StatusPill></div>
    <div className="mt-5 grid gap-2 sm:grid-cols-3"><Link href="/public-demo" className="rounded-xl bg-cyan-300 px-4 py-3 text-center text-sm font-bold text-slate-950">Open page</Link><button onClick={onCheck} disabled={loading} className="rounded-xl border border-emerald-400/30 px-4 py-3 text-sm font-bold text-emerald-200 disabled:opacity-50">Check</button><button onClick={onSave} disabled={loading} className="rounded-xl border border-violet-400/30 px-4 py-3 text-sm font-bold text-violet-200 disabled:opacity-50">Save report</button></div>
    {loading && !result ? <div className="mt-4"><LoadingSkeleton /></div> : null}
    {result ? <><dl className="mt-5 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-white/5 p-3"><dt className="text-xs text-slate-500">Route</dt><dd className="mt-1 font-bold text-white">{String(result.route_exists)}</dd></div><div className="rounded-xl bg-white/5 p-3"><dt className="text-xs text-slate-500">Screens</dt><dd className="mt-1 font-bold text-white">{result.screenshot_count}</dd></div><div className="rounded-xl bg-white/5 p-3"><dt className="text-xs text-slate-500">Export</dt><dd className="mt-1 font-bold text-white">{String(result.static_export_ready)}</dd></div></dl><details className="mt-4 rounded-xl border border-white/10 p-3"><summary className="cursor-pointer text-sm font-bold text-cyan-200">Readiness report</summary><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs text-slate-300">{result.report}</pre></details></> : null}
  </GlassPanel>;
}
