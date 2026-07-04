import { AuroraCard } from "./aurora-card";

type Message = {
  role: "user" | "orion";
  content: string;
};

type AuroraAssistantProps = {
  messages: Message[];
  message: string;
  setMessage: (value: string) => void;
  loading: boolean;
  sendMessage: () => void;
  previewContext: () => void;
  contextPreviewLoading: boolean;
};

export function AuroraAssistant({
  messages,
  message,
  setMessage,
  loading,
  sendMessage,
  previewContext,
  contextPreviewLoading,
}: AuroraAssistantProps) {
  return (
    <AuroraCard className="flex min-h-[calc(100vh-130px)] flex-col p-6">
      <div className="mb-5">
        <h2 className="text-2xl font-black text-white">Assistant Console</h2>
        <p className="mt-1 text-sm text-slate-400">
          Chat with O.R.I.O.N. using context-aware memory and project retrieval.
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-3xl border border-white/10 bg-black/30 p-5">
        {messages.map((item, index) => (
          <div
            key={index}
            className={`rounded-3xl p-5 ${
              item.role === "user"
                ? "ml-auto max-w-[85%] border border-violet-400/20 bg-violet-500/10"
                : "mr-auto max-w-[85%] border border-cyan-400/20 bg-cyan-500/10"
            }`}
          >
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-slate-500">
              {item.role === "user" ? "You" : "O.R.I.O.N."}
            </p>
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-100">
              {item.content}
            </p>
          </div>
        ))}

        {loading && (
          <div className="mr-auto rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-5 text-sm text-cyan-200">
            O.R.I.O.N. is thinking...
          </div>
        )}
      </div>

      <div className="mt-5 flex gap-3">
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") sendMessage();
          }}
          placeholder="Ask O.R.I.O.N. something..."
          className="min-w-0 flex-1 rounded-2xl border border-cyan-400/20 bg-black/40 px-4 py-3 text-sm text-slate-100 outline-none ring-cyan-400/30 placeholder:text-slate-500 focus:ring-2"
        />

        <button
          onClick={previewContext}
          disabled={contextPreviewLoading || loading}
          className="rounded-2xl border border-cyan-400/30 px-5 py-3 text-sm font-bold text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-60"
        >
          {contextPreviewLoading ? "Scanning..." : "Context"}
        </button>

        <button
          onClick={sendMessage}
          disabled={loading}
          className="rounded-2xl bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
        >
          Send
        </button>
      </div>
    </AuroraCard>
  );
}
