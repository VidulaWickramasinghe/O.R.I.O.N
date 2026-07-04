"use client";

import { useEffect, useState } from "react";

import { MemoryItem } from "../aurora-types";
import { ModuleShell } from "./module-shell";

type MemoryModuleProps = {
  onAsk: (message: string) => void;
};

export function MemoryModule({ onAsk }: MemoryModuleProps) {
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([]);
  const [query, setQuery] = useState("");
  const [contextPreview, setContextPreview] = useState("");

  async function loadMemory() {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/memory");
      const data = await response.json();
      setMemoryItems(data.items || []);
    } catch {
      setMemoryItems([]);
    }
  }

  async function previewContext() {
    if (!query.trim()) return;

    try {
      const response = await fetch("http://127.0.0.1:8000/api/context/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: query }),
      });

      const data = await response.json();
      setContextPreview(data.context || "");
    } catch {
      setContextPreview("Context preview failed.");
    }
  }

  useEffect(() => {
    loadMemory();
  }, []);

  return (
    <ModuleShell
      title="Memory"
      description="Persistent memory, context retrieval, and project-aware recall."
      badge={`${memoryItems.length} items`}
    >
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-white/10 bg-black/30 p-5">
          <h3 className="text-lg font-bold text-white">Memory Matrix</h3>

          <div className="mt-4 max-h-[560px] space-y-3 overflow-y-auto">
            {memoryItems.length === 0 ? (
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
