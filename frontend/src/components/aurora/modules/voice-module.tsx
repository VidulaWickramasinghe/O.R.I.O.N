"use client";

import { resetVoiceStatus } from "@/lib/api/voice";
import { RecoveryState } from "@/components/aurora/feedback/RecoveryState";
import { recoveryFromError, type RecoveryCode } from "@/lib/recovery";
import { useState } from "react";
import { useAuroraVoiceStatus } from "../lib/aurora-queries";
import { ModuleShell } from "./module-shell";

export function VoiceModule() {
  const voiceStatusQuery = useAuroraVoiceStatus();
  const voiceStatus = voiceStatusQuery.data ?? null;
  const [recovery, setRecovery] = useState<RecoveryCode | null>(null);

  async function resetVoice() {
    setRecovery(null);
    try {
      await resetVoiceStatus();
      await voiceStatusQuery.refetch();
    } catch (error) {
      setRecovery(recoveryFromError(error, "tool_failed"));
    }
  }

  return (
    <ModuleShell
      title="Voice"
      description="Read-only voice state and explicit reset. Wake phrase listening is not started by Aurora OS."
      badge={voiceStatus?.listening ? "listening" : "idle"}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <VoiceCard label="Wake Phrase" value="Disabled by design" />
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

        {(voiceStatusQuery.isError || recovery) && (
          <div className="md:col-span-2 xl:col-span-3">
            <RecoveryState
              code={recovery ?? "backend_offline"}
              onAction={() => void voiceStatusQuery.refetch()}
              actionLabel="Retry voice status"
              compact
            />
          </div>
        )}

        <button
          type="button"
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
