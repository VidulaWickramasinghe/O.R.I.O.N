"use client";

import { useState } from "react";
import { FolderKanban, RefreshCw, ShieldCheck } from "lucide-react";

import { WorkspacesModule } from "@/components/aurora/modules/workspaces-module";
import { GlassPanel } from "@/components/aurora/glass-panel";
import { StatusChip } from "@/components/aurora/status-chip";
import { RecoveryState } from "@/components/aurora/feedback/RecoveryState";
import { useAuroraWorkspaces } from "@/components/aurora/lib/aurora-queries";
import type { WorkspaceItem } from "@/components/aurora/aurora-types";

export function WorkspacesLiveWorkspace() {
  const workspacesQuery = useAuroraWorkspaces();
  const workspaces = (workspacesQuery.data?.workspaces ?? []) as WorkspaceItem[];
  const [message, setMessage] = useState("");
  const loading = workspacesQuery.isFetching;
  const lastLoadedAt = workspacesQuery.dataUpdatedAt
    ? new Date(workspacesQuery.dataUpdatedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const loadWorkspaces = async () => {
    setMessage("");
    const result = await workspacesQuery.refetch();
    if (result.isError) {
      setMessage("Workspace list failed to load. Confirm the backend is running.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <header className="rounded-3xl border border-cyan-300/15 bg-black/25 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
              Live workspace manager
            </p>

            <h1 className="mt-2 text-3xl font-semibold text-white">
              Registered local workspaces
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Inspect backend-registered coding workspaces and request
              approval-gated desktop actions such as opening VS Code, opening a
              folder, or starting a dev server.
            </p>
          </div>

          <button
            onClick={() => void loadWorkspaces()}
            disabled={loading}
            className="rounded-xl border border-cyan-400/30 px-4 py-3 text-xs font-bold text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-60"
          >
            <RefreshCw className="inline" size={15} />{" "}
            {loading ? "Refreshing..." : "Refresh workspaces"}
          </button>
        </div>
      </header>

      {(message || workspacesQuery.isError) && (
        <RecoveryState
          code={workspacesQuery.isError ? "backend_offline" : "tool_failed"}
          description={message || "Workspace list failed to load. Confirm the backend is running."}
          onAction={() => void loadWorkspaces()}
          actionLabel="Refresh workspaces"
          compact
        />
      )}

      {loading && !workspacesQuery.data && (
        <RecoveryState code="loading" title="Loading trusted workspaces" description="Aurora OS is reading the backend workspace registry." focusOnChange={false} compact />
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Registered"
          value={String(workspaces.length)}
          detail="Loaded from /api/workspaces"
        />

        <MetricCard
          label="Last refresh"
          value={lastLoadedAt || "Unchecked"}
          detail="Local browser session"
        />

        <MetricCard
          label="Desktop actions"
          value="Approval-gated"
          detail="Requests create backend approvals first"
        />
      </section>

      <WorkspacesModule
        workspaces={workspaces}
        refresh={loadWorkspaces}
        onAssistantMessage={setMessage}
      />

      <GlassPanel className="p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <ShieldCheck size={18} className="text-emerald-300" />
          Workspace safety boundary
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          This page lists registered local workspaces and requests desktop
          actions through existing backend endpoints. It does not directly open
          files, run terminals, start servers, or bypass approval gates.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <StatusChip tone="success">
            <FolderKanban size={13} /> Backend workspace list
          </StatusChip>
          <StatusChip tone="warning">Manual approvals required</StatusChip>
          <StatusChip tone="primary">Local-first actions</StatusChip>
        </div>
      </GlassPanel>
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
