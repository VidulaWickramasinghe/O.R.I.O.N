"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  RefreshCw,
  Save,
} from "lucide-react";

import { GlassPanel } from "@/components/aurora/glass-panel";
import {
  getChangelogIntelligenceStatus,
  saveChangelogIntelligenceArtifacts,
} from "@/lib/api/changelog-intelligence";
import type { ChangelogIntelligenceResult } from "@/types/orion";

function StatusPill({ status }: { status?: string }) {
  const ready = status === "composer_ready";
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold ${
        ready
          ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
          : "border-amber-300/30 bg-amber-300/10 text-amber-200"
      }`}
    >
      {status || "unknown"}
    </span>
  );
}

export function ChangelogIntelligencePanel() {
  const [result, setResult] = useState<ChangelogIntelligenceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const checks = useMemo(() => result?.checks ?? [], [result]);

  async function refresh() {
    setLoading(true);
    setError("");

    try {
      const data = await getChangelogIntelligenceStatus();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load changelog intelligence.");
    } finally {
      setLoading(false);
    }
  }

  async function saveArtifacts() {
    setSaving(true);
    setError("");

    try {
      const data = await saveChangelogIntelligenceArtifacts();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changelog artifacts.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <GlassPanel className="border-cyan-300/20 bg-white/[0.055] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
            v6.3 Governance Module
          </p>
          <h2 className="mt-2 text-xl font-bold text-white">
            Changelog Intelligence
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Generates local changelog entries, GitHub release-note drafts, public
            summaries, raw patch notes, and safety-gated communication artifacts.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-200 transition hover:border-cyan-300/40 hover:text-cyan-200 disabled:opacity-50"
          >
            <RefreshCw size={14} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button
            type="button"
            onClick={saveArtifacts}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2 text-xs font-bold text-slate-950 transition hover:scale-[1.02] disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? "Saving..." : "Save Artifacts"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-100">
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-slate-500">Status</p>
          <div className="mt-2">
            <StatusPill status={result?.status} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-slate-500">Patch Version</p>
          <p className="mt-2 text-lg font-bold text-white">
            {result?.patch_version ?? "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-slate-500">Checks Passed</p>
          <p className="mt-2 text-lg font-bold text-emerald-200">
            {result?.passed ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-slate-500">Checks Failed</p>
          <p className="mt-2 text-lg font-bold text-amber-200">
            {result?.failed ?? 0}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h3 className="text-sm font-bold text-white">Composer Checks</h3>
          <div className="mt-3 space-y-2">
            {checks.map((check) => (
              <div
                key={check.name}
                className="rounded-xl border border-white/10 bg-white/[0.035] p-3"
              >
                <div className="flex items-center gap-2">
                  {check.ok ? (
                    <CheckCircle2 size={15} className="text-emerald-300" />
                  ) : (
                    <AlertTriangle size={15} className="text-amber-300" />
                  )}
                  <p className="text-sm font-semibold text-slate-100">
                    {check.name}
                  </p>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {check.details}
                </p>
              </div>
            ))}

            {!checks.length && (
              <p className="text-sm text-slate-500">
                No checks loaded yet. Refresh the panel.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-cyan-300" />
            <h3 className="text-sm font-bold text-white">Public Summary</h3>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
            {result?.public_summary || "No public summary loaded yet."}
          </p>
        </div>
      </div>

      {result?.report && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
          <h3 className="text-sm font-bold text-white">Report Preview</h3>
          <pre className="mt-3 max-h-[320px] overflow-auto whitespace-pre-wrap rounded-xl bg-black/30 p-4 text-xs leading-5 text-slate-400">
            {result.report}
          </pre>
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Safety: this panel only reads local status and saves local draft artifacts.
        It does not push, publish, mutate GitHub releases, or bypass approvals.
      </p>
    </GlassPanel>
  );
}
