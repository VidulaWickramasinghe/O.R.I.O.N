"use client";

import { create } from "zustand";

export type OrbState = "idle" | "thinking" | "executing" | "speaking" | "success" | "warning" | "danger";
export type SidebarMode = "expanded" | "hidden";
export type UiDensity = "comfortable" | "compact";

type UiState = {
  commandOpen: boolean;
  notificationsOpen: boolean;
  sidebarMode: SidebarMode;
  mobileSidebarOpen: boolean;
  contextOpen: boolean;
  orbState: OrbState;
  petVisible: boolean;
  petPreferenceReady: boolean;
  reducedMotion: boolean;
  uiDensity: UiDensity;
  use24HourTime: boolean;
  interfacePreferenceReady: boolean;
  setCommandOpen: (open: boolean) => void;
  setNotificationsOpen: (open: boolean) => void;
  setSidebarMode: (mode: SidebarMode) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setContextOpen: (open: boolean) => void;
  setOrbState: (state: OrbState) => void;
  setPetVisible: (visible: boolean) => void;
  setPetPreferenceReady: (ready: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  setUiDensity: (density: UiDensity) => void;
  setUse24HourTime: (enabled: boolean) => void;
  setInterfacePreferenceReady: (ready: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  commandOpen: false,
  notificationsOpen: false,
  sidebarMode: "expanded",
  mobileSidebarOpen: false,
  contextOpen: true,
  orbState: "idle",
  petVisible: true,
  petPreferenceReady: false,
  reducedMotion: false,
  uiDensity: "comfortable",
  use24HourTime: true,
  interfacePreferenceReady: false,
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setNotificationsOpen: (notificationsOpen) => set({ notificationsOpen }),
  setSidebarMode: (sidebarMode) => set({ sidebarMode }),
  setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
  setContextOpen: (contextOpen) => set({ contextOpen }),
  setOrbState: (orbState) => set({ orbState }),
  setPetVisible: (petVisible) => set({ petVisible }),
  setPetPreferenceReady: (petPreferenceReady) => set({ petPreferenceReady }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setUiDensity: (uiDensity) => set({ uiDensity }),
  setUse24HourTime: (use24HourTime) => set({ use24HourTime }),
  setInterfacePreferenceReady: (interfacePreferenceReady) =>
    set({ interfacePreferenceReady }),
}));
