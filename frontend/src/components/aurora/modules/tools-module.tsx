"use client";

import { useQueryClient } from "@tanstack/react-query";

import { useAuroraApprovals } from "../lib/aurora-queries";
import { api } from "../lib/api-client";
import { ModuleShell } from "./module-shell";

type ToolsModuleProps = {
  title?: string;
  description?: string;
  onAssistantMessage: (message: string) => void;
};

export function ToolsModule({
  title = "Tools",
  description = "Command approvals, safety gates, tool execution, and security workflow.",
  onAssistantMessage,
}: ToolsModuleProps) {
  const queryClient = useQueryClient();
  const approvalsQuery = useAuroraApprovals();
  const approvals = approvalsQuery.data?.approvals || [];

  async function approve(id: number) {
    const data = await api.post<{ result: string }>(
      `/api/approvals/${id}/approve`
    );

    onAssistantMessage(`Approval ${id} approved.\n\n${data.result}`);

    await queryClient.invalidateQueries({ queryKey: ["aurora-approvals"] });
    await queryClient.invalidateQueries({ queryKey: ["aurora-activity"] });
  }

  async function reject(id: number) {
    const data = await api.post<{ result: string }>(
      `/api/approvals/${id}/reject`
    );

    onAssistantMessage(`Approval ${id} rejected.\n\n${data.result}`);

    await queryClient.invalidateQueries({ queryKey: ["aurora-approvals"] });
    await queryClient.invalidateQueries({ queryKey: ["aurora-activity"] });
  }

  return (
    <ModuleShell
      title={title}
      description={description}
      badge={`${approvals.filter((item: any) => item.status === "pending").length} pending`}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {approvals.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-black/30 p-6 text-sm text-slate-500">
            No approval requests yet.
          </div>
        ) : (
          approvals.map((approval: any) => (
            <div
              key={approval.id}
              className="rounded-3xl border border-white/10 bg-black/30 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full border border-cyan-400/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                  {approval.status}
                </span>
                <span className="text-xs text-slate-500">
                  Risk: {approval.risk_level}
                </span>
              </div>

              <h3 className="mt-4 font-bold text-white">
                #{approval.id} — {approval.title}
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {approval.description}
              </p>

              <p className="mt-3 text-xs text-slate-500">
                Type: {approval.action_type}
              </p>

              {approval.result && (
                <pre className="mt-3 max-h-36 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs text-slate-400">
                  {approval.result}
                </pre>
              )}

              {approval.status === "pending" && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => approve(approval.id)}
                    className="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950"
                  >
                    Approve
                  </button>

                  <button
                    onClick={() => reject(approval.id)}
                    className="rounded-xl border border-red-400/30 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-500/10"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </ModuleShell>
  );
}
