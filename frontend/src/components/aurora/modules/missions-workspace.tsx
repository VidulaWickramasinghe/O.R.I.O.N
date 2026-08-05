"use client";

import { useState } from "react";

import { MissionsModule } from "@/components/aurora/modules/missions-module";

export function MissionsWorkspace() {
  const [message, setMessage] = useState("");

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <header className="rounded-3xl border border-cyan-300/15 bg-black/25 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
          Live mission control
        </p>

        <h1 className="mt-2 text-3xl font-semibold text-white">
          Mission planner and run history
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Inspect backend missions, run controlled next-step cycles, review recent
          mission runs, and generate local reports without bypassing approval gates.
        </p>
      </header>

      {message && (
        <section className="rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">
            Latest mission result
          </p>

          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">
            {message}
          </pre>
        </section>
      )}

      <MissionsModule onAssistantMessage={setMessage} />

      <p className="rounded-2xl border border-white/10 bg-black/25 p-4 text-xs leading-5 text-slate-500">
        Safety: mission controls use the existing backend mission endpoints. Controlled
        runs must still stop for approvals, completion, errors, or repeated-step detection.
      </p>
    </div>
  );
}
