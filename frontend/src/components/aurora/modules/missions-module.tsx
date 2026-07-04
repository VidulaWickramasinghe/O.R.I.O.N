"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { MissionFlowGraph } from "../graphs/mission-flow-graph";
import { ModuleShell } from "./module-shell";
import {
  useAuroraMissions,
  useAuroraMissionRuns,
} from "../lib/aurora-queries";
import { api } from "../lib/api-client";

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

  async function refreshMissionData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["aurora-missions"] }),
      queryClient.invalidateQueries({ queryKey: ["aurora-mission-runs"] }),
      queryClient.invalidateQueries({ queryKey: ["aurora-activity"] }),
      queryClient.invalidateQueries({ queryKey: ["aurora-approvals"] }),
    ]);
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

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <section className="rounded-3xl border border-white/10 bg-black/30 p-5">
          <h3 className="text-lg font-bold text-white">Mission Planner</h3>

          <div className="mt-4 max-h-[620px] space-y-3 overflow-y-auto">
            {missions.length === 0 ? (
              <p className="text-sm text-slate-500">
                No missions yet. Ask O.R.I.O.N. to create one.
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
