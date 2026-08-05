"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ToolsModule } from "@/components/aurora/modules/tools-module";

export function ToolsWorkspace() {
  const [message, setMessage] = useState("");
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        <header className="rounded-3xl border border-cyan-300/15 bg-black/25 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
            Live tools and approvals
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">
            Tool execution control
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Review pending approval requests, approve or reject backend-gated actions,
            and keep command execution visible through O.R.I.O.N.'s safety layer.
          </p>
        </header>

        {message && (
          <section className="rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">
              Latest approval result
            </p>
            <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">
              {message}
            </pre>
          </section>
        )}

        <ToolsModule
          title="Approval Queue"
          description="Live backend approval requests for command, desktop, workspace, and developer actions."
          onAssistantMessage={setMessage}
        />

        <p className="rounded-2xl border border-white/10 bg-black/25 p-4 text-xs leading-5 text-slate-500">
          Safety: this page does not execute commands directly. It only sends approve
          or reject decisions to the existing backend approval endpoints.
        </p>
      </div>
    </QueryClientProvider>
  );
}
