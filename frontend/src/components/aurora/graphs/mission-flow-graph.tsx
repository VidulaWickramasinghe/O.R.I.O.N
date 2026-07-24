"use client";

import { useMemo } from "react";
import {
  Background,
  Controls,
  Edge,
  Handle,
  MarkerType,
  Node,
  Position,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { MissionItem, MissionRunItem } from "../aurora-types";

type MissionFlowGraphProps = {
  missions: MissionItem[];
  runs: MissionRunItem[];
};

type MissionNodeData = {
  title: string;
  subtitle: string;
  status: string;
};

function getStatusTone(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("complete")) return "complete";
  if (normalized.includes("approval")) return "approval";
  if (normalized.includes("error") || normalized.includes("failed")) return "error";
  if (normalized.includes("planned") || normalized.includes("pending")) return "planned";

  return "default";
}

function CustomMissionNode({ data }: { data: MissionNodeData }) {
  const tone = getStatusTone(data.status);

  const toneClass =
    tone === "complete"
      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
      : tone === "approval"
      ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
      : tone === "error"
      ? "border-red-400/40 bg-red-500/10 text-red-100"
      : tone === "planned"
      ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-100"
      : "border-white/15 bg-white/[0.06] text-slate-100";

  return (
    <div
      className={`w-[230px] rounded-2xl border px-4 py-3 shadow-xl shadow-black/30 backdrop-blur-xl ${toneClass}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!border-cyan-300 !bg-[#020617]"
      />

      <p className="text-[10px] uppercase tracking-[0.22em] opacity-70">
        {data.status}
      </p>

      <h4 className="mt-2 text-sm font-bold">{data.title}</h4>

      <p className="mt-1 line-clamp-3 text-xs leading-5 opacity-70">
        {data.subtitle}
      </p>

      <Handle
        type="source"
        position={Position.Right}
        className="!border-cyan-300 !bg-[#020617]"
      />
    </div>
  );
}

const nodeTypes = {
  missionNode: CustomMissionNode,
};

export function MissionFlowGraph({ missions, runs }: MissionFlowGraphProps) {
  const { nodes, edges } = useMemo(() => {
    const selectedMission = missions[0];

    if (!selectedMission) {
      return {
        nodes: [
          {
            id: "empty",
            type: "missionNode",
            position: { x: 0, y: 0 },
            data: {
              title: "No mission selected",
              subtitle: "Create a mission to visualize execution flow.",
              status: "idle",
            },
          },
        ] satisfies Node<MissionNodeData>[],
        edges: [] satisfies Edge[],
      };
    }

    const missionRuns = runs
      .filter((run) => run.mission_id === selectedMission.id)
      .slice(0, 4)
      .reverse();

    const graphNodes: Node<MissionNodeData>[] = [
      {
        id: "mission",
        type: "missionNode",
        position: { x: 0, y: 140 },
        data: {
          title: selectedMission.title,
          subtitle: selectedMission.goal,
          status: selectedMission.status,
        },
      },
      {
        id: "planner",
        type: "missionNode",
        position: { x: 330, y: 40 },
        data: {
          title: "Mission Planner",
          subtitle: "Goal converted into controlled execution steps.",
          status: "planned",
        },
      },
      {
        id: "approval",
        type: "missionNode",
        position: { x: 330, y: 240 },
        data: {
          title: "Approval Gate",
          subtitle: "Commands, file writes, and desktop actions require approval.",
          status: "approval",
        },
      },
      {
        id: "report",
        type: "missionNode",
        position: { x: 660, y: 140 },
        data: {
          title: "Mission Report",
          subtitle: "Execution history becomes a portfolio-ready report.",
          status: "complete",
        },
      },
    ];

    missionRuns.forEach((run, index) => {
      graphNodes.push({
        id: `run-${run.id}`,
        type: "missionNode",
        position: { x: 990, y: 20 + index * 145 },
        data: {
          title: `Run #${run.id}`,
          subtitle: run.step_title || "Mission execution cycle",
          status: run.status,
        },
      });
    });

    const graphEdges: Edge[] = [
      {
        id: "mission-planner",
        source: "mission",
        target: "planner",
        markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(34, 211, 238, 0.75)" },
        style: { stroke: "rgba(34, 211, 238, 0.58)", strokeWidth: 2 },
      },
      {
        id: "mission-approval",
        source: "mission",
        target: "approval",
        markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(34, 211, 238, 0.75)" },
        style: { stroke: "rgba(34, 211, 238, 0.58)", strokeWidth: 2 },
      },
      {
        id: "planner-report",
        source: "planner",
        target: "report",
        markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(34, 211, 238, 0.75)" },
        style: { stroke: "rgba(34, 211, 238, 0.58)", strokeWidth: 2 },
      },
      {
        id: "approval-report",
        source: "approval",
        target: "report",
        markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(34, 211, 238, 0.75)" },
        style: { stroke: "rgba(34, 211, 238, 0.58)", strokeWidth: 2 },
      },
      ...missionRuns.map((run) => ({
        id: `report-run-${run.id}`,
        source: "report",
        target: `run-${run.id}`,
        markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(34, 211, 238, 0.75)" },
        style: { stroke: "rgba(34, 211, 238, 0.58)", strokeWidth: 2 },
      })),
    ];

    return {
      nodes: graphNodes,
      edges: graphEdges,
    };
  }, [missions, runs]);

  return (
    <div className="mission-flow-graph h-[440px] overflow-hidden rounded-3xl border border-cyan-400/20 bg-[#030712]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.35}
        maxZoom={1.2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={26} size={1} color="rgba(148, 163, 184, 0.18)" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
