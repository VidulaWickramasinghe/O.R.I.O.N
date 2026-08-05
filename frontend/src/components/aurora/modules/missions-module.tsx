"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { MissionFlowGraph } from "../graphs/mission-flow-graph";
import { ModuleShell } from "./module-shell";
import {
  useAuroraMissions,
  useAuroraMissionRuns,
} from "../lib/aurora-queries";
import { api } from "../lib/api-client";
import {
  createWorkflowMission,
  getWorkflowBlueprint,
  getWorkflowBlueprints,
  type WorkflowBlueprintDetail,
  type WorkflowBlueprintItem,
} from "@/lib/api/workflows";

type MissionsModuleProps = {
  onAssistantMessage: (message: string) => void;
};

export function MissionsModule({ onAssistantMessage }: MissionsModuleProps) {
  const queryClient = useQueryClient();

  const missionsQuery = useAuroraMissions();
  const runsQuery = useAuroraMissionRuns();

  const missions = missionsQuery.data?.missions || [];
  const runs = runsQuery.data?.runs || [];

  const [loadingMissionId, setLoadingMissionId] = useState<number | null>(null);
  const [blueprints, setBlueprints] = useState<WorkflowBlueprintItem[]>([]);
  const [selectedBlueprintKey, setSelectedBlueprintKey] = useState("");
  const [selectedBlueprint, setSelectedBlueprint] =
    useState<WorkflowBlueprintDetail | null>(null);
  const [blueprintLoading, setBlueprintLoading] = useState(false);
  const [blueprintMessage, setBlueprintMessage] = useState("");
  const [missionTitle, setMissionTitle] = useState("");
  const [customGoal, setCustomGoal] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");

  async function refreshMissionData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["aurora-missions"] }),
      queryClient.invalidateQueries({ queryKey: ["aurora-mission-runs"] }),
      queryClient.invalidateQueries({ queryKey: ["aurora-activity"] }),
      queryClient.invalidateQueries({ queryKey: ["aurora-approvals"] }),
    ]);
  }

  async function loadBlueprints() {
    setBlueprintLoading(true);
    setBlueprintMessage("");

    try {
      const data = await getWorkflowBlueprints();
      const nextBlueprints = data.blueprints || [];
      setBlueprints(nextBlueprints);

      if (!selectedBlueprintKey && nextBlueprints[0]) {
        setSelectedBlueprintKey(nextBlueprints[0].key);
      }
    } catch {
      setBlueprints([]);
      setBlueprintMessage("Workflow blueprints failed to load. Confirm backend is running.");
    } finally {
      setBlueprintLoading(false);
    }
  }

  async function inspectBlueprint(blueprintKey = selectedBlueprintKey) {
    if (!blueprintKey) return;

    setBlueprintLoading(true);
    setBlueprintMessage("");

    try {
      const detail = await getWorkflowBlueprint(blueprintKey);
      setSelectedBlueprint(detail);
      setSelectedBlueprintKey(detail.key);
    } catch {
      setSelectedBlueprint(null);
      setBlueprintMessage("Workflow blueprint failed to open.");
    } finally {
      setBlueprintLoading(false);
    }
  }

  async function createMissionFromBlueprint() {
    if (!selectedBlueprintKey) {
      setBlueprintMessage("Select a workflow blueprint first.");
      return;
    }

    setBlueprintLoading(true);
    setBlueprintMessage("");

    try {
      const parsedWorkspaceId = Number.parseInt(workspaceId, 10);
      const safeWorkspaceId =
        Number.isFinite(parsedWorkspaceId) && parsedWorkspaceId > 0
          ? parsedWorkspaceId
          : null;

      const data = await createWorkflowMission(
        selectedBlueprintKey,
        safeWorkspaceId,
        {
          mission_title: missionTitle.trim(),
          custom_goal: customGoal.trim(),
        },
      );

      const message =
        data.status === "created"
          ? `Mission created from blueprint.\n\nMission: ${data.mission_id}\nTitle: ${data.title}\nSteps: ${data.step_count}\nCreated: ${data.created_at}`
          : `Mission creation failed.\n\n${data.message || "Backend returned failed status."}`;

      setBlueprintMessage(message);
      onAssistantMessage(message);

      if (data.status === "created") {
        setMissionTitle("");
        setCustomGoal("");
        await refreshMissionData();
      }
    } catch {
      setBlueprintMessage("Mission creation failed. Confirm backend is running.");
    } finally {
      setBlueprintLoading(false);
    }
  }

  async function runNext(missionId: number) {
    setLoadingMissionId(missionId);

    try {
      const data = await api.post<{ output: string }>(
        `/api/missions/${missionId}/run-next`
      );

      onAssistantMessage(
        `Mission ${missionId} next-step cycle complete.\n\n${data.output}`
      );

      await refreshMissionData();
    } finally {
      setLoadingMissionId(null);
    }
  }

  async function runBatch(missionId: number) {
    setLoadingMissionId(missionId);

    try {
      const data = await api.post<{
        status: string;
        stop_reason: string;
        completed_cycles: number;
      }>(`/api/missions/${missionId}/run-batch`, {
        max_steps: 3,
      });

      onAssistantMessage(
        `Controlled multi-step run complete.\n\nMission: ${missionId}\nStatus: ${data.status}\nStop reason: ${data.stop_reason}\nCompleted cycles: ${data.completed_cycles}`
      );

      await refreshMissionData();
    } finally {
      setLoadingMissionId(null);
    }
  }

  async function generateReport(missionId: number) {
    const data = await api.post<{ status: string; report_path: string }>(
      `/api/missions/${missionId}/report`
    );

    onAssistantMessage(
      `Mission report generated.\n\nStatus: ${data.status}\nPath: ${data.report_path}`
    );

    await refreshMissionData();
  }

  useEffect(() => {
    void loadBlueprints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedBlueprintSummary =
    selectedBlueprint ||
    blueprints.find((blueprint) => blueprint.key === selectedBlueprintKey) ||
    null;

  return (
    <ModuleShell
      title="Missions"
      description="Mission planner, controlled execution, run history, and execution reports."
      badge={`${missions.length} missions`}
    >
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">
              Mission Flow Graph
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Visual execution map for current mission planning, approvals,
              reports, and recent runs.
            </p>
          </div>
        </div>

        <MissionFlowGraph missions={missions} runs={runs} />
      </div>

      <section className="mb-6 rounded-3xl border border-cyan-400/15 bg-cyan-300/[0.04] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
              Create mission
            </p>
            <h3 className="mt-2 text-lg font-bold text-white">
              Create from workflow blueprint
            </h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              Use backend workflow blueprints to create controlled missions with
              known steps, priority, and approval-aware execution.
            </p>
          </div>

          <button
            onClick={() => void loadBlueprints()}
            disabled={blueprintLoading}
            className="rounded-xl border border-cyan-400/30 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-60"
          >
            {blueprintLoading ? "Loading..." : "Refresh blueprints"}
          </button>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[0.8fr_1fr]">
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-400">
              Blueprint
              <select
                value={selectedBlueprintKey}
                onChange={(event) => {
                  setSelectedBlueprintKey(event.target.value);
                  setSelectedBlueprint(null);
                }}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/40"
              >
                <option value="">Select blueprint</option>
                {blueprints.map((blueprint) => (
                  <option key={blueprint.key} value={blueprint.key}>
                    {blueprint.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-semibold text-slate-400">
              Optional mission title
              <input
                value={missionTitle}
                onChange={(event) => setMissionTitle(event.target.value)}
                maxLength={200}
                placeholder="Leave blank to use blueprint title"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/40"
              />
            </label>

            <label className="block text-xs font-semibold text-slate-400">
              Optional workspace ID
              <input
                value={workspaceId}
                onChange={(event) => setWorkspaceId(event.target.value)}
                inputMode="numeric"
                placeholder="Example: 1"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/40"
              />
            </label>

            <label className="block text-xs font-semibold text-slate-400">
              Optional custom goal
              <textarea
                value={customGoal}
                onChange={(event) => setCustomGoal(event.target.value)}
                maxLength={4000}
                placeholder="Leave blank to use the blueprint goal."
                className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/40"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => void inspectBlueprint()}
                disabled={!selectedBlueprintKey || blueprintLoading}
                className="rounded-xl border border-violet-400/30 px-3 py-2 text-xs font-bold text-violet-200 hover:bg-violet-500/10 disabled:opacity-60"
              >
                Inspect
              </button>

              <button
                onClick={() => void createMissionFromBlueprint()}
                disabled={!selectedBlueprintKey || blueprintLoading}
                className="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
              >
                {blueprintLoading ? "Working..." : "Create Mission"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
            <h4 className="font-bold text-white">
              {selectedBlueprintSummary?.name || "No blueprint selected"}
            </h4>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              {selectedBlueprintSummary?.description ||
                "Select a workflow blueprint to inspect its mission structure."}
            </p>

            {selectedBlueprintSummary && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-xs text-slate-500">Priority</p>
                  <p className="mt-1 font-bold text-white">
                    {selectedBlueprintSummary.priority}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-xs text-slate-500">Steps</p>
                  <p className="mt-1 font-bold text-white">
                    {"step_count" in selectedBlueprintSummary
                      ? selectedBlueprintSummary.step_count
                      : selectedBlueprintSummary.steps.length}
                  </p>
                </div>
              </div>
            )}

            {selectedBlueprint?.steps?.length ? (
              <ol className="mt-4 space-y-2 text-xs leading-5 text-slate-400">
                {selectedBlueprint.steps.map((step, index) => (
                  <li key={`${step}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    {index + 1}. {step}
                  </li>
                ))}
              </ol>
            ) : null}

            {blueprintMessage && (
              <pre className="mt-4 max-h-48 overflow-auto whitespace-pre-wrap rounded-2xl border border-cyan-400/20 bg-cyan-300/[0.06] p-3 text-xs leading-5 text-slate-300">
                {blueprintMessage}
              </pre>
            )}
          </div>
        </div>

        <p className="mt-4 text-xs leading-5 text-slate-500">
          Safety: blueprint creation only creates a mission record from a known
          backend template. Running mission steps still uses the existing controlled
          execution endpoints and approval gates.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <section className="rounded-3xl border border-white/10 bg-black/30 p-5">
          <h3 className="text-lg font-bold text-white">Mission Planner</h3>

          <div className="mt-4 max-h-[620px] space-y-3 overflow-y-auto">
            {missions.length === 0 ? (
              <p className="text-sm text-slate-500">
                No missions yet. Create one from a workflow blueprint above.
              </p>
            ) : (
              missions.map((mission) => (
                <div
                  key={mission.id}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full border border-cyan-400/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                      {mission.status}
                    </span>

                    <span className="text-xs text-slate-500">
                      Priority {mission.priority}
                    </span>
                  </div>

                  <h4 className="mt-3 font-bold text-white">
                    #{mission.id} — {mission.title}
                  </h4>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {mission.goal}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => void runNext(mission.id)}
                      disabled={loadingMissionId === mission.id}
                      className="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingMissionId === mission.id
                        ? "Running..."
                        : "Run Next Step"}
                    </button>

                    <button
                      onClick={() => void runBatch(mission.id)}
                      disabled={loadingMissionId === mission.id}
                      className="rounded-xl border border-emerald-400/30 px-3 py-2 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingMissionId === mission.id
                        ? "Running..."
                        : "Run 3 Steps"}
                    </button>

                    <button
                      onClick={() => void generateReport(mission.id)}
                      disabled={loadingMissionId === mission.id}
                      className="rounded-xl border border-violet-400/30 px-3 py-2 text-xs font-bold text-violet-200 transition hover:bg-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingMissionId === mission.id
                        ? "Working..."
                        : "Report"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-black/30 p-5">
          <h3 className="text-lg font-bold text-white">Mission Run History</h3>

          <div className="mt-4 max-h-[620px] space-y-3 overflow-y-auto">
            {runs.length === 0 ? (
              <p className="text-sm text-slate-500">No mission runs yet.</p>
            ) : (
              runs.map((run) => (
                <div
                  key={run.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full border border-cyan-400/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                      {run.status}
                    </span>

                    <span className="text-xs text-slate-500">
                      Run #{run.id}
                    </span>
                  </div>

                  <h4 className="mt-3 text-sm font-bold text-white">
                    {run.mission_title}
                  </h4>

                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Step: {run.step_title || "N/A"}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </ModuleShell>
  );
}
