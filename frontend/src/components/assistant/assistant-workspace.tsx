"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Brain,
  CircleAlert,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { GlassPanel } from "@/components/aurora/glass-panel";
import { StatusChip } from "@/components/aurora/status-chip";
import { previewChatContext, sendChatMessage } from "@/lib/api/chat";
import { getSystemStatus } from "@/lib/api/status";

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
  const [backend, setBackend] = useState<BackendState | null>(null);
  const [backendError, setBackendError] = useState("");

  const threadRef = useRef<HTMLDivElement | null>(null);

  const backendOnline = backend?.status === "online";

  const statusTone = useMemo(() => {
    if (backendOnline) return "success";
    if (backendError) return "danger";
    return "warning";
  }, [backendOnline, backendError]);

  async function loadBackendStatus() {
    setBackendError("");

    try {
      const data = await getSystemStatus();
      setBackend(data as BackendState);
    } catch {
      setBackend(null);
      setBackendError("Backend unavailable. Start O.R.I.O.N. on port 8000.");
    }
  }

  function appendMessage(message: ChatMessage) {
    setMessages((current) => [...current, message]);
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();

    const cleanMessage = draft.trim();
    if (!cleanMessage || thinking) return;

    setDraft("");
    setThinking(true);
    setContextPreview("");

    appendMessage({
      id: newId("user"),
      role: "user",
      content: cleanMessage,
      time: nowLabel(),
    });

    try {
      const data = await sendChatMessage(cleanMessage);

      appendMessage({
        id: newId("assistant"),
        role: "assistant",
        content: data.response || "Backend returned an empty response.",
        time: nowLabel(),
      });

      if (!backendOnline) {
        await loadBackendStatus();
      }
    } catch {
      appendMessage({
        id: newId("assistant-error"),
        role: "assistant",
        content:
          "Live chat failed. Confirm the backend is running and /api/chat is available.",
        time: nowLabel(),
      });

      await loadBackendStatus();
    } finally {
      setThinking(false);
    }
  }

  async function previewContext() {
    const cleanMessage = draft.trim();
    if (!cleanMessage || contextLoading) return;

    setContextLoading(true);
    setContextPreview("");

    try {
      const data = await previewChatContext(cleanMessage);
      setContextPreview(data.context || "No context returned for this query.");
    } catch {
      setContextPreview(
        "Context preview failed. Confirm /api/context/preview is available.",
      );
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

    void loadBackendStatus();
  }, []);

  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, thinking]);

  return (
    <div className="grid h-full gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <GlassPanel className="flex min-h-[680px] flex-col overflow-hidden">
        <div className="border-b border-white/10 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="mr-auto text-2xl font-black text-white">
              O.R.I.O.N. Assistant
            </h1>

            <StatusChip tone={statusTone}>
              {backendOnline ? "Backend Live" : "Backend Offline"}
            </StatusChip>

            {backend?.version && (
              <StatusChip tone="primary">Backend v{backend.version}</StatusChip>
            )}

            <StatusChip tone="warning">Approval-Gated Tools</StatusChip>
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Live chat console connected to the local backend. Tool execution
            remains controlled by O.R.I.O.N.'s approval and permission layers.
          </p>

          {backendError && (
            <p role="alert" className="mt-3 rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
              {backendError}
            </p>
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
            <p className="text-sm text-cyan-300">
              O.R.I.O.N. is processing through the backend...
            </p>
          )}
        </div>

        <form onSubmit={submit} className="border-t border-white/10 p-4">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submit();
              }
            }}
            className="min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-[#05070B]/70 p-4 text-sm text-white outline-none focus:border-cyan-300/40"
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
              disabled={thinking || !draft.trim()}
              className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-slate-950 hover:bg-cyan-200 disabled:opacity-50"
            >
              <Send className="inline" size={17} /> Send
            </button>
          </div>
        </form>
      </GlassPanel>

      <aside className="space-y-4">
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
