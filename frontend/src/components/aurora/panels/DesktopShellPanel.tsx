import type { DesktopShellStatus } from "@/types/orion";
import { GlassPanel } from "@/components/aurora/glass-panel";

export function DesktopShellPanel({
  status,
  loading,
  refreshStatus,
}: {
  status: DesktopShellStatus | null;
  loading: boolean;
  refreshStatus: () => void;
}) {
  return (
    <GlassPanel className="border-cyan-400/20 bg-white/[0.06] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Desktop App Shell</h2>
          <p className="text-sm text-slate-400">
            Tauri desktop wrapper, backend connection, and packaged app status
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
          className="w-full rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
        >
          {loading ? "Checking..." : "Check Desktop Shell"}
        </button>

        {!status ? (
          <p className="text-sm text-slate-500">Desktop shell status has not loaded yet.</p>
        ) : (
          <div
            className={`rounded-2xl border p-4 ${
              status.status === "online"
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                : "border-red-400/30 bg-red-500/10 text-red-200"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.25em]">Shell Status</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <span className="text-3xl font-black">{status.status}</span>
              <span className="text-xs uppercase tracking-[0.2em]">{status.shell_version}</span>
            </div>
            <div className="mt-4 space-y-2 text-xs leading-5">
              <p><strong>App:</strong> {status.app_name}</p>
              <p><strong>Backend:</strong> {status.backend_url}</p>
              <p><strong>Mode:</strong> {status.frontend_mode}</p>
              <p>{status.message}</p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Launch Notes</p>
          <p className="mt-3 text-xs leading-5 text-slate-400">
            Start the FastAPI backend first, then run the Tauri desktop shell. In this version, the packaged app connects to the local backend at 127.0.0.1:8000.
          </p>
        </div>
      </div>
    </GlassPanel>
  );
}
