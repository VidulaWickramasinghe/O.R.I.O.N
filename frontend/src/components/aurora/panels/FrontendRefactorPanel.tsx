import { GlassPanel } from "@/components/aurora/ui/GlassPanel";
import type { FrontendRefactorResult } from "@/types/orion";

export function FrontendRefactorPanel({ result, loading, onScan, onSaveReport }: {
  result: FrontendRefactorResult | null; loading: boolean; onScan: () => void; onSaveReport: () => void;
}) {
  const scan = result?.scan || {};
  const statusClass = result?.status === "healthy" ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : result?.status === "needs_refactor" ? "border-red-400/30 bg-red-500/10 text-red-200" : "border-yellow-400/30 bg-yellow-500/10 text-yellow-200";
  const missingFiles = Array.isArray(scan.missing_files) ? scan.missing_files.length : 0;
  return <GlassPanel className="border-cyan-400/20 bg-white/[0.06] p-5">
    <div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-bold text-white">Frontend Refactor</h2><p className="text-sm text-slate-400">Aurora OS component architecture, page cleanup, and UI modularity</p></div><span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">v4.3</span></div>
    <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4"><div className="grid grid-cols-2 gap-2"><button onClick={onScan} disabled={loading} className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60">Scan Frontend</button><button onClick={onSaveReport} disabled={loading} className="rounded-2xl border border-emerald-400/30 px-4 py-3 text-sm font-bold text-emerald-200 transition hover:bg-emerald-500/10 disabled:opacity-60">Save Report</button></div>
      {!result ? <p className="text-sm text-slate-500">Run a frontend refactor scan to inspect Aurora OS architecture.</p> : <><div className={`rounded-2xl border p-4 ${statusClass}`}><p className="text-xs uppercase tracking-[0.25em]">Frontend Architecture</p><div className="mt-3 flex items-end justify-between gap-3"><span className="text-3xl font-black">{result.status}</span><span className="text-xs uppercase tracking-[0.2em]">{result.generated_at}</span></div>{result.path && <p className="mt-3 break-all text-xs leading-5">Saved: {result.path}</p>}</div><div className="grid grid-cols-3 gap-2"><Metric label="page lines" value={scan.page_lines} /><Metric label="Components" value={scan.component_count} /><Metric label="Missing Files" value={missingFiles} /></div><details className="rounded-2xl border border-white/10 bg-white/5 p-3"><summary className="cursor-pointer text-sm font-semibold text-cyan-200">Frontend Refactor Report</summary><pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">{result.report}</pre></details></>}
      <p className="text-xs leading-5 text-slate-500">Safety: v4.3 reorganizes frontend structure while preserving the Aurora OS appearance.</p></div>
  </GlassPanel>;
}

function Metric({ label, value }: { label: string; value: unknown }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-cyan-200">{String(value || 0)}</p></div>;
}
