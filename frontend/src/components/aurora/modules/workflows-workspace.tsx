"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  GitBranch,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Workflow,
} from "lucide-react";

import { GlassPanel } from "@/components/aurora/glass-panel";
import { StatusChip } from "@/components/aurora/status-chip";
import {
  createWorkflowMission,
  getWorkflowBlueprint,
  getWorkflowBlueprints,
  type WorkflowBlueprintDetail,
  type WorkflowBlueprintItem,
} from "@/lib/api/workflows";

function safeText(value: unknown, fallback = "Unavailable") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function safeWorkspaceId(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function WorkflowsLiveWorkspace() {
  const [blueprints, setBlueprints] = useState<WorkflowBlueprintItem[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [selectedBlueprint, setSelectedBlueprint] =
    useState<WorkflowBlueprintDetail | null>(null);

  const [missionTitle, setMissionTitle] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [customGoal, setCustomGoal] = useState("");

  const [loadingKey, setLoadingKey] = useState("");
  const [message, setMessage] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState("");

  const selectedSummary = useMemo(
    () =>
      selectedBlueprint ||
      blueprints.find((blueprint) => blueprint.key === selectedKey) ||
      null,
    [blueprints, selectedBlueprint, selectedKey],
  );

  async function loadBlueprints() {
    setLoadingKey("blueprints");
    setMessage("");

    try {
      const data = await getWorkflowBlueprints();
      const nextBlueprints = data.blueprints || [];
      setBlueprints(nextBlueprints);
      setLastLoadedAt(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );

      if (!selectedKey && nextBlueprints[0]) {
        setSelectedKey(nextBlueprints[0].key);
      }
    } catch {
      setBlueprints([]);
      setMessage("Workflow blueprints failed to load. Confirm the backend is running.");
    } finally {
      setLoadingKey("");
    }
  }

  async function inspectBlueprint(key = selectedKey) {
    if (!key) {
      setMessage("Select a workflow blueprint first.");
      return;
    }

    setLoadingKey(`inspect-${key}`);
    setMessage("");

    try {
      const detail = await getWorkflowBlueprint(key);
      setSelectedBlueprint(detail);
      setSelectedKey(detail.key);
    } catch {
      setSelectedBlueprint(null);
      setMessage("Workflow blueprint failed to inspect.");
    } finally {
      setLoadingKey("");
    }
  }

  async function createMission(key = selectedKey) {
    if (!key) {
      setMessage("Select a workflow blueprint first.");
      return;
    }

    setLoadingKey(`create-${key}`);
    setMessage("");

    try {
      const data = await createWorkflowMission(key, safeWorkspaceId(workspaceId), {
        mission_title: missionTitle.trim(),
        custom_goal: customGoal.trim(),
      });

      if (data.status === "created") {
        setMessage(
          `Mission created from workflow blueprint.\n\nMission ID: ${data.mission_id}\nTitle: ${data.title}\nSteps: ${data.step_count}\nCreated: ${data.created_at}`,
        );
        setMissionTitle("");
        setCustomGoal("");
      } else {
        setMessage(data.message || "Mission creation did not complete.");
      }
    } catch {
      setMessage("Mission creation failed. Confirm the backend is running.");
    } finally {
      setLoadingKey("");
    }
  }

  useEffect(() => {
    void loadBlueprints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const busy = Boolean(loadingKey);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <header className="rounded-3xl border border-cyan-300/15 bg-black/25 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
              Live workflow blueprints
            </p>

            <h1 className="mt-2 text-3xl font-semibold text-white">
              Blueprint library and mission creation
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Load backend workflow blueprints, inspect their controlled step
              plans, and create approval-aware missions from known templates.
            </p>
          </div>

          <button
            onClick={() => void loadBlueprints()}
            disabled={busy}
            className="rounded-xl border border-cyan-400/30 px-4 py-3 text-xs font-bold text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-60"
          >
            <RefreshCw className="inline" size={15} />{" "}
            {loadingKey === "blueprints" ? "Refreshing..." : "Refresh blueprints"}
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
          label="Blueprints"
          value={String(blueprints.length)}
          detail="Loaded from /api/workflows/blueprints"
        />

        <MetricCard
          label="Selected"
          value={selectedSummary?.name || "None"}
          detail={selectedSummary?.key || "No blueprint selected"}
        />

        <MetricCard
          label="Last refresh"
          value={lastLoadedAt || "Unchecked"}
          detail="Local browser session"
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <GlassPanel className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <Workflow size={18} className="text-cyan-300" />
                Backend blueprint library
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Real blueprint records only. No static workflow cards.
              </p>
            </div>

            <StatusChip tone="primary">{blueprints.length} available</StatusChip>
          </div>

          <div className="mt-5 grid gap-3">
            {blueprints.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-slate-500">
                No workflow blueprints returned by the backend.
              </p>
            ) : (
              blueprints.map((blueprint) => (
                <article
                  key={blueprint.key}
                  className={`rounded-2xl border p-4 ${
                    selectedKey === blueprint.key
                      ? "border-cyan-400/40 bg-cyan-400/[0.08]"
                      : "border-white/10 bg-white/[0.025]"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-white">{blueprint.name}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {blueprint.key} · {blueprint.step_count} steps · Priority{" "}
                        {safeText(blueprint.priority, "normal")}
                      </p>
                    </div>

                    <StatusChip tone="secondary">blueprint</StatusChip>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    {blueprint.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setSelectedKey(blueprint.key);
                        setSelectedBlueprint(null);
                      }}
                      className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/[0.05]"
                    >
                      Select
                    </button>

                    <button
                      onClick={() => void inspectBlueprint(blueprint.key)}
                      disabled={busy}
                      className="rounded-xl border border-cyan-400/30 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-60"
                    >
                      <FileText className="inline" size={14} /> Inspect
                    </button>

                    <button
                      onClick={() => void createMission(blueprint.key)}
                      disabled={busy}
                      className="rounded-xl border border-violet-400/30 px-3 py-2 text-xs font-bold text-violet-200 hover:bg-violet-500/10 disabled:opacity-60"
                    >
                      <Rocket className="inline" size={14} /> Create Mission
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </GlassPanel>

        <aside className="space-y-5">
          <GlassPanel className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Rocket size={18} className="text-violet-300" />
              Create mission from blueprint
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Optional fields override the default blueprint title or goal.
              Leave blank to use backend defaults.
            </p>

            <label className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Blueprint
              <select
                value={selectedKey}
                onChange={(event) => {
                  setSelectedKey(event.target.value);
                  setSelectedBlueprint(null);
                }}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-cyan-400/40"
              >
                <option value="">Select blueprint</option>
                {blueprints.map((blueprint) => (
                  <option key={blueprint.key} value={blueprint.key}>
                    {blueprint.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Mission title
              <input
                value={missionTitle}
                onChange={(event) => setMissionTitle(event.target.value)}
                maxLength={200}
                placeholder="Leave blank to use blueprint title"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-cyan-400/40"
              />
            </label>

            <label className="mt-3 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Workspace ID
              <input
                value={workspaceId}
                onChange={(event) => setWorkspaceId(event.target.value)}
                inputMode="numeric"
                placeholder="Optional registered workspace ID"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-cyan-400/40"
              />
            </label>

            <label className="mt-3 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Custom goal
              <textarea
                value={customGoal}
                onChange={(event) => setCustomGoal(event.target.value)}
                maxLength={4000}
                placeholder="Leave blank to use the blueprint goal."
                className="mt-2 min-h-28 w-full resize-y rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-cyan-400/40"
              />
            </label>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => void inspectBlueprint()}
                disabled={!selectedKey || busy}
                className="rounded-xl border border-cyan-400/30 px-4 py-3 text-xs font-bold text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-60"
              >
                Inspect
              </button>

              <button
                onClick={() => void createMission()}
                disabled={!selectedKey || busy}
                className="rounded-xl bg-violet-300 px-4 py-3 text-xs font-bold text-violet-950 hover:bg-violet-200 disabled:opacity-60"
              >
                {loadingKey.startsWith("create-") ? "Creating..." : "Create Mission"}
              </button>
            </div>
          </GlassPanel>

          <GlassPanel className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <GitBranch size={18} className="text-cyan-300" />
              Selected blueprint
            </h2>

            {!selectedSummary ? (
              <p className="mt-3 text-sm text-slate-500">
                Select a blueprint to inspect its details.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="font-bold text-white">{selectedSummary.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedSummary.key}
                  </p>
                </div>

                <p className="text-sm leading-6 text-slate-400">
                  {selectedSummary.description}
                </p>

                {selectedBlueprint?.steps?.length ? (
                  <div className="space-y-2">
                    {selectedBlueprint.steps.map((step, index) => (
                      <div
                        key={`${step}-${index}`}
                        className="rounded-xl border border-white/10 bg-black/25 p-3 text-xs leading-5 text-slate-300"
                      >
                        <span className="text-cyan-300">Step {index + 1}:</span>{" "}
                        {step}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-white/10 bg-black/25 p-3 text-xs text-slate-500">
                    Inspect the blueprint to load its step details.
                  </p>
                )}

                {selectedBlueprint?.rendered && (
                  <details className="rounded-xl border border-white/10 bg-black/25 p-3">
                    <summary className="cursor-pointer text-sm font-bold text-cyan-200">
                      Rendered blueprint
                    </summary>
                    <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">
                      {selectedBlueprint.rendered}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </GlassPanel>
        </aside>
      </div>

      <GlassPanel className="p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <ShieldCheck size={18} className="text-emerald-300" />
          Workflow safety boundary
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          This route creates mission records from known backend workflow
          blueprints. It does not execute terminal commands, edit files, open
          desktop apps, or bypass mission approval gates.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <StatusChip tone="success">Backend blueprints</StatusChip>
          <StatusChip tone="warning">Mission execution stays approval-gated</StatusChip>
          <StatusChip tone="primary">No fake run counters</StatusChip>
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
