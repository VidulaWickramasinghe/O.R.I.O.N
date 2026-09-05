"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, FileSearch, FolderLock, RefreshCw, Search } from "lucide-react";

import { useAuroraWorkspaces } from "@/components/aurora/lib/aurora-queries";
import {
  ContextSourceChip,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  OperationalStatusBanner,
  PageHeader,
} from "@/components/aurora/operational-ui";
import {
  getKnowledgeDocuments,
  indexKnowledgeFolder,
  searchKnowledge,
} from "@/lib/api/knowledge";

type KnowledgeDocument = {
  id: number;
  title?: string;
  source_path?: string;
  relative_path?: string;
  workspace_id?: number;
  extension?: string;
  size_bytes?: number;
  summary?: string;
  sensitivity?: string;
  chunk_count?: number;
  status?: string;
  indexed_at?: string;
  updated_at?: string;
};

type KnowledgeResult = {
  chunk_id?: number;
  document_id?: number;
  title?: string;
  source_path?: string;
  relative_path?: string;
  workspace_id?: number;
  content?: string;
  sensitivity?: string;
  retrieval_reason?: string;
  score?: number;
};

function validRelativePath(value: string) {
  const normalized = value.trim().replaceAll("\\", "/");
  return Boolean(normalized) && !normalized.startsWith("/") && !/^[a-zA-Z]:\//.test(normalized) && !normalized.split("/").includes("..");
}

