"use client";

import { resetVoiceStatus } from "@/lib/api/voice";
import { useAuroraVoiceStatus } from "../lib/aurora-queries";
import { ModuleShell } from "./module-shell";

export function VoiceModule() {
  const voiceStatusQuery = useAuroraVoiceStatus();
  const voiceStatus = voiceStatusQuery.data ?? null;

  async function resetVoice() {
    await resetVoiceStatus();
  }

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
