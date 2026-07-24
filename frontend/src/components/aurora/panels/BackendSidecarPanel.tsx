import type { BackendSidecarStatus } from "@/types/orion";
import { GlassPanel } from "@/components/aurora/glass-panel";

export function BackendSidecarPanel({
  status,
  loading,
  message,
  refreshStatus,
  runAction,
}: {
  status: BackendSidecarStatus | null;
  loading: boolean;
  message: string;
  refreshStatus: () => void;
  runAction: (action: "start" | "stop" | "restart") => void;
}) {
  return (
    <GlassPanel className="border-cyan-400/20 bg-white/[0.06] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Backend Sidecar</h2>
          <p className="text-sm text-slate-400">
            Local backend process manager and one-click desktop launch support
          </p>
        </div>
        <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
          v4.3
        </span>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => runAction("start")}
            disabled={loading}
            className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
          >
            Start
          </button>
          <button
            onClick={() => runAction("restart")}
            disabled={loading}
            className="rounded-2xl border border-violet-400/30 px-4 py-3 text-sm font-bold text-violet-200 transition hover:bg-violet-500/10 disabled:opacity-60"
          >
            Restart
          </button>
          <button
            onClick={() => runAction("stop")}
            disabled={loading}
            className="rounded-2xl border border-red-400/30 px-4 py-3 text-sm font-bold text-red-200 transition hover:bg-red-500/10 disabled:opacity-60"
          >
            Stop
          </button>
        </div>

        <button
          onClick={refreshStatus}
          disabled={loading}
          className="w-full rounded-2xl border border-cyan-400/30 px-4 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/10 disabled:opacity-60"
        >
          {loading ? "Checking..." : "Check Sidecar Status"}
        </button>

        {message && <p className="text-xs leading-5 text-cyan-200">{message}</p>}

        {!status ? (
          <p className="text-sm text-slate-500">Backend sidecar status has not loaded yet.</p>
        ) : (
          <div
            className={`rounded-2xl border p-4 ${
              status.port_open
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                : "border-red-400/30 bg-red-500/10 text-red-200"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.25em]">Sidecar Status</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <span className="text-3xl font-black">{status.status}</span>
              <span className="text-xs uppercase tracking-[0.2em]">
                PID {status.pid || "N/A"}
              </span>
            </div>
            <div className="mt-4 space-y-2 text-xs leading-5">
              <p><strong>Backend:</strong> {status.backend_url}</p>
              <p><strong>PID Running:</strong> {String(status.pid_running)}</p>
              <p><strong>Port Open:</strong> {String(status.port_open)}</p>
              <p className="break-all"><strong>Log:</strong> {status.log_file}</p>
              {status.last_error && <p><strong>Error:</strong> {status.last_error}</p>}
            </div>
          </div>
        )}

        {status && (
          <details className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-cyan-200">
              Sidecar Report
            </summary>
            <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">
              {status.report}
            </pre>
          </details>
        )}

        <p className="text-xs leading-5 text-slate-500">
          Safety: the sidecar only manages the local FastAPI backend on 127.0.0.1:8000. Tool execution remains approval-gated.
        </p>
      </div>
    </GlassPanel>
  );
}
