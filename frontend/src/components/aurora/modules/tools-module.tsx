"use client";

import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuroraApprovals } from "../lib/aurora-queries";
import {
  ApprovalStatusBadge,
  ApprovalCard,
  ConfirmationDialog,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "../operational-ui";
import type { ApprovalItem } from "../aurora-types";
import { api } from "@/lib/api/client";
import { ModuleShell } from "./module-shell";

type ToolsModuleProps = {
  title?: string;
  description?: string;
  onAssistantMessage: (message: string) => void;
  pendingOnly?: boolean;
};

type ApprovalDecisionResponse = {
  status: string;
  approval_id: number;
  result: string;
  execution?: Record<string, unknown> | null;
  continuation?: Record<string, unknown> | null;
  replayed: boolean;
};

export function approvalDecisionMessage(action: "approve" | "reject", data: ApprovalDecisionResponse) {
  const replay = data.replayed ? " Existing terminal state was returned; no action ran again." : "";
  if (data.status === "approved") return `Approval ${data.approval_id} approved.${replay}\n\n${data.result}`;
  if (data.status === "rejected") return `Approval ${data.approval_id} rejected.${replay}\n\n${data.result}`;
  if (data.status === "executing") return `Approval ${data.approval_id} is already executing. No duplicate execution was started.`;
  if (data.status === "failed") return `Approval ${data.approval_id} execution failed.\n\n${data.result}`;
  return `Approval ${data.approval_id} was not ${action === "approve" ? "approved" : "rejected"}; current state: ${data.status}.${replay}`;
}

export function ToolsModule({
  title = "Tools",
  description = "Command approvals, safety gates, tool execution, and security workflow.",
  onAssistantMessage,
  pendingOnly = false,
}: ToolsModuleProps) {
  const queryClient = useQueryClient();
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const approvalsQuery = useAuroraApprovals(
    pendingOnly ? ["pending", "executing"] : undefined,
  );
  const allApprovals = (approvalsQuery.data?.approvals || []) as ApprovalItem[];
  const approvals = allApprovals;

  async function approve(id: number) {
    const approval = allApprovals.find((item) => item.id === id);
    if (!approval?.idempotency_key) {
      onAssistantMessage(`Approval ${id} is missing its idempotency key and was blocked before execution.`);
      return;
    }
    setWorkingId(id);
    try {
      const data = await api.post<ApprovalDecisionResponse>(
        `/api/approvals/${id}/approve`,
        undefined,
        { headers: { "Idempotency-Key": approval.idempotency_key } },
      );
      onAssistantMessage(approvalDecisionMessage("approve", data));
      await queryClient.invalidateQueries({ queryKey: ["aurora-approvals"] });
      await queryClient.invalidateQueries({ queryKey: ["aurora-activity"] });
    } catch (error) {
      onAssistantMessage(error instanceof Error ? error.message : `Approval ${id} failed.`);
    } finally {
      setWorkingId(null);
    }
  }

  async function reject(id: number, reason: string) {
    setWorkingId(id);
    try {
      const data = await api.post<ApprovalDecisionResponse>(
        `/api/approvals/${id}/reject`,
        { reason },
      );
      onAssistantMessage(approvalDecisionMessage("reject", data));
      await queryClient.invalidateQueries({ queryKey: ["aurora-approvals"] });
      await queryClient.invalidateQueries({ queryKey: ["aurora-activity"] });
    } catch (error) {
      onAssistantMessage(error instanceof Error ? error.message : `Approval ${id} could not be rejected.`);
    } finally {
      setWorkingId(null);
      setRejectingId(null);
      setRejectionReason("");
    }
  }

  return (
    <ModuleShell
      title={title}
      description={description}
      badge={`${allApprovals.filter((item) => item.status === "pending").length} waiting · ${allApprovals.filter((item) => item.status === "executing").length} executing`}
    >
      {approvalsQuery.isLoading ? <LoadingSkeleton label="Loading approvals" /> : null}
      {approvalsQuery.isError ? (
        <ErrorState
          title="Approval queue unavailable"
          description="The approval endpoint could not be read. No decisions can be made until the authenticated backend reconnects."
          onRetry={() => void approvalsQuery.refetch()}
        />
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {!approvalsQuery.isLoading && !approvalsQuery.isError && approvals.length === 0 ? (
          <EmptyState
            title={pendingOnly ? "No actions are waiting" : "No approval records"}
            description={pendingOnly ? "O.R.I.O.N. has no pending side effects that need your decision." : "Approval requests will appear here with their mission ownership, risk, and normalized arguments."}
          />
        ) : (
          approvals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              title={`#${approval.id} — ${approval.title}`}
              description={approval.description}
              risk={approval.risk_level}
              metadata={
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <ApprovalStatusBadge status={approval.status} />
                    <span>Capability: {approval.action_type}</span>
                    <span>Source: {approval.source || "unavailable"}</span>
                  </div>
                  {approval.mission_id ? (
                    <p>
                      Owner: <Link className="font-semibold text-cyan-200 hover:text-cyan-100" href="/missions">Mission #{approval.mission_id}</Link>
                      {approval.step_id ? ` · Step #${approval.step_id}` : ""}
                      {approval.run_id ? ` · Run #${approval.run_id}` : ""}
                    </p>
                  ) : (
                    <p>Owner: direct authenticated user action</p>
                  )}
                  <details className="rounded-xl border border-white/10 bg-black/25 p-3">
                    <summary className="cursor-pointer font-semibold text-slate-300">Inspect normalized arguments</summary>
                    <pre className="orion-scrollbar mt-2 max-h-44 overflow-auto whitespace-pre-wrap break-all text-[10px] leading-5 text-slate-400">{JSON.stringify(approval.payload || {}, null, 2)}</pre>
                    {approval.payload_hash ? <p className="mt-2 break-all text-[10px] text-slate-600">Payload hash: {approval.payload_hash}</p> : null}
                  </details>
                  {approval.result ? <pre className="max-h-36 overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[10px] leading-5 text-slate-400">{approval.result}</pre> : null}
                  {approval.status === "executing" ? <p role="status" className="rounded-xl border border-amber-300/20 bg-amber-300/[0.05] p-3 text-xs text-amber-100">Execution was claimed. O.R.I.O.N. will recover or resolve its durable continuation; approving again cannot start a duplicate.</p> : null}
                  {approval.continuation ? <details className="rounded-xl border border-white/10 p-3"><summary className="cursor-pointer text-slate-300">Mission continuation</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap text-[10px] text-slate-400">{JSON.stringify(approval.continuation, null, 2)}</pre></details> : null}
                </div>
              }
              actions={approval.status === "pending" ? (
                <>
                  <button
                    onClick={() => void approve(approval.id)}
                    disabled={workingId !== null || !approval.idempotency_key}
                    title={!approval.idempotency_key ? "Blocked: approval idempotency key unavailable" : undefined}
                    className="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-50"
                  >
                    {workingId === approval.id ? "Executing…" : "Approve once"}
                  </button>
                  <button
                    onClick={() => {
                      setRejectingId(approval.id);
                      setRejectionReason("");
                    }}
                    disabled={workingId !== null}
                    className="rounded-xl border border-red-400/30 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </>
              ) : undefined}
            />
          ))
        )}
      </div>
      <ConfirmationDialog
        open={rejectingId !== null}
        title={`Reject approval #${rejectingId ?? ""}?`}
        description="Rejection stops this requested side effect and is recorded with the owning mission continuation. Add a concise operational reason."
        confirmLabel={workingId !== null ? "Rejecting…" : "Reject with reason"}
        confirmDisabled={!rejectionReason.trim() || workingId !== null}
        onClose={() => {
          if (workingId === null) {
            setRejectingId(null);
            setRejectionReason("");
          }
        }}
        onConfirm={() => {
          if (rejectingId !== null && rejectionReason.trim()) {
            void reject(rejectingId, rejectionReason.trim());
          }
        }}
      >
        <label className="block text-xs font-semibold text-slate-300">
          Rejection reason
          <textarea
            autoFocus
            value={rejectionReason}
            maxLength={500}
            onChange={(event) => setRejectionReason(event.target.value)}
            placeholder="Explain why this action must not run"
            className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-cyan-300/40"
          />
          <span className="mt-1 block text-[11px] text-slate-400">{rejectionReason.length}/500 · Required</span>
        </label>
      </ConfirmationDialog>
    </ModuleShell>
  );
}
