"use client";

import { useEffect, useState } from "react";

import { dashboardModels, dashboardTimeline } from "@/lib/aurora-data";
import { agents } from "@/lib/agent-data";
import { memoryItems } from "@/lib/memory-data";
import { projects } from "@/lib/project-data";
import { GlassPanel } from "./glass-panel";
import { StatusChip } from "./status-chip";

type KnowledgeDocumentItem = {
  id: number;
  title: string;
  source_path: string;
  extension: string;
  size_bytes: number;
  summary: string;
  indexed_at: string;
  updated_at: string;
};

type KnowledgeSearchItem = {
  chunk_id: number;
  document_id: number;
  chunk_index: number;
  content: string;
  title: string;
  source_path: string;
  extension: string;
};

export function DashboardWorkspace() {
  const [widgets, setWidgets] = useState([
    "Hero",
    "Metrics",
    "Quick Actions",
    "Models",
    "Timeline",
    "Knowledge Base",
  ]);
  const [knowledgeDocuments, setKnowledgeDocuments] = useState<KnowledgeDocumentItem[]>([]);
  const [knowledgePath, setKnowledgePath] = useState("");
  const [knowledgeQuery, setKnowledgeQuery] = useState("");
  const [knowledgeResults, setKnowledgeResults] = useState<KnowledgeSearchItem[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeMessage, setKnowledgeMessage] = useState("");

  function toggle(item: string) {
    setWidgets((current) =>
      current.includes(item)
        ? current.filter((widget) => widget !== item)
        : [...current, item]
    );
  }

  async function loadKnowledgeDocuments() {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/knowledge/documents");
      const data = await response.json();
      setKnowledgeDocuments(data.documents || []);
    } catch {
      setKnowledgeDocuments([]);
    }
  }

  async function indexKnowledgeFolderFromUI() {
    const cleanPath = knowledgePath.trim();
    if (!cleanPath || knowledgeLoading) return;

    setKnowledgeLoading(true);
    setKnowledgeMessage("");

    try {
      const response = await fetch("http://127.0.0.1:8000/api/knowledge/index-folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ folder_path: cleanPath }),
      });
      const data = await response.json();
      setKnowledgeMessage(`Knowledge indexing status: ${data.status}. ${data.message}`);
      await loadKnowledgeDocuments();
    } catch {
      setKnowledgeMessage("Knowledge folder indexing failed. Confirm backend is running.");
    } finally {
      setKnowledgeLoading(false);
    }
  }

  async function searchKnowledgeFromUI() {
    const cleanQuery = knowledgeQuery.trim();
    if (!cleanQuery || knowledgeLoading) return;

    setKnowledgeLoading(true);
    setKnowledgeMessage("");

    try {
      const response = await fetch("http://127.0.0.1:8000/api/knowledge/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: cleanQuery,
          limit: 8,
        }),
      });
      const data = await response.json();
      setKnowledgeResults(data.results || []);
    } catch {
      setKnowledgeResults([]);
      setKnowledgeMessage("Knowledge search failed. Confirm backend is running.");
    } finally {
      setKnowledgeLoading(false);
    }
  }

  useEffect(() => {
    void loadKnowledgeDocuments();
    const timer = window.setInterval(() => {
      void loadKnowledgeDocuments();
    }, 3000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="space-y-4">
      <GlassPanel className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-white">
              Good Evening, Wichel. O.R.I.O.N. is ready.
            </h1>
            <p className="mt-1 text-slate-400">
              Operational Response and Intelligent Orchestration Network · Think. Plan. Act. Learn. · v2.7
            </p>
          </div>
          <StatusChip tone="success">System Online</StatusChip>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {["Hero", "Metrics", "Quick Actions", "Models", "Timeline", "Knowledge Base"].map((item) => (
            <button
              key={item}
              onClick={() => toggle(item)}
              className={`rounded-xl border px-3 py-2 text-xs ${
                widgets.includes(item)
                  ? "border-[#61DFFF]/40 bg-[#61DFFF]/10 text-white"
                  : "border-white/10 text-slate-500"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </GlassPanel>

      {widgets.includes("Metrics") && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Metric label="Models Online" value="4" />
          <Metric label="Memory" value="87%" />
          <Metric label="Knowledge Docs" value={String(knowledgeDocuments.length)} />
          <Metric label="Active Projects" value={String(projects.length)} />
          <Metric label="Running Agents" value={String(agents.filter((agent) => agent.status === "Running").length)} />
        </div>
      )}

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          {widgets.includes("Hero") && (
            <GlassPanel className="overflow-hidden p-5">
              <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">
                    O.R.I.O.N. System Status
                  </p>
                  <div className="aurora-wave-field mt-4 h-64 rounded-[16px] border border-[#61DFFF]/15" />
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <Metric label="Tasks Completed" value="1,482" />
                    <Metric label="Success Rate" value="98.7%" />
                    <Metric label="Data Processed" value="12.4 TB" />
                    <Metric label="Cost Saved" value="$12.47" />
                  </div>
                </div>
                <div className="space-y-3">
                  <Panel title="Memory / Projects">
                    <p>{memoryItems.length} memory clusters · {projects.length} active projects</p>
                  </Panel>
                  <Panel title="Agent Runtime">
                    <p>{agents[0].name} is {agents[0].status}; {agents[2].name} is refactoring Aurora.</p>
                  </Panel>
                  <Panel title="Quick Actions">
                    <div className="grid grid-cols-2 gap-2">
                      {["New Chat", "Start Agent", "New Project", "Search Memory", "Upload Files"].map((action) => (
                        <button
                          key={action}
                          className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left text-sm text-slate-300"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  </Panel>
                </div>
              </div>
            </GlassPanel>
          )}

          {widgets.includes("Models") && (
            <GlassPanel className="p-5">
              <h2 className="font-black text-white">Model Status</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                {dashboardModels.map((model) => (
                  <div key={model} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <p className="font-bold text-white">{model}</p>
                    <StatusChip tone="success" className="mt-3">Ready</StatusChip>
                  </div>
                ))}
              </div>
            </GlassPanel>
          )}
        </div>

        <div className="space-y-4">
          {widgets.includes("Knowledge Base") && (
            <KnowledgeBasePanel
              documents={knowledgeDocuments}
              path={knowledgePath}
              query={knowledgeQuery}
              results={knowledgeResults}
              loading={knowledgeLoading}
              message={knowledgeMessage}
              setPath={setKnowledgePath}
              setQuery={setKnowledgeQuery}
              indexFolder={indexKnowledgeFolderFromUI}
              searchKnowledge={searchKnowledgeFromUI}
            />
          )}

          {widgets.includes("Timeline") && (
            <GlassPanel className="p-5">
              <h2 className="font-black text-white">Aurora Timeline</h2>
              <div className="mt-4 space-y-3">
                {dashboardTimeline.map((step, index) => (
                  <div key={step} className="flex items-center gap-3 text-sm">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#61DFFF]/40 text-xs text-[#61DFFF]">
                      {index + 1}
                    </span>
                    <span className="text-slate-300">{step}</span>
                  </div>
                ))}
              </div>
            </GlassPanel>
          )}
        </div>
      </div>
    </div>
  );
}

function KnowledgeBasePanel({
  documents,
  path,
  query,
  results,
  loading,
  message,
  setPath,
  setQuery,
  indexFolder,
  searchKnowledge,
}: {
  documents: KnowledgeDocumentItem[];
  path: string;
  query: string;
  results: KnowledgeSearchItem[];
  loading: boolean;
  message: string;
  setPath: (value: string) => void;
  setQuery: (value: string) => void;
  indexFolder: () => void;
  searchKnowledge: () => void;
}) {
  return (
    <GlassPanel className="border-cyan-400/20 bg-white/[0.06] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Knowledge Base</h2>
          <p className="text-sm text-slate-400">
            Local documents, project files, notes, and searchable knowledge
          </p>
        </div>
        <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
          {documents.length} docs
        </span>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">
            Index Folder
          </p>
          <div className="flex gap-2">
            <input
              value={path}
              onChange={(event) => setPath(event.target.value)}
              placeholder="/home/titanvx/O.R.I.O.N/orion-ai/docs"
              className="min-w-0 flex-1 rounded-2xl border border-cyan-400/20 bg-black/40 px-4 py-3 text-sm outline-none ring-cyan-400/30 placeholder:text-slate-500 focus:ring-2"
            />
            <button
              onClick={indexFolder}
              disabled={loading}
              className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
            >
              Index
            </button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">
            Search Knowledge
          </p>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search local knowledge..."
              className="min-w-0 flex-1 rounded-2xl border border-cyan-400/20 bg-black/40 px-4 py-3 text-sm outline-none ring-cyan-400/30 placeholder:text-slate-500 focus:ring-2"
            />
            <button
              onClick={searchKnowledge}
              disabled={loading}
              className="rounded-2xl border border-cyan-400/30 px-4 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/10 disabled:opacity-60"
            >
              Search
            </button>
          </div>
        </div>

        {message && (
          <p className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
            {message}
          </p>
        )}

        <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-3">
          {documents.length === 0 ? (
            <p className="text-sm text-slate-500">No knowledge documents indexed yet.</p>
          ) : (
            documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setQuery(`Summarize knowledge document ${doc.id}`)}
                className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-left transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-100">{doc.title}</h3>
                  <span className="text-[10px] text-slate-500">ID {doc.id}</span>
                </div>
                <p className="mt-1 break-all text-xs text-slate-500">{doc.source_path}</p>
              </button>
            ))
          )}
        </div>

        {results.length > 0 && (
          <div className="max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
              Search Results
            </p>
            {results.map((result) => (
              <div key={result.chunk_id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                <p className="text-sm font-semibold text-slate-100">{result.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Document ID: {result.document_id} | Chunk {result.chunk_index}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-300">
                  {result.content.slice(0, 700)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassPanel>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <GlassPanel className="p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </GlassPanel>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[16px] border border-white/10 bg-black/20 p-4">
      <p className="font-bold text-white">{title}</p>
      <div className="mt-2 text-sm text-slate-400">{children}</div>
    </div>
  );
}
