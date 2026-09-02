"use client";

import { VoiceModule } from "@/components/aurora/modules/voice-module";
import { VoiceCapture } from "@/components/aurora/modules/voice-capture";

export function VoiceWorkspace() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <header className="rounded-3xl border border-cyan-300/15 bg-black/25 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
          Live voice state
        </p>

        <h1 className="mt-2 text-3xl font-semibold text-white">
          Explicit voice capture and review
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Use explicit push-to-talk, review the transcript, then hand it to the
          normal Assistant flow without bypassing mission or approval controls.
        </p>
      </header>

      <VoiceCapture />

      <VoiceModule />

      <p className="rounded-2xl border border-white/10 bg-black/25 p-4 text-xs leading-5 text-slate-500">
        Safety: wake phrase listening is disabled in Aurora OS. There is no
        always-listening default. Audio capture requires a visible user action,
        and reviewed text enters the Assistant as an unsent draft.
      </p>
    </div>
  );
}
