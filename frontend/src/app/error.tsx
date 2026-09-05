"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="aurora-os-bg flex min-h-dvh items-center justify-center bg-[#05070b] p-6 text-slate-100">
      <section role="alert" className="orion-panel w-full max-w-xl border-rose-300/20 p-6">
        <AlertTriangle size={24} className="text-rose-300" aria-hidden />
        <h1 className="mt-4 text-2xl font-black text-white">Aurora workspace could not render</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">The failure is isolated to this route. Retry the screen; if it continues, open Diagnostics after the shell recovers.</p>
        <button type="button" onClick={reset} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-black text-slate-950"><RefreshCw size={14} />Retry screen</button>
      </section>
    </main>
  );
}
