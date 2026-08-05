"use client";

import { useEffect, useState } from "react";

import { DesktopShellPanel } from "@/components/aurora/panels/DesktopShellPanel";
import { BackendSidecarPanel } from "@/components/aurora/panels/BackendSidecarPanel";
import { SystemModule } from "@/components/aurora/modules/system-module";
import { getDesktopShellStatus } from "@/lib/api/desktop";
import {
  getBackendSidecarStatus,
  runBackendSidecarAction,
} from "@/lib/api/sidecar";
import { getSystemStatus } from "@/lib/api/status";
import type { BackendSidecarStatus, DesktopShellStatus } from "@/types/orion";

type StatusRecord = Record<string, unknown>;

function text(value: unknown, fallback = "Unavailable") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export function SystemLiveWorkspace() {
  const [systemStatus, setSystemStatus] = useState<StatusRecord | null>(null);
  const [desktopShellStatus, setDesktopShellStatus] =
    useState<DesktopShellStatus | null>(null);
  const [backendSidecarStatus, setBackendSidecarStatus] =
    useState<BackendSidecarStatus | null>(null);

  const [systemLoading, setSystemLoading] = useState(false);
  const [desktopShellLoading, setDesktopShellLoading] = useState(false);
  const [backendSidecarLoading, setBackendSidecarLoading] = useState(false);
  const [backendSidecarMessage, setBackendSidecarMessage] = useState("");
  const [error, setError] = useState("");

  async function loadSystemStatus() {
    setSystemLoading(true);
    setError("");

    try {
      const data = await getSystemStatus();
      setSystemStatus(data as StatusRecord);
    } catch {
      setSystemStatus(null);
      setError("System status failed to load. Confirm the backend is running.");
    } finally {
      setSystemLoading(false);
    }
  }

  async function loadDesktopShellStatus() {
    setDesktopShellLoading(true);

    try {
      setDesktopShellStatus(await getDesktopShellStatus());
    } catch {
      setDesktopShellStatus(null);
    } finally {
      setDesktopShellLoading(false);
    }
  }

  async function loadBackendSidecarStatus() {
    setBackendSidecarLoading(true);

    try {
      setBackendSidecarStatus(await getBackendSidecarStatus());
    } catch {
      setBackendSidecarStatus(null);
    } finally {
      setBackendSidecarLoading(false);
    }
  }

  async function refreshAll() {
    await Promise.all([
      loadSystemStatus(),
      loadDesktopShellStatus(),
      loadBackendSidecarStatus(),
    ]);
  }

  async function runSidecarAction(action: "start" | "stop" | "restart") {
    setBackendSidecarLoading(true);
    setBackendSidecarMessage("");

    try {
      const data = await runBackendSidecarAction(action);
      setBackendSidecarStatus(data.sidecar);
      setBackendSidecarMessage(data.message || `Sidecar ${action} request completed.`);
    } catch {
      setBackendSidecarMessage(`Sidecar ${action} request failed.`);
    } finally {
      setBackendSidecarLoading(false);
    }
  }

  useEffect(() => {
    void refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeModules = list(systemStatus?.active_modules);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <header className="rounded-3xl border border-cyan-300/15 bg-black/25 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
              Live system operations
            </p>

            <h1 className="mt-2 text-3xl font-semibold text-white">
              Backend, sidecar, and diagnostics
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Inspect live O.R.I.O.N. backend status, desktop shell readiness,
              backend sidecar state, and read-only System Doctor diagnostics.
            </p>
          </div>

          <button
            onClick={() => void refreshAll()}
            disabled={systemLoading || desktopShellLoading || backendSidecarLoading}
            className="rounded-xl border border-cyan-400/30 px-4 py-3 text-xs font-bold text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-60"
          >
            {systemLoading || desktopShellLoading || backendSidecarLoading
              ? "Refreshing..."
              : "Refresh live status"}
          </button>
        </div>
      </header>

      {error && (
        <p role="alert" className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
          {error}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Backend"
          value={text(systemStatus?.status)}
          detail={`v${text(systemStatus?.version, "unknown")}`}
        />
        <MetricCard
          label="Mode"
          value={text(systemStatus?.mode)}
          detail={text(systemStatus?.tagline, "Think. Plan. Act. Learn.")}
        />
        <MetricCard
          label="Desktop Shell"
          value={desktopShellStatus?.status || "Unchecked"}
          detail={desktopShellStatus?.frontend_mode || desktopShellStatus?.backend_url || "No shell telemetry"}
        />
        <MetricCard
          label="Backend Sidecar"
          value={backendSidecarStatus?.status || "Unchecked"}
          detail={backendSidecarStatus?.backend_url || "No sidecar telemetry"}
        />
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/25 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Active backend modules</h2>
            <p className="mt-1 text-sm text-slate-500">
              Reported directly by the backend status endpoint.
            </p>
          </div>

          <span className="rounded-full border border-cyan-400/20 px-3 py-1 text-xs font-bold text-cyan-200">
            {activeModules.length} modules
          </span>
        </div>

        <div className="mt-4 flex max-h-48 flex-wrap gap-2 overflow-auto">
          {activeModules.length === 0 ? (
            <p className="text-sm text-slate-500">
              No module list returned by /api/status.
            </p>
          ) : (
            activeModules.map((module) => (
              <span
                key={module}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300"
              >
                {module}
              </span>
            ))
          )}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <DesktopShellPanel
          status={desktopShellStatus}
          loading={desktopShellLoading}
          refreshStatus={loadDesktopShellStatus}
        />

        <BackendSidecarPanel
          status={backendSidecarStatus}
          loading={backendSidecarLoading}
          message={backendSidecarMessage}
          refreshStatus={loadBackendSidecarStatus}
          runAction={runSidecarAction}
        />
      </div>

      <SystemModule />

      <p className="rounded-2xl border border-white/10 bg-black/25 p-4 text-xs leading-5 text-slate-500">
        Safety: this system workspace reads local backend, shell, sidecar, and
        diagnostic state. Sidecar actions use existing local backend endpoints and
        do not bypass tool permissions or approval-gated execution.
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 break-words text-2xl font-black text-cyan-100">
        {value}
      </p>
      <p className="mt-2 break-words text-xs leading-5 text-slate-500">
        {detail}
      </p>
    </div>
  );
}
