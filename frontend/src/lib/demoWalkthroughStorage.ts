import { ORION_DEMO_WALKTHROUGH_STEPS } from "@/lib/demoWalkthroughRegistry";
import type { DemoWalkthroughState } from "@/types/demo";

const STORAGE_KEY = "orion_demo_walkthrough_state_v5_3";
const DEFAULT_STATE: DemoWalkthroughState = {
  enabled: false,
  currentStepIndex: 0,
  completed: false,
};

function normalizeState(value: unknown): DemoWalkthroughState {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ...DEFAULT_STATE };
  }
  const candidate = value as Record<string, unknown>;
  const finalIndex = Math.max(ORION_DEMO_WALKTHROUGH_STEPS.length - 1, 0);
  const index =
    typeof candidate.currentStepIndex === "number" &&
    Number.isSafeInteger(candidate.currentStepIndex)
      ? Math.min(Math.max(candidate.currentStepIndex, 0), finalIndex)
      : 0;
  return {
    enabled: candidate.enabled === true,
    currentStepIndex: index,
    completed: candidate.completed === true && index === finalIndex,
  };
}

export function loadDemoWalkthroughState(): DemoWalkthroughState {
  if (typeof window === "undefined") return { ...DEFAULT_STATE };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw) as unknown) : { ...DEFAULT_STATE };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveDemoWalkthroughState(state: DemoWalkthroughState) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(state)));
  }
}

export function resetDemoWalkthroughState(): DemoWalkthroughState {
  const state = { ...DEFAULT_STATE };
  saveDemoWalkthroughState(state);
  return state;
}
