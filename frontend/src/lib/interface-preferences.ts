import type { UiDensity } from "@/store/ui-store";

export const INTERFACE_PREFERENCES_STORAGE_KEY =
  "orion-interface-preferences-v1";

export type InterfacePreferences = {
  reducedMotion: boolean;
  uiDensity: UiDensity;
  use24HourTime: boolean;
};

export const DEFAULT_INTERFACE_PREFERENCES: InterfacePreferences = {
  reducedMotion: false,
  uiDensity: "comfortable",
  use24HourTime: true,
};

type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;

function browserStorage(): PreferenceStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readInterfacePreferences(
  storage: PreferenceStorage | null = browserStorage(),
): InterfacePreferences {
  if (!storage) return { ...DEFAULT_INTERFACE_PREFERENCES };

  try {
    const raw = storage.getItem(INTERFACE_PREFERENCES_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_INTERFACE_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<InterfacePreferences>;
    return {
      reducedMotion:
        typeof parsed.reducedMotion === "boolean"
          ? parsed.reducedMotion
          : DEFAULT_INTERFACE_PREFERENCES.reducedMotion,
      uiDensity:
        parsed.uiDensity === "compact" || parsed.uiDensity === "comfortable"
          ? parsed.uiDensity
          : DEFAULT_INTERFACE_PREFERENCES.uiDensity,
      use24HourTime:
        typeof parsed.use24HourTime === "boolean"
          ? parsed.use24HourTime
          : DEFAULT_INTERFACE_PREFERENCES.use24HourTime,
    };
  } catch {
    return { ...DEFAULT_INTERFACE_PREFERENCES };
  }
}

export function writeInterfacePreferences(
  preferences: InterfacePreferences,
  storage: PreferenceStorage | null = browserStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(
      INTERFACE_PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences),
    );
  } catch {
    // Storage can be unavailable in hardened browser modes; UI state still works.
  }
}
