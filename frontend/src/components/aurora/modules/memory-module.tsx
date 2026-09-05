"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { MemoryItem } from "../aurora-types";
import {
  deleteMemory,
  previewContext as getContextPreview,
  setMemoryExcluded,
  updateMemory,
} from "@/lib/api/memory";
import { useAuroraMemory } from "../lib/aurora-queries";
import { ErrorState, LoadingSkeleton } from "../operational-ui";
import { ModuleShell } from "./module-shell";

type MemoryModuleProps = {
  onAsk: (message: string) => void;
};

export function MemoryModule({ onAsk }: MemoryModuleProps) {
  const queryClient = useQueryClient();
  const memoryQuery = useAuroraMemory();
  const memoryItems = (memoryQuery.data?.items ?? []) as MemoryItem[];
  const [query, setQuery] = useState("");
  const [contextPreview, setContextPreview] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  async function refreshMemory() {
    await queryClient.invalidateQueries({ queryKey: ["aurora-memory"] });
  }

  async function previewContext() {
    if (!query.trim()) return;

    try {
      const data = await getContextPreview(query);
      setContextPreview(data.context || "");
    } catch {
      setContextPreview("Context preview failed.");
    }
  }

  async function toggleExcluded(item: MemoryItem) {
    setActionMessage("");
    try {
      await setMemoryExcluded(item.id, !item.excluded, item.excluded ? "" : "Excluded by user in Memory Matrix");
      await refreshMemory();
      setActionMessage(item.excluded ? "Memory restored to retrieval." : "Memory excluded from every prompt and search.");
    } catch {
      setActionMessage("Memory exclusion could not be changed.");
    }
  }

  async function editItem(item: MemoryItem) {
    const title = window.prompt("Memory title", item.title);
    if (title === null) return;
    const content = window.prompt("Memory content", item.content);
    if (content === null) return;
    try {
      await updateMemory(item.id, { title, content });
      await refreshMemory();
      setActionMessage("Memory updated.");
    } catch {
      setActionMessage("Memory update failed.");
    }
  }

  async function removeItem(item: MemoryItem) {
    if (!window.confirm(`Permanently delete memory “${item.title}”?`)) return;
    try {
      await deleteMemory(item.id);
      await refreshMemory();
      setActionMessage("Memory permanently deleted.");
    } catch {
      setActionMessage("Memory deletion failed.");
    }
  }

  return (
    <ModuleShell
      title="Memory"
      description="Persistent memory, context retrieval, and project-aware recall."
      badge={`${memoryItems.length} items`}
    >
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-white/10 bg-black/30 p-5">
          <h3 className="text-lg font-bold text-white">Memory Matrix</h3>
          {actionMessage && <p className="mt-2 text-xs text-cyan-200">{actionMessage}</p>}

          {memoryQuery.isLoading ? <div className="mt-4"><LoadingSkeleton label="Loading memory" /></div> : null}
          {memoryQuery.isError ? <div className="mt-4"><ErrorState title="Memory unavailable" description="The authenticated memory endpoint could not be read. No cached or synthetic memories are shown." onRetry={() => void memoryQuery.refetch()} /></div> : null}

          <div className="mt-4 max-h-[560px] space-y-3 overflow-y-auto">
            {!memoryQuery.isLoading && !memoryQuery.isError && memoryItems.length === 0 ? (
              <p className="text-sm text-slate-500">No memory items found.</p>
            ) : (
              memoryItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full border border-violet-400/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-violet-300">
                      {item.category}
                    </span>
                    <span className="text-xs text-slate-500">
                      Priority {item.importance}
                    </span>
                  </div>

                  <h4 className="mt-3 font-bold text-white">{item.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {item.content}
                  </p>
                  <div className="mt-3 space-y-1 text-[10px] text-slate-600">
                    <p>Scope: {item.workspace_id ? `workspace ${item.workspace_id}` : "global"}{item.project_key ? ` · project ${item.project_key}` : ""}</p>
                    <p>Sensitivity: {item.sensitivity} · Excluded: {item.excluded ? "yes" : "no"}</p>
                    <p className="break-all">Provenance: {JSON.stringify(item.provenance || {})}</p>
                    {item.exclusion_reason && <p>Reason: {item.exclusion_reason}</p>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => void editItem(item)} className="rounded-lg border border-cyan-400/20 px-2 py-1 text-[10px] text-cyan-200">Edit</button>
                    <button type="button" onClick={() => void toggleExcluded(item)} className="rounded-lg border border-amber-400/20 px-2 py-1 text-[10px] text-amber-200">{item.excluded ? "Include" : "Exclude"}</button>
                    <button type="button" onClick={() => void removeItem(item)} className="rounded-lg border border-rose-400/20 px-2 py-1 text-[10px] text-rose-200">Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-black/30 p-5">
          <h3 className="text-lg font-bold text-white">Context Retrieval</h3>
          <p className="mt-1 text-sm text-slate-500">
            Preview what O.R.I.O.N. will retrieve before answering.
          </p>

          <div className="mt-4 flex gap-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="What do you remember about O.R.I.O.N.?"
              className="min-w-0 flex-1 rounded-2xl border border-cyan-400/20 bg-black/40 px-4 py-3 text-sm outline-none ring-cyan-400/30 placeholder:text-slate-500 focus:ring-2"
            />

            <button
              onClick={previewContext}
              className="rounded-2xl border border-cyan-400/30 px-5 py-3 text-sm font-bold text-cyan-200 hover:bg-cyan-500/10"
            >
              Scan
            </button>

            <button
              onClick={() => onAsk(query)}
              className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-200"
            >
              Ask
            </button>
          </div>

          <pre className="mt-5 max-h-[500px] overflow-y-auto whitespace-pre-wrap rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-xs leading-6 text-slate-300">
            {contextPreview || "No context preview yet."}
          </pre>
        </section>
      </div>
    </ModuleShell>
  );
}
