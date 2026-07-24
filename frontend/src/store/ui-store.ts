"use client";

import { create } from "zustand";

export type OrbState = "idle" | "thinking" | "executing" | "speaking" | "success" | "warning" | "danger";

type UiState = {
  commandOpen: boolean;
  notificationsOpen: boolean;
  sidebarCollapsed: boolean;
  contextOpen: boolean;
  orbState: OrbState;
  setCommandOpen: (open: boolean) => void;
  setNotificationsOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setContextOpen: (open: boolean) => void;
  setOrbState: (state: OrbState) => void;
};

export const useUiStore = create<UiState>((set) => ({
  commandOpen: false,
  notificationsOpen: false,
  sidebarCollapsed: false,
  contextOpen: true,
  orbState: "idle",
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setNotificationsOpen: (notificationsOpen) => set({ notificationsOpen }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setContextOpen: (contextOpen) => set({ contextOpen }),
  setOrbState: (orbState) => set({ orbState }),
}));
