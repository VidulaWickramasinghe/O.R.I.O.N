"use client";

import { useState } from "react";
import { ORION_BUILD } from "@/lib/orion-build";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, FileCheck2, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";

import {
  ConfirmationDialog,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  MetricCard,
  OperationalStatusBanner,
  PageHeader,
} from "@/components/aurora/operational-ui";
import {
  freezeReleaseCandidate,
  generateReleaseCandidatePackage,
  getReleaseCandidateStatus,
  unfreezeReleaseCandidate,
} from "@/lib/api/release";

type ReleaseAction = "freeze" | "unfreeze" | "package";

export function ReleaseCenterWorkspace() {
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<ReleaseAction | null>(null);
  const [message, setMessage] = useState("");
  const statusQuery = useQuery({ queryKey: ["release-candidate-status"], queryFn: getReleaseCandidateStatus });
  const actionMutation = useMutation({
    mutationFn: async (action: ReleaseAction) => {
      if (action === "freeze") return freezeReleaseCandidate("Frozen from the authenticated Aurora Release Center after explicit user confirmation.");
      if (action === "unfreeze") return unfreezeReleaseCandidate("Unfrozen from the authenticated Aurora Release Center after explicit user confirmation.");
      return generateReleaseCandidatePackage();
    },
    onSuccess: async (data, action) => {
      setMessage(action === "package" ? `Release evidence package created: ${"summary_path" in data ? data.summary_path : "path unavailable"}` : `Release state changed: ${"frozen" in data && data.frozen ? "frozen" : "open"}.`);
      await queryClient.invalidateQueries({ queryKey: ["release-candidate-status"] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Release operation failed."),
    onSettled: () => setPendingAction(null),
  });

  const status = statusQuery.data;
  const checklist = status?.checklist;
  const checklistPasses = Boolean(checklist && checklist.failed === 0 && checklist.items.length > 0);
  const canGeneratePackage = Boolean(checklistPasses && status?.freeze_state.frozen);

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <PageHeader
        eyebrow="Governance · Single release decision"
        title="Release Center"
        description="Review build identity, required checks, evidence, freeze state, and artifacts in one place. This screen reports the backend gate; it does not infer production readiness."
        metadata={<p className="text-xs text-slate-300">Build {ORION_BUILD.versionLabel} · {ORION_BUILD.channel}. Saved candidate: {status?.freeze_state.release_version || "unavailable"}. A saved freeze records its own version; readiness requires current evidence.</p>}
        actions={<button type="button" onClick={() => void statusQuery.refetch()} disabled={statusQuery.isFetching} className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/20 px-3 py-2 text-xs font-bold text-cyan-100 disabled:opacity-50"><RefreshCw size={13} className={statusQuery.isFetching ? "animate-spin" : ""} />Refresh evidence</button>}
      />

      {statusQuery.isLoading ? <LoadingSkeleton label="Loading release evidence" /> : null}
      {statusQuery.isError ? <ErrorState title="Release evidence unavailable" description="A release decision cannot be made because the authenticated backend gate did not load." onRetry={() => void statusQuery.refetch()} /> : null}
      {message ? <OperationalStatusBanner tone={actionMutation.isError ? "danger" : "info"} title="Release Center result" description={message} /> : null}

      {status ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Candidate" value={status.freeze_state.release_version || "Unavailable"} detail={status.freeze_state.release_name || "Release name unavailable"} tone="ai" />
            <MetricCard label="Required checks" value={status.checklist.items.length} detail="Checks reported by the backend gate" tone="info" />
            <MetricCard label="Passing" value={status.checklist.passed} detail="Evidence currently passing" tone="success" />
            <MetricCard label="Failing" value={status.checklist.failed} detail="Any failure prevents readiness" tone={status.checklist.failed ? "danger" : "success"} />
          </section>

          <OperationalStatusBanner
            tone={canGeneratePackage ? "warning" : "danger"}
            title={canGeneratePackage ? "Legacy checklist passes and candidate is frozen" : checklistPasses ? "Checklist passes, but candidate is not frozen" : "Build is not release-ready"}
            description={canGeneratePackage ? "The local evidence package may be generated. Two legacy checks remain non-evidentiary; signing, notarization, clean-machine installation, and CI artifact hashes are still required before a release decision." : checklistPasses ? "Freeze the candidate before generating a package. Passing this legacy local checklist does not establish production readiness." : `${status.checklist.failed} required check${status.checklist.failed === 1 ? "" : "s"} fail or the gate contains no evidence.`}
          />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
            <section className="orion-panel p-5">
              <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><FileCheck2 size={18} className="text-cyan-300" /><div><h2 className="font-bold text-white">Required checks</h2><p className="text-xs text-slate-500">Exact evidence returned by the release candidate endpoint</p></div></div></div>
              <div className="mt-4 space-y-2">
                {status.checklist.items.length === 0 ? <EmptyState title="No release checks" description="The backend returned no required release evidence, so this build cannot be declared ready." /> : status.checklist.items.map((item) => <article key={item.item} className={`rounded-2xl border p-4 ${item.ok ? "border-emerald-300/15 bg-emerald-300/[0.035]" : "border-rose-300/20 bg-rose-300/[0.045]"}`}><div className="flex items-start justify-between gap-3"><h3 className="text-sm font-bold text-white">{item.item}</h3><span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${item.ok ? "border-emerald-300/20 text-emerald-200" : "border-rose-300/20 text-rose-200"}`}>{item.ok ? "Pass" : "Fail"}</span></div><p className="mt-2 text-xs leading-5 text-slate-500">{item.details}</p></article>)}
              </div>
            </section>

            <aside className="space-y-5">
              <section className="orion-panel p-5">
                <div className="flex items-center gap-3"><LockKeyhole size={18} className={status.freeze_state.frozen ? "text-cyan-300" : "text-amber-300"} /><div><h2 className="font-bold text-white">Freeze state</h2><p className="text-xs text-slate-500">{status.freeze_state.frozen ? "Frozen" : "Open"} · {status.freeze_state.updated_at || "time unavailable"}</p></div></div>
                <p className="mt-4 text-xs leading-5 text-slate-400">{status.freeze_state.freeze_reason || "No freeze reason recorded."}</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <button type="button" disabled={status.freeze_state.frozen || actionMutation.isPending} onClick={() => setPendingAction("freeze")} className="rounded-xl border border-cyan-300/20 px-3 py-2.5 text-xs font-bold text-cyan-100 disabled:opacity-40">Freeze candidate</button>
                  <button type="button" disabled={!status.freeze_state.frozen || actionMutation.isPending} onClick={() => setPendingAction("unfreeze")} className="rounded-xl border border-amber-300/20 px-3 py-2.5 text-xs font-bold text-amber-100 disabled:opacity-40">Unfreeze</button>
                </div>
              </section>
              <section className="orion-panel p-5">
                <div className="flex items-center gap-3"><Archive size={18} className="text-violet-300" /><div><h2 className="font-bold text-white">Evidence package</h2><p className="text-xs text-slate-500">Local artifact generation</p></div></div>
                <p className="mt-4 text-xs leading-5 text-slate-400">Generate only after all backend checks pass. This does not sign, notarize, publish, or push an artifact.</p>
                <button type="button" disabled={!canGeneratePackage || actionMutation.isPending} onClick={() => setPendingAction("package")} className="mt-4 w-full rounded-xl bg-violet-300 px-3 py-2.5 text-xs font-black text-slate-950 disabled:opacity-40">Generate evidence package</button>
              </section>
            </aside>
          </div>

          <section className="orion-panel p-5"><div className="flex items-center gap-3"><ShieldCheck size={18} className="text-emerald-300" /><div><h2 className="font-bold text-white">Recent release evidence</h2><p className="text-xs text-slate-500">{status.events.length} recorded events</p></div></div><div className="mt-4 space-y-2">{status.events.length === 0 ? <EmptyState title="No release events" description="The backend returned no release history." /> : status.events.map((event) => <article key={event.id} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-sm font-bold text-white">{event.title}</h3><time className="text-[10px] text-slate-600">{event.created_at}</time></div><p className="mt-2 text-xs leading-5 text-slate-400">{event.message}</p>{event.artifact_path ? <p className="mt-2 break-all text-[10px] text-violet-300/70">Artifact: {event.artifact_path}</p> : null}</article>)}</div></section>
        </>
      ) : null}

      <ConfirmationDialog
        open={pendingAction !== null}
        title={pendingAction === "package" ? "Generate release evidence package?" : pendingAction === "unfreeze" ? "Unfreeze this candidate?" : "Freeze this candidate?"}
        description={pendingAction === "package" ? "This creates local release artifacts. It does not publish or sign them." : "This changes the local release governance state and will be recorded by the backend."}
        confirmLabel={actionMutation.isPending ? "Working…" : "Confirm governed action"}
        onClose={() => setPendingAction(null)}
        onConfirm={() => pendingAction && actionMutation.mutate(pendingAction)}
      />
    </div>
  );
}
