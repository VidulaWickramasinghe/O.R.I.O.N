export const PET_VISIBILITY_STORAGE_KEY = "orion-pet-visible";

type PetPreferenceStorage = Pick<Storage, "getItem" | "setItem">;

function browserStorage(): PetPreferenceStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readPetVisibility(
  storage: PetPreferenceStorage | null = browserStorage(),
): boolean {
  if (!storage) return true;

  try {
    return storage.getItem(PET_VISIBILITY_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

export function writePetVisibility(
  visible: boolean,
  storage: PetPreferenceStorage | null = browserStorage(),
): void {
  if (!storage) return;

  try {
    storage.setItem(PET_VISIBILITY_STORAGE_KEY, String(visible));
  } catch {
    // A blocked local-storage write must not prevent the application from working.
  }
}
