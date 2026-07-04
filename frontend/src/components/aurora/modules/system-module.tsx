"use client";

import { useState } from "react";

import { SystemDoctorResult } from "../aurora-types";
import { ModuleShell } from "./module-shell";

export function SystemModule() {
  const [doctor, setDoctor] = useState<SystemDoctorResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function runDoctor() {
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/system/doctor");
      const data = await response.json();
      setDoctor(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModuleShell
      title="System"
      description="Production health, installer checks, backend status, and diagnostics."
      badge={doctor?.status || "doctor"}
    >
      <button
        onClick={runDoctor}
        disabled={loading}
        className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-60"
      >
        {loading ? "Running..." : "Run System Doctor"}
      </button>

      {doctor && (
        <div className="mt-6 grid gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Metric label="Status" value={doctor.status} />
            <Metric label="Passed" value={String(doctor.passed)} />
            <Metric label="Failed" value={String(doctor.failed)} />
          </div>

          <div className="grid gap-3">
            {doctor.checks.map((check) => (
              <div
                key={check.name}
                className="rounded-2xl border border-white/10 bg-black/30 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-white">{check.name}</h3>
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
                      check.ok
                        ? "border-emerald-400/30 text-emerald-200"
                        : "border-red-400/30 text-red-200"
                    }`}
                  >
                    {check.ok ? "ok" : "check"}
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-400">{check.details}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {check.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </ModuleShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
    </div>
  );
}
