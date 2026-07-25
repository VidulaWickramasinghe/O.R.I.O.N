import type { UIPolishResult } from "@/types/orion";
import { GlassPanel } from "@/components/aurora/ui/GlassPanel";
import { LoadingSkeleton } from "@/components/aurora/resilience/LoadingSkeleton";
import { StatusPill } from "@/components/aurora/ui/StatusPill";

export function UIPolishPanel({ result, loading, onCheck, onSave }: { result: UIPolishResult | null; loading: boolean; onCheck: () => void; onSave: () => void }) {
  return <GlassPanel className="p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[.25em] text-cyan-300">Responsive audit</p><h2 className="mt-2 text-xl font-black text-white">UI Polish</h2><p className="mt-2 text-sm text-slate-400">Mobile presentation and source readiness.</p></div><StatusPill tone={result?.mobile_ready ? "success" : "warning"}>{result?.mobile_ready ? "mobile ready" : "unchecked"}</StatusPill></div>
    <div className="mt-5 grid grid-cols-2 gap-2"><button onClick={onCheck} disabled={loading} className="rounded-xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">Check UI</button><button onClick={onSave} disabled={loading} className="rounded-xl border border-emerald-400/30 px-4 py-3 text-sm font-bold text-emerald-200 disabled:opacity-50">Save report</button></div>
    {loading && !result ? <div className="mt-4"><LoadingSkeleton /></div> : null}
    {result ? <><div className="mt-5 flex flex-wrap gap-2">{result.responsive_markers.map((item) => <StatusPill key={item.marker} tone={item.present ? "success" : "warning"}>{item.marker}</StatusPill>)}</div><details className="mt-4 rounded-xl border border-white/10 p-3"><summary className="cursor-pointer text-sm font-bold text-cyan-200">UI report</summary><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs text-slate-300">{result.report}</pre></details></> : null}
  </GlassPanel>;
}
