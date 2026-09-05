export default function Loading() {
  return (
    <main className="aurora-os-bg flex min-h-dvh items-center justify-center bg-[#05070b] p-6 text-slate-100">
      <div role="status" aria-label="Loading O.R.I.O.N. workspace" className="orion-panel w-full max-w-xl p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">Aurora OS</p>
        <div className="mt-4 h-7 w-2/3 animate-pulse rounded-lg bg-white/[0.08]" />
        <div className="mt-4 h-3 w-full animate-pulse rounded bg-white/[0.05]" />
        <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-white/[0.05]" />
        <p className="mt-5 text-xs text-slate-500">Loading operational state…</p>
      </div>
    </main>
  );
}
