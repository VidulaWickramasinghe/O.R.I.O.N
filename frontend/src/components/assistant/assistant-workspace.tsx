"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Brain,
  CircleAlert,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { GlassPanel } from "@/components/aurora/glass-panel";
import { RecoveryState } from "@/components/aurora/feedback/RecoveryState";
import { StatusChip } from "@/components/aurora/status-chip";
import { previewChatContext, sendChatMessage, type ContextOptions } from "@/lib/api/chat";
import { useAuroraWorkspaces } from "@/components/aurora/lib/aurora-queries";
import { getSystemStatus } from "@/lib/api/status";
import { recoveryFromError, type RecoveryCode } from "@/lib/recovery";
import { consumeReviewedVoiceDraft } from "@/lib/voice-handoff";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  time: string;
};

type BackendState = {
  status: string;
  version?: string;
  mode?: string;
};

function nowLabel() {
  return new Intl.DateTimeFormat("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function AssistantWorkspace() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "system",
      content:
        "O.R.I.O.N. Assistant is ready to connect to the local backend. Messages are sent through /api/chat.",
      time: "--:--",
    },
  ]);

  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextPreview, setContextPreview] = useState("");
  const [contextHash, setContextHash] = useState("");
  const [systemInstructions, setSystemInstructions] = useState("");
  const [contextOptions, setContextOptions] = useState<ContextOptions>({ memory: true, knowledge: true, semantic: false, profile: false, activity: false });
  const [workspaceId, setWorkspaceId] = useState("");
  const [activeModel, setActiveModel] = useState("");
  const workspacesQuery = useAuroraWorkspaces();
  const [backend, setBackend] = useState<BackendState | null>(null);
  const [backendError, setBackendError] = useState("");
  const [recovery, setRecovery] = useState<RecoveryCode | null>(null);
  const [lastFailedDraft, setLastFailedDraft] = useState("");

  const threadRef = useRef<HTMLDivElement | null>(null);
  const draftRef = useRef<HTMLTextAreaElement | null>(null);
  const conversationIdRef = useRef("");
  const clientScopeIdRef = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : newId("chat"),
  );

  const backendOnline = backend?.status === "online";

  const statusTone = useMemo(() => {
    if (backendOnline) return "success";
    if (backendError) return "danger";
    return "warning";
  }, [backendOnline, backendError]);

  async function loadBackendStatus(clearRecovery = true) {
    setBackendError("");

    try {
      const data = await getSystemStatus();
      setBackend(data as BackendState);
      if (clearRecovery) setRecovery(null);
    } catch (error) {
      setBackend(null);
      setBackendError("Backend unavailable. Start O.R.I.O.N. on port 8000.");
      setRecovery(recoveryFromError(error, "backend_offline"));
    }
  }

  function restoreFailedDraft() {
    if (lastFailedDraft) setDraft(lastFailedDraft);
    setRecovery(null);
    requestAnimationFrame(() => draftRef.current?.focus());
  }

  function appendMessage(message: ChatMessage) {
    setMessages((current) => [...current, message]);
  }

  function newConversation() {
    conversationIdRef.current = "";
    clientScopeIdRef.current = newId("chat");
    setContextPreview("");
    setContextHash("");
    setSystemInstructions("");
    appendMessage({ id: newId("scope"), role: "system", content: "New conversation. Earlier messages will not be sent with the next request.", time: nowLabel() });
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();

    const cleanMessage = draft.trim();
    if (!cleanMessage || thinking) return;

    setDraft("");
    setThinking(true);
    setContextPreview("");
    setRecovery(null);
    setLastFailedDraft(cleanMessage);

    appendMessage({
      id: newId("user"),
      role: "user",
      content: cleanMessage,
      time: nowLabel(),
    });

    try {
      const data = await sendChatMessage(cleanMessage, {
        conversation_id: conversationIdRef.current || undefined,
        client_scope_id: clientScopeIdRef.current,
        workspace_id: workspaceId ? Number(workspaceId) : undefined,
        context_options: contextOptions,
        expected_context_hash: contextHash || undefined,
      });
      setActiveModel(data.model ? `${data.provider} · ${data.model}` : "Provider unavailable");
      conversationIdRef.current = data.conversation_id || conversationIdRef.current;

      appendMessage({
        id: newId("assistant"),
        role: "assistant",
        content: data.response || "Backend returned an empty response.",
        time: nowLabel(),
      });

      const recoverableResponse = data.recoverable || data.status !== "completed";
      if (recoverableResponse) {
        setRecovery(recoveryFromError(new Error(data.response), "provider_unavailable"));
      } else {
        setLastFailedDraft("");
      }

      if (!backendOnline) {
        await loadBackendStatus(!recoverableResponse);
      }
    } catch (error) {
      appendMessage({
        id: newId("assistant-error"),
        role: "assistant",
        content:
          "Live chat failed. Confirm the backend is running and /api/chat is available.",
        time: nowLabel(),
      });

      setRecovery(recoveryFromError(error, "request_interrupted"));

      await loadBackendStatus(false);
    } finally {
      setThinking(false);
    }
  }

  async function previewContext() {
    const cleanMessage = draft.trim();
    if (!cleanMessage || contextLoading) return;

    setContextLoading(true);
    setContextPreview("");
    setRecovery(null);

    try {
      const data = await previewChatContext(cleanMessage, { workspace_id: workspaceId ? Number(workspaceId) : undefined, context_options: contextOptions });
      setContextPreview(data.context || "No context returned for this query.");
      setContextHash(data.context_hash || "");
      setSystemInstructions(data.system_instructions || "");
    } catch (error) {
      setContextPreview(
        "Context preview failed. Confirm /api/context/preview is available.",
      );
      setRecovery(recoveryFromError(error, "tool_failed"));
    } finally {
      setContextLoading(false);
    }
  }

  useEffect(() => {
    setMessages((current) =>
      current.map((message) =>
        message.id === "welcome"
          ? {
              ...message,
              time: nowLabel(),
            }
          : message,
      ),
    );

    const reviewedVoiceDraft = consumeReviewedVoiceDraft();
    if (reviewedVoiceDraft) {
      setDraft(reviewedVoiceDraft);
      requestAnimationFrame(() => draftRef.current?.focus());
    }

    void loadBackendStatus();
  }, []);

  useEffect(() => {
    if (threadRef.current && typeof threadRef.current.scrollTo === "function") {
      threadRef.current.scrollTo({
        top: threadRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, thinking]);

  return (
    <div className="grid h-full gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
      <GlassPanel className="flex min-h-[680px] flex-col overflow-hidden">
        <div className="border-b border-white/10 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="mr-auto text-2xl font-black text-white">
              O.R.I.O.N. Assistant
            </h1>

            <StatusChip tone={statusTone}>
              {backendOnline ? "Backend Live" : backendError ? "Backend Offline" : "Connecting…"}
            </StatusChip>

            {backend?.version && (
              <StatusChip tone="primary">Backend v{backend.version}</StatusChip>
            )}

            <StatusChip tone="warning">Approval-Gated Tools</StatusChip>
            {activeModel && <StatusChip tone="primary">{activeModel}</StatusChip>}
            <button type="button" onClick={newConversation} disabled={thinking || contextLoading} className="rounded-xl border border-white/20 px-3 py-2 text-sm text-slate-200 disabled:opacity-50">New conversation</button>
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Live chat console connected to the local backend. Tool execution
            remains controlled by O.R.I.O.N.&apos;s approval and permission layers.
          </p>

          {recovery && (
            <div className="mt-3">
              <RecoveryState
                code={recovery}
                description={backendError || undefined}
                onAction={recovery === "backend_offline" ? () => void loadBackendStatus() : restoreFailedDraft}
                actionLabel={recovery === "backend_offline" ? "Retry connection" : "Restore draft"}
                compact
              />
            </div>
          )}
        </div>

        <div
          ref={threadRef}
          className="flex-1 space-y-4 overflow-y-auto p-5"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-3xl rounded-2xl border p-4 ${
                message.role === "assistant"
                  ? "border-cyan-300/20 bg-cyan-300/[0.06]"
                  : message.role === "system"
                    ? "border-violet-300/20 bg-violet-300/[0.06]"
                    : "ml-auto border-white/10 bg-white/[0.05]"
              }`}
            >
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {message.role} · {message.time}
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-100">
                {message.content}
              </p>
            </div>
          ))}

          {thinking && (
            <p role="status" aria-live="polite" className="text-sm text-cyan-300">
              O.R.I.O.N. is processing through the backend...
            </p>
          )}
        </div>

        <form onSubmit={submit} className="border-t border-white/10 p-4">
          <textarea
            ref={draftRef}
            aria-label="Message O.R.I.O.N."
            value={draft}
            onChange={(event) => { setDraft(event.target.value); setContextHash(""); setContextPreview(""); }}
            disabled={contextLoading}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submit();
              }
            }}
            className="min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-[#05070B]/70 p-4 text-sm text-white outline-none focus:border-cyan-300/40 focus-visible:ring-2 focus-visible:ring-cyan-300"
            placeholder="Ask O.R.I.O.N. to plan, inspect memory, review missions, or explain system status..."
          />

          <div className="mt-3 flex flex-wrap justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void previewContext()}
                disabled={!draft.trim() || contextLoading}
                className="rounded-xl border border-violet-400/30 px-4 py-3 text-sm font-bold text-violet-200 hover:bg-violet-500/10 disabled:opacity-50"
              >
                <Brain className="inline" size={17} />{" "}
                {contextLoading ? "Previewing..." : "Preview Context"}
              </button>

              <button
                type="button"
                onClick={() => void loadBackendStatus()}
                className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/[0.05]"
              >
                <RefreshCw className="inline" size={17} /> Check Backend
              </button>
            </div>

            <button
              type="submit"
              disabled={thinking || contextLoading || !draft.trim()}
              className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-slate-950 hover:bg-cyan-200 disabled:opacity-50"
            >
              <Send className="inline" size={17} /> Send
            </button>
          </div>
        </form>
      </GlassPanel>

      <aside className="space-y-4">
        <SideCard icon={<Brain size={18} />} title="Context sent to the provider" body="Changing these choices starts a new conversation. Preview shows this turn's input; earlier messages and tool results remain part of an existing conversation.">
          <fieldset disabled={thinking || contextLoading} className="mt-4 space-y-3 text-sm text-slate-200">
            <label className="block">Workspace
              <select aria-label="Assistant workspace" value={workspaceId} onChange={(event) => { setWorkspaceId(event.target.value); newConversation(); }} className="mt-1 w-full rounded-lg border border-white/20 bg-[#101722] p-2">
                <option value="">No workspace context</option>
                {(workspacesQuery.data?.workspaces ?? []).map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
              </select>
            </label>
            {workspacesQuery.isError && <p role="status">Workspace list unavailable. Retry the backend connection.</p>}
            {([ ["memory", "Memory"], ["knowledge", "Workspace knowledge"], ["semantic", "Semantic search (sends query to embedding provider)"], ["profile", "Profile preferences"], ["activity", "Recent activity (may include other work)"] ] as const).map(([key, label]) => <label key={key} className="flex items-start gap-2"><input type="checkbox" checked={contextOptions[key]} onChange={(event) => { setContextOptions((current) => ({ ...current, [key]: event.target.checked })); newConversation(); }} className="mt-1" />{label}</label>)}
            <p className="text-xs leading-5 text-slate-400">Sensitive memories are excluded. Semantic search requires both memory and knowledge enabled. Tool permissions and approval gates still apply.</p>
          </fieldset>
        </SideCard>
        <SideCard
          icon={<Sparkles size={18} />}
          title="Live Chat"
          body={
            backendOnline
              ? "Messages are sent to /api/chat on the local backend."
              : "Backend status is offline or unchecked. No simulated online state is shown."
          }
        />

        <SideCard
          icon={<Brain size={18} />}
          title="Context Preview"
          body="Use Preview Context before sending to inspect memory/project context retrieved by the backend."
        >
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/30 p-3 text-xs leading-5 text-slate-300">
            {contextPreview || "No context preview yet."}
          </pre>
          {systemInstructions && <details className="mt-3 text-xs text-slate-300"><summary className="cursor-pointer">System instructions</summary><pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap">{systemInstructions}</pre></details>}
        </SideCard>

        <SideCard
          icon={<ShieldCheck size={18} />}
          title="Safety Layer"
          body="Assistant chat can request actions, but tools remain approval-gated through the backend."
        />

        <SideCard
          icon={<CircleAlert size={18} />}
          title="Backend State"
          body={`Status: ${backend?.status || "offline"}\nMode: ${
            backend?.mode || "unknown"
          }`}
        />
      </aside>
    </div>
  );
}

function SideCard({
  icon,
  title,
  body,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <GlassPanel className="p-4">
      <div className="flex items-center gap-2">
        <span className="text-cyan-300">{icon}</span>
        <h3 className="font-bold text-white">{title}</h3>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">
        {body}
      </p>

      {children}
    </GlassPanel>
  );
}
