export const ORION_ASSISTANT_DRAFT_KEY = "orion:assistant:reviewed-voice-draft";

export function storeReviewedVoiceDraft(transcript: string): void {
  const cleanTranscript = transcript.trim();
  if (!cleanTranscript || typeof window === "undefined") return;
  window.sessionStorage.setItem(ORION_ASSISTANT_DRAFT_KEY, cleanTranscript);
}

export function consumeReviewedVoiceDraft(): string {
  if (typeof window === "undefined") return "";
  const draft = window.sessionStorage.getItem(ORION_ASSISTANT_DRAFT_KEY) ?? "";
  window.sessionStorage.removeItem(ORION_ASSISTANT_DRAFT_KEY);
  return draft;
}
