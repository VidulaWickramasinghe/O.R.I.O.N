import { ORION_RECORDING_SCENES } from "@/lib/recordingRegistry";
import type { RecordingModeState, RecordingSceneId } from "@/types/recording";

const STORAGE_KEY = "orion_recording_mode_state_v5_4";
const DEFAULT_STATE: RecordingModeState = {
  enabled: false,
  sceneId: "opening",
  startedAt: "",
  showLargeCallout: true,
  hideNoisyPanels: false,
  showTimer: true,
  checklistOpen: true,
};
const SCENE_IDS = new Set<RecordingSceneId>(
  ORION_RECORDING_SCENES.map((scene) => scene.id)
);

function normalizeState(value: unknown): RecordingModeState {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ...DEFAULT_STATE };
  }
  const candidate = value as Record<string, unknown>;
  const sceneId =
    typeof candidate.sceneId === "string" &&
    SCENE_IDS.has(candidate.sceneId as RecordingSceneId)
      ? (candidate.sceneId as RecordingSceneId)
      : DEFAULT_STATE.sceneId;
  const startedAt =
    typeof candidate.startedAt === "string" &&
    candidate.startedAt !== "" &&
    !Number.isNaN(Date.parse(candidate.startedAt))
      ? candidate.startedAt
      : "";
  return {
    enabled: candidate.enabled === true && startedAt !== "",
    sceneId,
    startedAt,
    showLargeCallout:
      typeof candidate.showLargeCallout === "boolean"
        ? candidate.showLargeCallout
        : DEFAULT_STATE.showLargeCallout,
    hideNoisyPanels: candidate.hideNoisyPanels === true,
    showTimer:
      typeof candidate.showTimer === "boolean"
        ? candidate.showTimer
        : DEFAULT_STATE.showTimer,
    checklistOpen:
      typeof candidate.checklistOpen === "boolean"
        ? candidate.checklistOpen
        : DEFAULT_STATE.checklistOpen,
  };
}

export function loadRecordingModeState(): RecordingModeState {
  if (typeof window === "undefined") return { ...DEFAULT_STATE };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw) as unknown) : { ...DEFAULT_STATE };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveRecordingModeState(state: RecordingModeState) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(state)));
  }
}

export function resetRecordingModeState(): RecordingModeState {
  const state = { ...DEFAULT_STATE };
  saveRecordingModeState(state);
  return state;
}
