"use client";

import { create } from "zustand";

export type OrbState = "idle" | "thinking" | "executing" | "speaking" | "success" | "warning" | "danger";
export type SidebarMode = "expanded" | "compact" | "hidden";

type UiState = {
  commandOpen: boolean;
  notificationsOpen: boolean;
  sidebarMode: SidebarMode;
  mobileSidebarOpen: boolean;
  contextOpen: boolean;
  orbState: OrbState;
  setCommandOpen: (open: boolean) => void;
  setNotificationsOpen: (open: boolean) => void;
  setSidebarMode: (mode: SidebarMode) => void;
  cycleSidebarMode: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setContextOpen: (open: boolean) => void;
  setOrbState: (state: OrbState) => void;
};

export const useUiStore = create<UiState>((set) => ({
  commandOpen: false,
  notificationsOpen: false,
  sidebarMode: "expanded",
  mobileSidebarOpen: false,
  contextOpen: true,
  orbState: "idle",
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setNotificationsOpen: (notificationsOpen) => set({ notificationsOpen }),
  setSidebarMode: (sidebarMode) => set({ sidebarMode }),
  cycleSidebarMode: () =>
    set((state) => ({
      sidebarMode:
        state.sidebarMode === "expanded"
          ? "compact"
          : state.sidebarMode === "compact"
            ? "hidden"
            : "expanded",
    })),
  setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
  setContextOpen: (contextOpen) => set({ contextOpen }),
  setOrbState: (orbState) => set({ orbState }),
}));
