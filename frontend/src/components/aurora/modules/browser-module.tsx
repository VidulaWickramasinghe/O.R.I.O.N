"use client";

import { useState } from "react";

import { BrowserResearchResult } from "../aurora-types";
import { ModuleShell } from "./module-shell";

type BrowserModuleProps = {
  onAssistantMessage: (message: string) => void;
};

export function BrowserModule({ onAssistantMessage }: BrowserModuleProps) {
  const [url, setUrl] = useState("https://docs.python.org/3/");
  const [result, setResult] = useState<BrowserResearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function research() {
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/browser/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      setResult(data);

      onAssistantMessage(
        `Browser research completed.\n\nTitle: ${data.title || "N/A"}\nURL: ${
          data.url || url
        }`
      );
    } catch {
      onAssistantMessage("Browser research failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModuleShell
      title="Browser Research"
      description="Safe public webpage inspection and research extraction."
      badge="v2.8"
    >
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-3xl border border-white/10 bg-black/30 p-5">
          <h3 className="text-lg font-bold text-white">Research Page</h3>

          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="mt-4 w-full rounded-2xl border border-cyan-400/20 bg-black/40 px-4 py-3 text-sm outline-none ring-cyan-400/30 placeholder:text-slate-500 focus:ring-2"
          />

          <button
            onClick={research}
            disabled={loading}
            className="mt-4 w-full rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-60"
          >
            {loading ? "Researching..." : "Research"}
          </button>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            Safety: public pages only. No login, purchases, account changes, or
            form submissions.
          </p>
        </section>

        <section className="rounded-3xl border border-white/10 bg-black/30 p-5">
          <h3 className="text-lg font-bold text-white">Research Output</h3>

          <pre className="mt-4 max-h-[620px] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs leading-6 text-slate-300">
            {result?.content || "No browser research output yet."}
          </pre>
        </section>
      </div>
    </ModuleShell>
  );
}
