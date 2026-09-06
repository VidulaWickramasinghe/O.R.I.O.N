"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { WorkspaceItem } from "../aurora-types";
import { runDesktopWorkspaceAction } from "@/lib/api/desktop";
import { ModuleShell } from "./module-shell";
import { RecoveryState } from "@/components/aurora/feedback/RecoveryState";

type WorkspacesModuleProps = {
  workspaces: WorkspaceItem[];
  onAssistantMessage: (message: string) => void;
  refresh: () => Promise<void>;
};

export function WorkspacesModule({
  workspaces,
  onAssistantMessage,
  refresh,
}: WorkspacesModuleProps) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<number | null>(null);
  async function desktopAction(workspaceId: number, action: string) {
    const endpointMap: Record<
      string,
      "open-vscode" | "open-folder" | "start-dev"
    > = {
      vscode: "open-vscode",
      folder: "open-folder",
      dev: "start-dev",
    };

    const endpoint = endpointMap[action];

    try {
      setPending(workspaceId);
      const data = await runDesktopWorkspaceAction(workspaceId, endpoint);
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ["aurora-approvals"] });
      onAssistantMessage(
        `Desktop Control: ${data.status}\n\n${data.message}\n\n${
          data.approval_id
            ? `Approval Request ID: ${data.approval_id}. Review it in Approvals. Nothing has executed yet.`
            : ""
        }`
      );

    } catch (error) {
      onAssistantMessage(error instanceof Error ? error.message : "Desktop action failed. Check workspace trust and retry.");
    } finally {
      setPending(null);
    }
  }

  return (
    <ModuleShell
      title="Workspaces"
      description="Local coding workspaces, stack detection, summaries, and approval-gated desktop actions."
      badge={`${workspaces.length} workspaces`}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {workspaces.length === 0 ? (
          <RecoveryState code="no_workspaces" actionHref="/workspaces#register-workspace" compact />
        ) : (
          workspaces.map((workspace) => (
            <div
              key={workspace.id}
              className="rounded-3xl border border-white/10 bg-black/30 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-white">{workspace.name}</h3>
                <span className="text-xs text-slate-500">ID {workspace.id}</span>
              </div>

              <p className="mt-3 break-all text-xs text-slate-500">
                {workspace.path}
              </p>

              <p className="mt-4 text-sm leading-6 text-slate-400">
                {workspace.description || "No description."}
              </p>

              <p className="mt-3 text-xs text-slate-300">{workspace.trusted && workspace.source_consent ? "Trusted · source consent recorded" : "Trust or source consent missing — register this folder with consent before requesting actions."}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  disabled={pending !== null || !workspace.trusted || !workspace.source_consent}
                  onClick={() => desktopAction(workspace.id, "vscode")}
                  className="rounded-xl border border-cyan-400/30 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/10"
                >
                  VS Code
                </button>

                <button
                  disabled={pending !== null || !workspace.trusted || !workspace.source_consent}
                  onClick={() => desktopAction(workspace.id, "folder")}
                  className="rounded-xl border border-white/20 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
                >
                  Folder
                </button>

                <button
                  disabled={pending !== null || !workspace.trusted || !workspace.source_consent}
                  onClick={() => desktopAction(workspace.id, "dev")}
                  className="rounded-xl border border-emerald-400/30 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/10"
                >
                  Request dev server (high risk)
                </button>
              </div>
              {pending === workspace.id && <p role="status" className="mt-2 text-xs text-cyan-200">Requesting approval…</p>}
              <Link href="/approvals" className="mt-4 inline-block text-sm text-cyan-200 underline">Review pending approvals</Link>
            </div>
          ))
        )}
      </div>
    </ModuleShell>
  );
}
