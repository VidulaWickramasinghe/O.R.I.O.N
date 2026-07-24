import type { RecordingModeState } from "@/types/recording";
const STORAGE_KEY = "orion_recording_mode_state_v5_4";
const DEFAULT_STATE: RecordingModeState = { enabled: false, sceneId: "opening", startedAt: "", showLargeCallout: true, hideNoisyPanels: false, showTimer: true, checklistOpen: true };
export const loadRecordingModeState = (): RecordingModeState => { if (typeof window === "undefined") return DEFAULT_STATE; try { const raw = window.localStorage.getItem(STORAGE_KEY); return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE; } catch { return DEFAULT_STATE; } };
export const saveRecordingModeState = (state: RecordingModeState) => { if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); };
export const resetRecordingModeState = (): RecordingModeState => { saveRecordingModeState(DEFAULT_STATE); return DEFAULT_STATE; };
