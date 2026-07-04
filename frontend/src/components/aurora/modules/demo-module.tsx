"use client";

import { useEffect, useState } from "react";

import { DemoStatus } from "../aurora-types";
import { ModuleShell } from "./module-shell";

export function DemoModule() {
  const [demoStatus, setDemoStatus] = useState<DemoStatus | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadDemoStatus() {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/demo/status");
      const data = await response.json();
      setDemoStatus(data);
    } catch {
      setDemoStatus(null);
    }
  }

  async function toggleDemo(enabled: boolean) {
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/demo/mode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled }),
      });

      const data = await response.json();
      setDemoStatus(data);
    } finally {
      setLoading(false);
    }
  }

  async function generatePack() {
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/demo/release-pack", {
        method: "POST",
      });

      const data = await response.json();
      setFiles(data.files || []);
      await loadDemoStatus();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDemoStatus();
  }, []);

  return (
    <ModuleShell
      title="Demo"
      description="Portfolio release pack, demo readiness, screenshots, and presentation mode."
      badge={demoStatus?.demo_mode ? "enabled" : "disabled"}
    >
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-3xl border border-white/10 bg-black/30 p-5">
          <h3 className="text-lg font-bold text-white">Portfolio Demo Mode</h3>

          <div className="mt-5 grid gap-3">
            <button
              onClick={() => toggleDemo(true)}
              disabled={loading}
              className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-60"
            >
              Enable Demo
            </button>

            <button
              onClick={() => toggleDemo(false)}
              disabled={loading}
              className="rounded-2xl border border-white/20 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-white/10 disabled:opacity-60"
            >
              Disable Demo
            </button>

            <button
              onClick={generatePack}
              disabled={loading}
              className="rounded-2xl border border-violet-400/30 px-4 py-3 text-sm font-bold text-violet-200 hover:bg-violet-500/10 disabled:opacity-60"
            >
              Generate Portfolio Release Pack
            </button>
          </div>

          {files.length > 0 && (
            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">
                Generated Files
              </p>
              <div className="mt-3 space-y-1">
                {files.map((file) => (
                  <p key={file} className="break-all text-xs text-slate-300">
                    {file}
                  </p>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-black/30 p-5">
          <h3 className="text-lg font-bold text-white">Demo Readiness</h3>

          <pre className="mt-4 max-h-[650px] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs leading-6 text-slate-300">
            {demoStatus?.readiness_report || "No demo readiness report yet."}
          </pre>
        </section>
      </div>
    </ModuleShell>
  );
}
