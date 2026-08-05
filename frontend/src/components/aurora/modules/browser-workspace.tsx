"use client";

import { useState } from "react";

import { BrowserModule } from "@/components/aurora/modules/browser-module";

export function BrowserWorkspace() {
  const [message, setMessage] = useState("");

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <header className="rounded-3xl border border-cyan-300/15 bg-black/25 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
          Live browser research
        </p>

        <h1 className="mt-2 text-3xl font-semibold text-white">
          Public webpage research and extraction
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Research public web pages through the local O.R.I.O.N. backend, review
          extracted content, and keep browser/research actions visible inside Aurora OS.
        </p>
      </header>

      {message && (
        <section className="rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">
            Latest browser research result
          </p>

          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">
            {message}
          </pre>
        </section>
      )}

      <BrowserModule onAssistantMessage={setMessage} />

      <p className="rounded-2xl border border-white/10 bg-black/25 p-4 text-xs leading-5 text-slate-500">
        Safety: this page uses the backend browser research endpoint for public
        webpage inspection. It does not directly open desktop browser windows or
        bypass approval-gated desktop actions.
      </p>
    </div>
  );
}
