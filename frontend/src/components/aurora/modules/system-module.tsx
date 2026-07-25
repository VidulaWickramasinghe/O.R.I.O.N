"use client";

import { useState } from "react";

import { SystemDoctorResult } from "../aurora-types";
import { api } from "../lib/api-client";
import { ModuleShell } from "./module-shell";

export function SystemModule() {
  const [doctor, setDoctor] = useState<SystemDoctorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runDoctor() {
    setLoading(true);
    setError("");

    try {
      setDoctor(await api.get<SystemDoctorResult>("/api/system/doctor"));
    } catch {
      setError("System Doctor could not reach the backend. Start O.R.I.O.N. and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModuleShell
      title="Production Health"
      description="Installer, dependency, environment, backend, frontend, and release-readiness diagnostics."
      badge={doctor?.status || "v6.2 hardening"}
    >
      <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/[0.04] p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">System Doctor</p>
            <p className="mt-2 text-sm text-slate-400">Run a read-only readiness scan. Secret values are never returned.</p>
          </div>
          <button
            onClick={runDoctor}
            disabled={loading}
            className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? "Running Doctor..." : "Run System Doctor"}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
          {error}
        </p>
      )}

      {!doctor && !error && (
        <p className="mt-5 text-sm text-slate-500">No scan has run in this session.</p>
      )}

      {doctor && (
        <div className="mt-6 grid gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Metric label="Status" value={doctor.status} tone="cyan" />
            <Metric label="Passed" value={String(doctor.passed)} tone="emerald" />
            <Metric label="Needs attention" value={String(doctor.failed)} tone={doctor.failed ? "red" : "emerald"} />
          </div>

          <div className="grid gap-3">
            {doctor.checks.map((check) => (
              <div key={check.name} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-white">{check.name}</h3>
                  <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${check.ok ? "border-emerald-400/30 text-emerald-200" : "border-red-400/30 text-red-200"}`}>
                    {check.ok ? "pass" : "check"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-400">{check.details}</p>
                <p className="mt-1 text-xs text-slate-500">{check.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </ModuleShell>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "cyan" | "emerald" | "red" }) {
  const toneClass = { cyan: "text-cyan-200", emerald: "text-emerald-200", red: "text-red-200" }[tone];
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className={`mt-3 text-2xl font-black ${toneClass}`}>{value}</p>
    </div>
  );
}
