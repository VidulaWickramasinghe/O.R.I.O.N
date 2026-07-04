"use client";

import { useEffect, useState } from "react";

import { VoiceStatus } from "../aurora-types";
import { ModuleShell } from "./module-shell";

export function VoiceModule() {
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus | null>(null);

  async function loadVoiceStatus() {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/voice/status");
      const data = await response.json();
      setVoiceStatus(data);
    } catch {
      setVoiceStatus(null);
    }
  }

  async function resetVoice() {
    await fetch("http://127.0.0.1:8000/api/voice/reset", {
      method: "POST",
    });
    await loadVoiceStatus();
  }

  useEffect(() => {
    loadVoiceStatus();
    const timer = setInterval(loadVoiceStatus, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <ModuleShell
      title="Voice"
      description="Wake phrase status, transcripts, concise spoken replies, and voice controls."
      badge={voiceStatus?.listening ? "listening" : "idle"}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <VoiceCard label="Wake Phrase" value={voiceStatus?.wake_phrase || "Hey Orion"} />
        <VoiceCard label="Mode" value={voiceStatus?.mode || "idle"} />
        <VoiceCard label="Listening" value={voiceStatus?.listening ? "Yes" : "No"} />

        <div className="rounded-3xl border border-white/10 bg-black/30 p-5 md:col-span-2 xl:col-span-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Last Transcript
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {voiceStatus?.last_transcript || "No transcript yet."}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/30 p-5 md:col-span-2 xl:col-span-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Last Event
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {voiceStatus?.last_event || "No voice event yet."}
          </p>
        </div>

        <button
          onClick={resetVoice}
          className="rounded-2xl border border-cyan-400/30 px-4 py-3 text-sm font-bold text-cyan-200 hover:bg-cyan-500/10"
        >
          Reset Voice State
        </button>
      </div>
    </ModuleShell>
  );
}

function VoiceCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-xl font-black text-white">{value}</p>
    </div>
  );
}
