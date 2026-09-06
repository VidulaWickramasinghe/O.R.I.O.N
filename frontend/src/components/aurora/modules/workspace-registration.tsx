"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { registerWorkspace } from "@/lib/api/workspaces";

export function WorkspaceRegistration() {
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [trusted, setTrusted] = useState(false);
  const [consent, setConsent] = useState(false);
  const mutation = useMutation({
    mutationFn: registerWorkspace,
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["aurora-workspaces"] }); },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ name: name.trim(), path: path.trim(), description: "", trusted, source_consent: consent });
  }
  return <section id="register-workspace" className="scroll-mt-44 rounded-3xl border border-cyan-300/20 bg-black/25 p-5">
    <h2 className="text-xl font-semibold text-white">Register a workspace</h2>
    <p className="mt-2 text-sm leading-6 text-slate-400">Choose one existing project folder on this computer, not your home folder or entire disk. Registration grants access to that folder; it does not run code or index documents. Knowledge indexing and high-risk actions have separate controls.</p>
    <form onSubmit={submit} className="mt-4 space-y-4">
      <fieldset disabled={mutation.isPending} className="space-y-4 disabled:opacity-60">
        <label className="block text-sm text-slate-200">Workspace name<input required maxLength={200} value={name} onChange={(event) => { setName(event.target.value); mutation.reset(); }} className="mt-1 w-full rounded-xl border border-white/20 bg-black/30 p-3" /></label>
        <label className="block text-sm text-slate-200">Existing folder path<input required maxLength={4096} value={path} onChange={(event) => { setPath(event.target.value); setTrusted(false); setConsent(false); mutation.reset(); }} placeholder="Full path to a project folder on this computer" className="mt-1 w-full rounded-xl border border-white/20 bg-black/30 p-3" /></label>
        <label className="flex items-start gap-2 text-sm text-slate-200"><input type="checkbox" checked={trusted} onChange={(event) => setTrusted(event.target.checked)} className="mt-1" />I trust this folder and authorize O.R.I.O.N. to inspect its contents.</label>
        <label className="flex items-start gap-2 text-sm text-slate-200"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1" />I consent to this folder being available as a source for context and explicitly requested indexing.</label>
        <button type="submit" disabled={mutation.isPending || mutation.isSuccess || !name.trim() || !path.trim() || !trusted || !consent} className="rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40">{mutation.isPending ? "Registering…" : "Register trusted workspace"}</button>
      </fieldset>
      {mutation.isError && <p role="alert" className="text-sm text-rose-200">{mutation.error.message} Review the folder path and consent, then retry. Your draft is preserved.</p>}
      {mutation.isSuccess && <p role="status" className="break-all text-sm text-emerald-200">Workspace {mutation.data.workspace_id} registered at {mutation.data.path}. Select it in Assistant or Knowledge to use its context.</p>}
    </form>
  </section>;
}
