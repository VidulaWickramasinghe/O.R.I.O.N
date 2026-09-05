"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { ToolPermissionPanel } from "@/components/aurora/panels/ToolPermissionPanel";
import { ToolsModule } from "@/components/aurora/modules/tools-module";
import { ErrorState, LoadingSkeleton } from "@/components/aurora/operational-ui";
import { getToolPermissions } from "@/lib/api/tools";

function metricValue(
  source: Record<string, unknown> | undefined,
  key: string,
  fallback = "0",
) {
  const value = source?.[key];

  return value === undefined || value === null
    ? fallback
    : String(value);
}

export function ToolsWorkspace({ focus = "catalog" }: { focus?: "catalog" | "approvals" }) {
  const [message, setMessage] = useState("");
  const permissionsQuery = useQuery({
    queryKey: ["tool-permissions"],
    queryFn: getToolPermissions,
    enabled: focus === "catalog",
  });
  const toolPermissionMatrix = permissionsQuery.data?.matrix ?? [];
  const toolPermissionMetrics = permissionsQuery.data?.metrics ?? {};
  const toolPermissionReport = permissionsQuery.data?.report ?? "";

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
        <header className="rounded-3xl border border-cyan-300/15 bg-black/25 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
            {focus === "approvals" ? "Human decision queue" : "Capability catalogue"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">
            {focus === "approvals" ? "Approvals" : "Tools and execution policy"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            {focus === "approvals"
              ? "Inspect mission ownership, normalized arguments, risk, and expected effects before allowing or rejecting a side effect."
              : "Inspect capability permissions and the live approval boundary enforced by O.R.I.O.N.'s gateway."}
          </p>

          <Link
            href="/plugins"
            className="mt-4 inline-flex rounded-xl border border-violet-300/15 px-3 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-300/[0.05]"
          >
            Manage Plugins →
          </Link>
        </header>

        {message && (
          <section className="rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">
              Latest approval result
            </p>
            <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">
              {message}
            </pre>
          </section>
        )}

        {focus === "catalog" ? (
          <>
            {permissionsQuery.isLoading ? <LoadingSkeleton label="Loading capability catalogue" /> : null}
            {permissionsQuery.isError ? <ErrorState title="Capability catalogue unavailable" description="Tool availability and effective policy could not be read. No capability should be assumed available." onRetry={() => void permissionsQuery.refetch()} /> : null}
            {permissionsQuery.data ? <ToolPermissionPanel
              matrix={toolPermissionMatrix}
              metrics={toolPermissionMetrics}
              report={toolPermissionReport}
              metricValue={metricValue}
            /> : null}
          </>
        ) : null}

        {focus === "approvals" ? (
          <ToolsModule
            title="Approval Queue"
            description="Live backend approval requests for command, desktop, workspace, and developer actions."
            onAssistantMessage={setMessage}
            pendingOnly
          />
        ) : (
          <p className="rounded-2xl border border-white/10 bg-black/25 p-4 text-xs leading-5 text-slate-400">
            Side-effect decisions are intentionally separated from the catalogue. Open the dedicated <Link href="/approvals" className="font-semibold text-amber-200 hover:text-amber-100">Approval queue</Link> to inspect and decide a request.
          </p>
        )}

        <p className="rounded-2xl border border-white/10 bg-black/25 p-4 text-xs leading-5 text-slate-500">
          Safety: this page does not execute commands directly. It only sends approve
          or reject decisions to the existing backend approval endpoints.
        </p>
    </div>
  );
}
