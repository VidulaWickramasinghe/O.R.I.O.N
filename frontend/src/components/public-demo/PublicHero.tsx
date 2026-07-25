import Link from "next/link";

const SYSTEM_SNAPSHOT = [
  ["Interface", "Aurora OS"],
  ["Backend", "FastAPI"],
  ["Frontend", "Next.js"],
  ["Desktop", "Tauri"],
  ["Safety", "Approval-gated"],
  ["Release", "Portfolio ready"],
] as const;

export function PublicHero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-white/10 px-4 py-6 sm:px-6 md:px-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.16),transparent_34%)]" />
      <div className="relative mx-auto max-w-7xl">
        <nav aria-label="Public demo navigation" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-cyan-300">O.R.I.O.N.</p>
            <p className="mt-2 text-lg font-black text-white">Aurora OS Public Demo</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/" className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
              Open Aurora OS
            </Link>
            <a href="#demo-flow" className="rounded-full bg-cyan-300 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
              Demo flow
            </a>
          </div>
        </nav>

        <div className="grid gap-10 py-14 md:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-200 sm:text-xs">
              Public portfolio showcase
            </div>
            <h1 className="mt-8 max-w-4xl text-4xl font-black leading-[1.05] text-white sm:text-5xl md:text-6xl lg:text-7xl">
              A local-first AI agent with a futuristic command center.
            </h1>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base sm:leading-8">
              O.R.I.O.N. helps people think, plan, act, and learn through a transparent, approval-gated agentic workflow.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/" className="rounded-2xl bg-cyan-300 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200">Launch Aurora OS</Link>
              <a href="#architecture" className="rounded-2xl border border-white/10 px-6 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/10">View architecture</a>
            </div>
          </div>

          <aside aria-label="System snapshot" className="rounded-[2rem] border border-white/10 bg-white/5 p-3 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl sm:p-4">
            <div className="rounded-[1.5rem] border border-cyan-400/20 bg-black/40 p-4 sm:p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">System snapshot</p>
              <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SYSTEM_SNAPSHOT.map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <dt className="text-xs text-slate-500">{label}</dt>
                    <dd className="mt-2 text-sm font-black text-slate-100">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-emerald-200">Safety first</p>
                <p className="mt-3 text-sm leading-6 text-slate-300">No automatic publishing, uncontrolled desktop actions, or approval bypasses.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
