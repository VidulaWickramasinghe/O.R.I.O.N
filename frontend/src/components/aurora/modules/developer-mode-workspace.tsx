"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Code2, FileDiff, ScanSearch, ShieldAlert } from "lucide-react";

import { useAuroraWorkspaces } from "@/components/aurora/lib/aurora-queries";
import {
  CommandOutput,
  EmptyState,
  ErrorState,
  MissionStatusBadge,
  OperationalStatusBanner,
  PageHeader,
  RiskBadge,
} from "@/components/aurora/operational-ui";
import {
  createDeveloperPatchPlan,
  diagnoseDeveloperWorkspace,
  getDeveloperReports,
  inspectDeveloperWorkspace,
} from "@/lib/api/developer";

function outputOf(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  const object = value as Record<string, unknown>;
  const preferred = object.content || object.report || object.result || object.message;
  return typeof preferred === "string" ? preferred : JSON.stringify(value, null, 2);
}

const workflowStages = [
  "Objective",
  "Inspection",
  "Diagnosis",
  "Proposed changes",
  "Diff review",
  "Risk review",
  "Approval",
  "Backup",
  "Apply",
  "Validate",
  "Report",
];

export function DeveloperModeWorkspace() {
  const workspacesQuery = useAuroraWorkspaces();
  const reportsQuery = useQuery({ queryKey: ["developer-reports"], queryFn: getDeveloperReports });
  const [workspaceId, setWorkspaceId] = useState("");
  const [objective, setObjective] = useState("");
  const [inspection, setInspection] = useState<unknown>(null);
  const [diagnosis, setDiagnosis] = useState<unknown>(null);
  const [patchPlan, setPatchPlan] = useState<unknown>(null);

  const inspectMutation = useMutation({
    mutationFn: () => inspectDeveloperWorkspace(Number(workspaceId)),
    onSuccess: setInspection,
  });
  const diagnoseMutation = useMutation({
    mutationFn: () => diagnoseDeveloperWorkspace(Number(workspaceId), objective.trim()),
    onSuccess: setDiagnosis,
  });
  const planMutation = useMutation({
    mutationFn: () => createDeveloperPatchPlan(Number(workspaceId), objective.trim()),
    onSuccess: setPatchPlan,
  });
  const currentError = inspectMutation.error || diagnoseMutation.error || planMutation.error;
  const currentStage = patchPlan ? 3 : diagnosis ? 2 : inspection ? 1 : objective.trim() ? 0 : -1;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <PageHeader
        eyebrow="Environment · Controlled development"
        title="Developer Mode"
        description="Move from objective to evidence, proposal, explicit approval, backup, application, validation, and report without granting unrestricted shell or file access."
        metadata={<div className="flex flex-wrap gap-2"><RiskBadge risk="high" /><span className="text-[10px] text-slate-500">Workspace writes and commands remain capability-gated</span></div>}
      />

      <section className="orion-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-white">Controlled workflow</h2><p className="mt-1 text-xs text-slate-500">Reference contract · operational progress is marked only after backend evidence returns</p></div><MissionStatusBadge status={planMutation.isPending || diagnoseMutation.isPending || inspectMutation.isPending ? "running" : currentStage >= 0 ? "ready" : "draft"} /></div>
        <ol className="orion-scrollbar mt-5 flex gap-2 overflow-x-auto pb-2">
          {workflowStages.map((stage, index) => {
            const reached = index <= currentStage;
            return <li key={stage} className={`min-w-36 rounded-xl border p-3 ${reached ? "border-cyan-300/20 bg-cyan-300/[0.06]" : "border-white/10 bg-white/[0.02]"}`}><p className={`text-[10px] font-bold uppercase tracking-[0.12em] ${reached ? "text-cyan-200" : "text-slate-600"}`}>{index + 1}. {stage}</p><p className="mt-2 text-[10px] text-slate-600">{reached ? "Evidence available" : index <= 3 ? "Next controlled stage" : "Requires reviewed backend record"}</p></li>;
          })}
        </ol>
      </section>

      {currentError ? <ErrorState title="Developer operation failed" description={currentError instanceof Error ? currentError.message : "The backend rejected or could not complete the controlled operation."} /> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(320px,.7fr)_minmax(0,1.3fr)]">
        <section className="orion-panel p-5">
          <h2 className="flex items-center gap-2 font-bold text-white"><Code2 size={17} className="text-cyan-300" />Objective and workspace</h2>
          <div className="mt-5 space-y-4">
            <label className="block text-xs text-slate-400">Trusted workspace
              <select value={workspaceId} onChange={(event) => { setWorkspaceId(event.target.value); setInspection(null); setDiagnosis(null); setPatchPlan(null); }} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0f17] px-3 py-2.5 text-sm text-slate-200"><option value="">Select workspace</option>{(workspacesQuery.data?.workspaces ?? []).map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select>
            </label>
            <label className="block text-xs text-slate-400">Objective
              <textarea value={objective} onChange={(event) => { setObjective(event.target.value); setDiagnosis(null); setPatchPlan(null); }} placeholder="Describe the problem and expected outcome…" className="mt-2 min-h-28 w-full resize-y rounded-xl border border-white/10 bg-black/25 p-3 text-sm leading-6 text-slate-200 outline-none placeholder:text-slate-600" />
            </label>
            <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              <button type="button" disabled={!workspaceId || inspectMutation.isPending} onClick={() => inspectMutation.mutate()} className="rounded-xl border border-cyan-300/20 px-3 py-2.5 text-xs font-bold text-cyan-100 disabled:opacity-40"><ScanSearch size={13} className="mr-1.5 inline" />Inspect</button>
              <button type="button" disabled={!workspaceId || !objective.trim() || !inspection || diagnoseMutation.isPending} onClick={() => diagnoseMutation.mutate()} className="rounded-xl border border-violet-300/20 px-3 py-2.5 text-xs font-bold text-violet-100 disabled:opacity-40"><ShieldAlert size={13} className="mr-1.5 inline" />Diagnose</button>
              <button type="button" disabled={!workspaceId || !objective.trim() || !diagnosis || planMutation.isPending} onClick={() => planMutation.mutate()} className="rounded-xl bg-cyan-300 px-3 py-2.5 text-xs font-black text-slate-950 disabled:opacity-40"><FileDiff size={13} className="mr-1.5 inline" />Plan patch</button>
            </div>
            <p className="text-[10px] leading-5 text-slate-600">Creating a patch plan does not apply changes. Review and approval must occur through the governed action flow exposed by the backend.</p>
          </div>
        </section>

        <section className="space-y-4">
          {!inspection && !diagnosis && !patchPlan ? <EmptyState title="No developer evidence yet" description="Select a trusted workspace and inspect it. O.R.I.O.N. will not synthesize repository state while the backend is unavailable." /> : null}
          {inspection ? <CommandOutput output={outputOf(inspection)} /> : null}
          {diagnosis ? <CommandOutput output={outputOf(diagnosis)} /> : null}
          {patchPlan ? <CommandOutput output={outputOf(patchPlan)} /> : null}
          {patchPlan ? <OperationalStatusBanner tone="warning" title="Review required before execution" description="The proposal is evidence, not an executed change. Continue only through an explicit approval record that identifies the exact workspace, paths, arguments, and risk." /> : null}
        </section>
      </div>

      <section className="orion-panel p-5">
        <div className="flex items-center gap-3"><CheckCircle2 size={18} className="text-emerald-300" /><div><h2 className="font-bold text-white">Developer reports</h2><p className="text-xs text-slate-500">Durable records returned by the backend</p></div></div>
        <div className="mt-4">
          {reportsQuery.isError ? <ErrorState title="Reports unavailable" description="Developer report history could not be read." onRetry={() => void reportsQuery.refetch()} /> : ((reportsQuery.data?.reports ?? []) as Array<Record<string, unknown>>).length === 0 ? <EmptyState title="No developer reports" description="Completed inspections, diagnoses, and governed changes will produce durable records here." /> : <div className="grid gap-3 lg:grid-cols-2">{((reportsQuery.data?.reports ?? []) as Array<Record<string, unknown>>).map((report, index) => <article key={String(report.id ?? index)} className="rounded-2xl border border-white/10 bg-black/20 p-4"><h3 className="text-sm font-bold text-white">{String(report.title ?? report.report_type ?? "Developer report")}</h3><p className="mt-2 line-clamp-4 whitespace-pre-wrap text-xs leading-5 text-slate-400">{String(report.content ?? "No report content")}</p><p className="mt-3 text-[10px] text-slate-600">Workspace {String(report.workspace_id ?? "unknown")} · {String(report.created_at ?? "time unavailable")}</p></article>)}</div>}
        </div>
      </section>
    </div>
  );
}
