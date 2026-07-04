import { ActivityEvent, ProjectItem, WorkspaceItem } from "./aurora-types";
import { AuroraStatusPill } from "./aurora-status-pill";

type AuroraContextPanelProps = {
  projects: ProjectItem[];
  workspaces: WorkspaceItem[];
  activity: ActivityEvent[];
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
};

export function AuroraContextPanel({
  projects,
  workspaces,
  activity,
  collapsed,
  setCollapsed,
}: AuroraContextPanelProps) {
  const currentProject = projects[0];

  if (collapsed) {
    return (
      <aside className="hidden h-screen w-[72px] shrink-0 border-l border-white/10 bg-[#05070B]/95 p-3 xl:block">
        <button
          onClick={() => setCollapsed(false)}
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20"
          title="Expand context panel"
        >
          →
        </button>

        <div className="mt-5 flex flex-col items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-cyan-300" />
          <div className="h-2 w-2 rounded-full bg-violet-300" />
          <div className="h-2 w-2 rounded-full bg-emerald-300" />
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden h-screen w-[360px] shrink-0 overflow-y-auto border-l border-white/10 bg-[#05070B]/95 p-5 xl:block">
      <p className="text-xs uppercase tracking-[0.45em] text-slate-500">
        Context
      </p>

      <h2 className="mt-4 text-2xl font-black text-white">
        Mission Awareness
      </h2>

      <button
        onClick={() => setCollapsed(true)}
        className="mt-4 rounded-2xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10"
      >
        Collapse Context
      </button>

      <div className="mt-6 space-y-5">
        <Panel title="Current Project">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-white">
              {currentProject?.name || "No active project"}
            </h3>
            <AuroraStatusPill tone="cyan">
              {currentProject?.status || "Idle"}
            </AuroraStatusPill>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-400">
            {currentProject?.description ||
              "Register a project to activate mission context."}
          </p>
        </Panel>

        <Panel title="Memory Used">
          <div className="space-y-3 text-sm text-slate-400">
            <p>Design language</p>
            <p>Agent architecture</p>
            <p>Project goals</p>
          </div>
        </Panel>

        <Panel title="Execution Plan">
          <ol className="space-y-3 text-sm text-slate-400">
            <li>1. Stabilize Aurora OS shell</li>
            <li>2. Add module routing</li>
            <li>3. Reconnect panels cleanly</li>
            <li>4. Prepare v2.7 knowledge base</li>
          </ol>
        </Panel>

        <Panel title="Live Tool Feed">
          <div className="space-y-3">
            {activity.slice(0, 5).length === 0 ? (
              <p className="text-sm text-slate-500">No live tool activity.</p>
            ) : (
              activity.slice(0, 5).map((event) => (
                <div key={event.id} className="text-sm text-slate-400">
                  <span className="text-cyan-300">{event.type}</span> —{" "}
                  {event.message}
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Workspaces">
          <div className="space-y-2 text-sm text-slate-400">
            {workspaces.slice(0, 4).map((workspace) => (
              <p key={workspace.id}>{workspace.name}</p>
            ))}
            {workspaces.length === 0 && <p>No workspaces registered.</p>}
          </div>
        </Panel>
      </div>
    </aside>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
      <h3 className="mb-4 text-base font-bold text-white">{title}</h3>
      {children}
    </section>
  );
}
