"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FolderKanban,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { ProjectsModule } from "@/components/aurora/modules/projects-module";
import { GlassPanel } from "@/components/aurora/glass-panel";
import { StatusChip } from "@/components/aurora/status-chip";
import { getProject, getProjects } from "@/lib/api/projects";
import type { ProjectItem } from "@/components/aurora/aurora-types";

function text(value: unknown, fallback = "Unavailable") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export function ProjectsLiveWorkspace() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingKey, setLoadingKey] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState("");

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const data = await getProjects();
      const nextProjects = data.projects || [];
      setProjects(nextProjects);
      setLastLoadedAt(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );

      if (!selectedProject && nextProjects[0]) {
        setSelectedProject(nextProjects[0]);
      }
    } catch {
      setProjects([]);
      setSelectedProject(null);
      setMessage("Project list failed to load. Confirm the backend is running.");
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  async function inspectProject(projectKey: string) {
    setLoadingKey(projectKey);
    setMessage("");

    try {
      const project = await getProject(projectKey);
      setSelectedProject(project);
      setMessage(
        `Project opened from backend.\n\n${project.name}\nStatus: ${project.status}\nType: ${project.type}`,
      );
    } catch {
      setMessage("Project detail failed to load.");
    } finally {
      setLoadingKey("");
    }
  }

  function prepareAssistantPrompt(prompt: string) {
    setMessage(`Assistant prompt prepared:\n\n${prompt}`);
  }

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <header className="rounded-3xl border border-cyan-300/15 bg-black/25 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
              Live project launcher
            </p>

            <h1 className="mt-2 text-3xl font-semibold text-white">
              Backend project memory
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Load registered project records from the backend project manager.
              Static demo project cards, fake progress, fake health, and fake
              deployment metrics are not used on this route.
            </p>
          </div>

          <button
            onClick={() => void loadProjects()}
            disabled={loading}
            className="rounded-xl border border-cyan-400/30 px-4 py-3 text-xs font-bold text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-60"
          >
            <RefreshCw className="inline" size={15} />{" "}
            {loading ? "Refreshing..." : "Refresh projects"}
          </button>
        </div>
      </header>

      {message && (
        <pre className="whitespace-pre-wrap rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] p-4 text-sm leading-6 text-cyan-100">
          {message}
        </pre>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Registered projects"
          value={String(projects.length)}
          detail="Loaded from /api/projects"
        />

        <MetricCard
          label="Selected"
          value={selectedProject?.name || "None"}
          detail={selectedProject?.key || "No project selected"}
        />

        <MetricCard
          label="Last refresh"
          value={lastLoadedAt || "Unchecked"}
          detail="Local browser session"
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <ProjectsModule projects={projects} onAsk={prepareAssistantPrompt} />

          <GlassPanel className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                  <FolderKanban size={18} className="text-cyan-300" />
                  Project records
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Backend project launcher entries only.
                </p>
              </div>

              <StatusChip tone="primary">{projects.length} loaded</StatusChip>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {projects.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-slate-500 md:col-span-2">
                  No project records returned by /api/projects.
                </p>
              ) : (
                projects.map((project) => (
                  <article
                    key={project.key}
                    className={`rounded-2xl border p-4 ${
                      selectedProject?.key === project.key
                        ? "border-cyan-400/40 bg-cyan-400/[0.08]"
                        : "border-white/10 bg-white/[0.025]"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-white">{project.name}</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {project.key} · {project.type}
                        </p>
                      </div>

                      <StatusChip tone="secondary">
                        {text(project.status, "unknown")}
                      </StatusChip>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      {project.description || "No description available."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => void inspectProject(project.key)}
                        disabled={Boolean(loadingKey)}
                        className="rounded-xl border border-cyan-400/30 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-60"
                      >
                        <Search className="inline" size={14} />{" "}
                        {loadingKey === project.key ? "Opening..." : "Open"}
                      </button>

                      <button
                        onClick={() =>
                          prepareAssistantPrompt(
                            `Read the project called ${project.name}. Summarize current status and next best step.`,
                          )
                        }
                        className="rounded-xl border border-violet-400/30 px-3 py-2 text-xs font-bold text-violet-200 hover:bg-violet-500/10"
                      >
                        <Sparkles className="inline" size={14} /> Ask Orion
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </GlassPanel>
        </div>

        <aside className="space-y-5">
          <GlassPanel className="p-5">
            <h2 className="text-lg font-bold text-white">Selected project</h2>

            {!selectedProject ? (
              <p className="mt-3 text-sm text-slate-500">
                Select a backend project record to inspect details.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Name
                  </p>
                  <p className="mt-1 font-bold text-white">
                    {selectedProject.name}
                  </p>
                </div>

                <Detail label="Key" value={selectedProject.key} />
                <Detail label="Type" value={selectedProject.type} />
                <Detail label="Status" value={selectedProject.status} />
                <Detail label="Updated" value={selectedProject.updated_at || "Not reported"} />

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Description
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {selectedProject.description || "No description available."}
                  </p>
                </div>
              </div>
            )}
          </GlassPanel>

          <GlassPanel className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <ShieldCheck size={18} className="text-emerald-300" />
              Project safety boundary
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              This page reads backend project memory and prepares assistant
              prompts only. It does not modify project files, create commits,
              fake progress, or perform deployment actions.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <StatusChip tone="success">Backend project records</StatusChip>
              <StatusChip tone="warning">No fake metrics</StatusChip>
              <StatusChip tone="primary">Assistant handoff only</StatusChip>
            </div>
          </GlassPanel>
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm text-slate-300">{value}</p>
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
