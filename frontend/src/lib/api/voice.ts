import { apiGet, apiPost } from "@/lib/api/client";
import type { VoiceStatus } from "@/components/aurora/aurora-types";

export const getVoiceStatus = () =>
  apiGet<VoiceStatus>("/api/voice/status");
export const resetVoiceStatus = () =>
  apiPost<{ status: string }>("/api/voice/reset");

export type VoiceTranscriptionResponse = {
  status: "review_required";
  transcript: string;
  auto_submitted: false;
};

export const transcribeVoiceCapture = (audio: Blob) => {
  const form = new FormData();
  const extension = audio.type.includes("wav") ? "wav" : audio.type.includes("ogg") ? "ogg" : "webm";
  form.append("audio", audio, `voice-capture.${extension}`);
  return apiPost<VoiceTranscriptionResponse>("/api/voice/transcribe", form, {
    timeoutMs: 60_000,
  });
};
