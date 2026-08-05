"use client";

import { VoiceModule } from "@/components/aurora/modules/voice-module";

export function VoiceWorkspace() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <header className="rounded-3xl border border-cyan-300/15 bg-black/25 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
          Live voice state
        </p>

        <h1 className="mt-2 text-3xl font-semibold text-white">
          Wake phrase and voice readiness
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Monitor O.R.I.O.N.'s local voice state, wake phrase, listening mode,
          latest transcript, and latest voice event from the backend.
        </p>
      </header>

      <VoiceModule />

      <p className="rounded-2xl border border-white/10 bg-black/25 p-4 text-xs leading-5 text-slate-500">
        Safety: this page reads and resets local voice state only. It does not
        start microphone capture, record audio, or bypass browser/system
        permission controls.
      </p>
    </div>
  );
}
