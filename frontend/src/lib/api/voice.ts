import { apiGet, apiPost } from "@/lib/api/client";
import type { VoiceStatus } from "@/components/aurora/aurora-types";

export const getVoiceStatus = () =>
  apiGet<VoiceStatus>("/api/voice/status");
export const resetVoiceStatus = () =>
  apiPost<{ status: string }>("/api/voice/reset");
