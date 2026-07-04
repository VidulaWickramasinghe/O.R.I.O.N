import { ProjectItem } from "../aurora-types";
import { ModuleShell } from "./module-shell";

type ProjectsModuleProps = {
  projects: ProjectItem[];
  onAsk: (message: string) => void;
};

export function ProjectsModule({ projects, onAsk }: ProjectsModuleProps) {
  return (
    <ModuleShell
      title="Projects"
      description="Project launcher, project memory, portfolio summaries, and current development status."
      badge={`${projects.length} projects`}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.length === 0 ? (
          <EmptyState text="No projects registered yet." />
        ) : (
          projects.map((project) => (
            <button
              key={project.key}
              onClick={() =>
                onAsk(
                  `Read the project called ${project.name}. Summarize current status and next best step.`
                )
              }
              className="rounded-3xl border border-white/10 bg-black/30 p-5 text-left transition hover:border-cyan-400/40 hover:bg-cyan-400/10"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-white">{project.name}</h3>
                <span className="rounded-full border border-cyan-400/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                  {project.status}
                </span>
              </div>

              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                {project.type}
              </p>

              <p className="mt-4 text-sm leading-6 text-slate-400">
                {project.description || "No description available."}
              </p>
            </button>
          ))
        )}
      </div>
    </ModuleShell>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-6 text-sm text-slate-500">
      {text}
    </div>
  );
}
