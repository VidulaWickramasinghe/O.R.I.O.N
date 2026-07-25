import type { DemoWalkthroughState } from "@/types/demo";
const STORAGE_KEY = "orion_demo_walkthrough_state_v5_3";
const DEFAULT_STATE: DemoWalkthroughState = { enabled: false, currentStepIndex: 0, completed: false };
export function loadDemoWalkthroughState(): DemoWalkthroughState { if (typeof window === "undefined") return DEFAULT_STATE; try { const raw = window.localStorage.getItem(STORAGE_KEY); return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE; } catch { return DEFAULT_STATE; } }
export function saveDemoWalkthroughState(state: DemoWalkthroughState) { if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
export function resetDemoWalkthroughState(): DemoWalkthroughState { saveDemoWalkthroughState(DEFAULT_STATE); return DEFAULT_STATE; }
