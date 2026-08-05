"use client";

import { useState } from "react";

import { MemoryModule } from "@/components/aurora/modules/memory-module";

export function MemoryWorkspace() {
  const [message, setMessage] = useState("");

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <header className="rounded-3xl border border-violet-300/15 bg-black/25 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">
          Live memory vault
        </p>

        <h1 className="mt-2 text-3xl font-semibold text-white">
          Persistent memory and context retrieval
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Review live backend memory items, inspect stored project context, and
          preview what O.R.I.O.N. retrieves before answering.
        </p>
      </header>

      {message && (
        <section className="rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">
            Memory prompt sent
          </p>

          <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">
            {message}
          </pre>
        </section>
      )}

      <MemoryModule
        onAsk={(query) =>
          setMessage(
            query.trim()
              ? `Ask O.R.I.O.N. with memory context:\n\n${query}`
              : "Enter a memory query before asking O.R.I.O.N.",
          )
        }
      />

      <p className="rounded-2xl border border-white/10 bg-black/25 p-4 text-xs leading-5 text-slate-500">
        Safety: this page only reads persistent memory and previews context from
        the local backend. It does not expose secrets, mutate stored memory, or
        bypass approval-gated actions.
      </p>
    </div>
  );
}
