import type { BackendSidecarStatus } from "@/types/orion";
import { GlassPanel } from "@/components/aurora/glass-panel";

export function BackendSidecarPanel({
  status,
  loading,
  refreshStatus,
}: {
  status: BackendSidecarStatus | null;
  loading: boolean;
  refreshStatus: () => void;
}) {
  return (
    <GlassPanel className="border-cyan-400/20 bg-white/[0.06] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Backend Supervisor</h2>
          <p className="text-sm text-slate-400">
            Tauri-owned launch, health recovery, and shutdown
          </p>
        </div>
        <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
          v4.3
        </span>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        <button
          onClick={refreshStatus}
          disabled={loading}
          className="w-full rounded-2xl border border-cyan-400/30 px-4 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/10 disabled:opacity-60"
        >
          {loading ? "Checking..." : "Check Supervisor Status"}
        </button>

        {!status ? (
          <p className="text-sm text-slate-500">Backend supervisor status has not loaded yet.</p>
        ) : (
          <div
            className={`rounded-2xl border p-4 ${
              status.port_open
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                : "border-red-400/30 bg-red-500/10 text-red-200"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.25em]">Supervisor Status</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <span className="text-3xl font-black">{status.status}</span>
              <span className="text-xs uppercase tracking-[0.2em]">
                Generation {status.generation ?? "N/A"}
              </span>
            </div>
            <div className="mt-4 space-y-2 text-xs leading-5">
              <p><strong>Backend:</strong> {status.backend_url}</p>
              <p><strong>Child Owned:</strong> {String(status.child_owned ?? status.pid_running)}</p>
              <p><strong>Port Open:</strong> {String(status.port_open)}</p>
              <p><strong>Crash Restarts:</strong> {status.restarts ?? "N/A"}</p>
              <p><strong>Stopping:</strong> {String(status.stopping ?? false)}</p>
              {status.last_error && <p><strong>Error:</strong> {status.last_error}</p>}
            </div>
          </div>
        )}

        {status && (
          <details className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-cyan-200">
              Supervisor Report
            </summary>
            <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">
              {status.report}
            </pre>
          </details>
        )}

        <p className="text-xs leading-5 text-slate-500">
          Safety: only Tauri owns the live child-process handle. The backend and agent cannot signal or restart themselves.
        </p>
      </div>
    </GlassPanel>
  );
}
