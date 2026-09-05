"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMission } from "@/lib/api/missions";

export function MissionAuthor() {
  const client = useQueryClient();
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [steps, setSteps] = useState([""]);
  const [priority, setPriority] = useState(3);
  const mutation = useMutation({
    mutationFn: createMission,
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["aurora-missions"] }); },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ title: title.trim(), goal: goal.trim(), steps: steps.map((step) => step.trim()), priority });
  }
  return <form onSubmit={submit} className="space-y-4 rounded-3xl border border-cyan-300/20 bg-black/25 p-5">
    <div><h2 className="text-xl font-semibold text-white">Create a mission from your goal</h2><p className="mt-2 text-sm text-slate-400">Write the goal, review the ordered plan, then save it. Execution starts only when you select a mission run action.</p></div>
    <fieldset disabled={mutation.isPending} className="space-y-4 disabled:opacity-60">
      <label className="block text-sm text-slate-200">Mission title<input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-xl border border-white/20 bg-black/30 p-3" /></label>
      <label className="block text-sm text-slate-200">Goal<textarea required maxLength={8000} value={goal} onChange={(event) => setGoal(event.target.value)} className="mt-1 min-h-24 w-full rounded-xl border border-white/20 bg-black/30 p-3" /></label>
      <ol className="space-y-3">{steps.map((step, index) => <li key={index} className="flex flex-wrap items-center gap-2">
        <label className="min-w-0 flex-1 text-sm text-slate-200">Step {index + 1}<input required maxLength={2000} value={step} onChange={(event) => setSteps((current) => current.map((value, i) => i === index ? event.target.value : value))} className="mt-1 w-full rounded-xl border border-white/20 bg-black/30 p-3" /></label>
        <button type="button" disabled={index === 0} aria-label={`Move step ${index + 1} up`} onClick={() => setSteps((current) => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })} className="rounded-lg border border-white/20 px-3 py-2 text-sm text-slate-200 disabled:opacity-40">Up</button>
        <button type="button" disabled={steps.length === 1} aria-label={`Remove step ${index + 1}`} onClick={() => setSteps((current) => current.filter((_, i) => i !== index))} className="rounded-lg border border-white/20 px-3 py-2 text-sm text-slate-200 disabled:opacity-40">Remove</button>
      </li>)}</ol>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={steps.length >= 50} onClick={() => setSteps((current) => [...current, ""])} className="rounded-xl border border-white/20 px-4 py-2 text-sm text-slate-200">Add step</button>
        <label className="text-sm text-slate-200">Priority <select value={priority} onChange={(event) => setPriority(Number(event.target.value))} className="rounded-lg border border-white/20 bg-[#101722] p-2">{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}{value === 5 ? " — highest" : ""}</option>)}</select></label>
        <button type="submit" disabled={mutation.isPending || !title.trim() || !goal.trim() || steps.some((step) => !step.trim())} className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40">{mutation.isPending ? "Saving…" : "Save mission plan"}</button>
      </div>
    </fieldset>
    {mutation.isError && <p role="alert" className="text-sm text-rose-200">{mutation.error.message} Your draft is preserved. Review it and retry.</p>}
    {mutation.isSuccess && <p role="status" className="text-sm text-emerald-200">Mission {mutation.data.id} saved. Review it below before starting execution.</p>}
  </form>;
}
