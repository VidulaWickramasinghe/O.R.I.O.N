import { WorkspaceItem } from "../aurora-types";
import { ModuleShell } from "./module-shell";

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
  async function desktopAction(workspaceId: number, action: string) {
    const endpointMap: Record<string, string> = {
      vscode: "open-vscode",
      folder: "open-folder",
      dev: "start-dev",
    };

    const endpoint = endpointMap[action];

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/desktop/workspaces/${workspaceId}/${endpoint}`,
        { method: "POST" }
      );

      const data = await response.json();

      onAssistantMessage(
        `Desktop Control: ${data.status}\n\n${data.message}\n\n${
          data.approval_id
            ? `Approval Request ID: ${data.approval_id}. Approve it in Security / Tools.`
            : ""
        }`
      );

      await refresh();
    } catch {
      onAssistantMessage("Desktop action failed.");
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
          <div className="rounded-3xl border border-white/10 bg-black/30 p-6 text-sm text-slate-500">
            No workspaces registered yet.
          </div>
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

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={() => desktopAction(workspace.id, "vscode")}
                  className="rounded-xl border border-cyan-400/30 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/10"
                >
                  VS Code
                </button>

                <button
                  onClick={() => desktopAction(workspace.id, "folder")}
                  className="rounded-xl border border-white/20 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
                >
                  Folder
                </button>

                <button
                  onClick={() => desktopAction(workspace.id, "dev")}
                  className="rounded-xl border border-emerald-400/30 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/10"
                >
                  Start Dev
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </ModuleShell>
  );
}