export function KnowledgeWorkspace() {
  const queryClient = useQueryClient();
  const workspacesQuery = useAuroraWorkspaces();
  const documentsQuery = useQuery({
    queryKey: ["knowledge-documents"],
    queryFn: getKnowledgeDocuments,
  });
  const [workspaceId, setWorkspaceId] = useState("");
  const [relativePath, setRelativePath] = useState("");
  const [sourceConsent, setSourceConsent] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<KnowledgeResult[]>([]);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "warning" | "danger">("info");

  const workspaces = workspacesQuery.data?.workspaces ?? [];
  const trustedWorkspaces = workspaces.filter(
    (workspace) => workspace.status === "active" && workspace.trusted && workspace.source_consent,
  );
  const documents = (documentsQuery.data?.documents ?? []) as KnowledgeDocument[];
  const selectedWorkspace = workspaces.find((workspace) => String(workspace.id) === workspaceId);

  const indexMutation = useMutation({
    mutationFn: () => indexKnowledgeFolder(Number(workspaceId), relativePath.trim(), sourceConsent),
    onSuccess: async (data) => {
      setMessageTone(data.status === "partial" ? "warning" : "info");
      setMessage(data.message || "Knowledge source indexed.");
      await queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
    },
    onError: (error) => {
      setMessageTone("danger");
      setMessage(error instanceof Error ? error.message : "Indexing failed.");
    },
  });
  const searchMutation = useMutation({
    mutationFn: (scope: { query: string; workspaceId: number }) =>
      searchKnowledge(scope.query, scope.workspaceId, 12),
    onSuccess: (data, scope) => {
      if (String(scope.workspaceId) !== workspaceId) return;
      setResults((data.results ?? []) as KnowledgeResult[]);
      setMessageTone("info");
      setMessage("");
    },
    onError: (error) => {
      setResults([]);
      setMessageTone("danger");
      setMessage(error instanceof Error ? error.message : "Knowledge search failed.");
    },
  });

  const pathProblem = useMemo(() => {
    if (!relativePath.trim()) return "Enter a path relative to the registered workspace.";
    if (!validRelativePath(relativePath)) return "Use a relative path without '..', an absolute root, or a drive prefix.";
    return "";
  }, [relativePath]);

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <PageHeader
        eyebrow="Intelligence · Consented local sources"
        title="Knowledge"
        description="Index and search only registered workspace sources. Every result keeps its source, scope, sensitivity, and retrieval explanation visible."
        metadata={<p className="text-[10px] text-slate-600">{documentsQuery.dataUpdatedAt ? `Evidence updated ${new Date(documentsQuery.dataUpdatedAt).toLocaleString()}` : "Knowledge evidence not synchronized"}</p>}
        actions={<button type="button" onClick={() => void documentsQuery.refetch()} disabled={documentsQuery.isFetching} className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/20 px-3 py-2 text-xs font-bold text-cyan-100 disabled:opacity-50"><RefreshCw size={13} className={documentsQuery.isFetching ? "animate-spin" : ""} />Refresh</button>}
      />

      {(documentsQuery.isError || workspacesQuery.isError) ? <ErrorState title="Knowledge controls unavailable" description="Registered workspaces or indexed documents could not be loaded. Arbitrary local paths remain unavailable." onRetry={() => { void documentsQuery.refetch(); void workspacesQuery.refetch(); }} /> : null}
      {(documentsQuery.isLoading || workspacesQuery.isLoading) ? <LoadingSkeleton label="Loading knowledge sources" /> : null}
      {message ? <OperationalStatusBanner tone={messageTone} title={indexMutation.isPending || searchMutation.isPending ? "Operation in progress" : "Knowledge update"} description={message} /> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(320px,.75fr)_minmax(0,1.25fr)]">
        <section className="orion-panel p-5">
          <div className="flex items-center gap-3"><FolderLock className="text-cyan-300" size={18} /><div><h2 className="font-bold text-white">Register source</h2><p className="text-xs text-slate-500">Trusted workspace scope required</p></div></div>
          <div className="mt-5 space-y-4">
            <label className="block text-xs text-slate-400">Workspace
              <select value={workspaceId} onChange={(event) => { setWorkspaceId(event.target.value); setSourceConsent(false); setResults([]); setMessage(""); }} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0f17] px-3 py-2.5 text-sm text-slate-200">
                <option value="">Select a registered workspace</option>
                {workspaces.map((workspace) => {
                  const eligible = workspace.status === "active" && workspace.trusted && workspace.source_consent;
                  return <option key={workspace.id} value={workspace.id} disabled={!eligible}>{workspace.name}{eligible ? "" : " — trust and consent required"}</option>;
                })}
              </select>
              {workspaces.length > 0 && trustedWorkspaces.length === 0 ? <span className="mt-2 block text-[11px] text-amber-200">No active workspace currently has both trust and source consent.</span> : null}
            </label>
            <label className="block text-xs text-slate-400">Relative folder
              <input value={relativePath} onChange={(event) => { setRelativePath(event.target.value); setSourceConsent(false); }} placeholder="docs" className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-500" />
            </label>
            <p className={`text-[10px] ${relativePath && pathProblem ? "text-rose-300" : "text-slate-600"}`}>{pathProblem || `Resolved inside ${selectedWorkspace?.name || "the selected workspace"}; the backend revalidates containment and symlinks.`}</p>
            <label className="flex items-start gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-3 text-xs leading-5 text-amber-100/80">
              <input type="checkbox" checked={sourceConsent} onChange={(event) => setSourceConsent(event.target.checked)} className="mt-1" />
              I consent to index this source within the selected trusted workspace. Sensitive-file deny rules still apply.
            </label>
            <button type="button" disabled={!selectedWorkspace?.trusted || !selectedWorkspace?.source_consent || Boolean(pathProblem) || !sourceConsent || indexMutation.isPending} onClick={() => { setMessageTone("info"); setMessage("Indexing the approved workspace source…"); indexMutation.mutate(); }} className="w-full rounded-xl bg-cyan-300 px-4 py-3 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">{indexMutation.isPending ? "Indexing…" : "Index consented source"}</button>
          </div>
        </section>

        <section className="orion-panel p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1 text-xs text-slate-400">Search selected workspace
              <div className="mt-2 flex items-center rounded-xl border border-white/10 bg-black/25 px-3"><Search size={14} className="text-slate-500" /><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Why should this source match?" className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-500" /></div>
            </label>
            <button type="button" disabled={!selectedWorkspace?.trusted || !selectedWorkspace?.source_consent || !searchText.trim() || searchMutation.isPending} onClick={() => searchMutation.mutate({ query: searchText.trim(), workspaceId: Number(workspaceId) })} className="rounded-xl border border-cyan-300/20 px-4 py-3 text-xs font-bold text-cyan-100 disabled:opacity-40"><FileSearch size={14} className="mr-2 inline" />{searchMutation.isPending ? "Searching…" : "Search"}</button>
          </div>
          <div className="mt-5 space-y-3">
            {results.length === 0 ? <EmptyState title="No search results" description="Choose a workspace and search its consented knowledge. Results will explain why they matched and whether they are sensitive." /> : results.map((result, index) => (
              <article key={`${result.chunk_id ?? result.document_id ?? index}`} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-white">{result.title || "Untitled source"}</h3><ContextSourceChip label={result.relative_path || result.source_path || "Path unavailable"} kind="Knowledge" /></div>
                <p className="mt-3 line-clamp-4 text-xs leading-5 text-slate-400">{result.content || "No excerpt returned."}</p>
                <div className="mt-3 grid gap-2 text-[11px] text-slate-400 sm:grid-cols-2"><p>Why selected: {result.retrieval_reason || "Backend explanation unavailable"}</p><p>Workspace: {result.workspace_id ?? "unavailable"} · Sensitivity: {result.sensitivity || "unclassified"}{typeof result.score === "number" ? ` · Score ${result.score.toFixed(3)}` : ""}</p></div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="orion-panel p-5">
        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><Database size={18} className="text-violet-300" /><div><h2 className="font-bold text-white">Indexed sources</h2><p className="text-xs text-slate-500">{documents.length} documents returned by the backend</p></div></div></div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {documents.length === 0 ? <EmptyState title="No indexed sources" description="The connected backend returned no knowledge documents. Register a consented workspace source above." /> : documents.map((document) => (
            <article key={document.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-sm font-bold text-white">{document.title || "Untitled document"}</h3><p className="mt-1 break-all text-[10px] text-slate-600">{document.relative_path || document.source_path || "Source unavailable"}</p></div><ContextSourceChip label={`Workspace ${document.workspace_id ?? "unknown"}`} /></div>
              <p className="mt-3 text-xs leading-5 text-slate-400">{document.summary || "No document summary returned."}</p>
              <p className="mt-3 text-[11px] text-slate-400">Status: {document.status || "unavailable"} · Chunks: {document.chunk_count ?? "unavailable"} · Sensitivity: {document.sensitivity || "unclassified"} · Indexed: {document.indexed_at || document.updated_at || "unknown"}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
