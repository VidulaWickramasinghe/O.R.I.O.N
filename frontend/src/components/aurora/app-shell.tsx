"use client";

import { ReactNode, useEffect, useRef } from "react";

import { CommandPalette } from "./command-palette";
import { ContextPanel } from "./context-panel";
import { NotificationCenter } from "./notification-center";
import { OperationalStatusBar } from "./operational-status-bar";
import { OrionPet } from "./orion-pet";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useAuroraUserSettings } from "./lib/aurora-queries";

import {
  readInterfacePreferences,
  writeInterfacePreferences,
} from "@/lib/interface-preferences";
import { readPetVisibility, writePetVisibility } from "@/lib/pet-preference";
import { useUiStore } from "@/store/ui-store";

const CONTEXT_PANEL_STORAGE_KEY = "orion-context-open";

export function AppShell({ children }: { children: ReactNode }) {
  const contextOpen = useUiStore((state) => state.contextOpen);
  const setContextOpen = useUiStore((state) => state.setContextOpen);
  const setPetVisible = useUiStore((state) => state.setPetVisible);
  const setPetPreferenceReady = useUiStore(
    (state) => state.setPetPreferenceReady,
  );
  const reducedMotion = useUiStore((state) => state.reducedMotion);
  const uiDensity = useUiStore((state) => state.uiDensity);
  const setReducedMotion = useUiStore((state) => state.setReducedMotion);
  const setUiDensity = useUiStore((state) => state.setUiDensity);
  const setUse24HourTime = useUiStore((state) => state.setUse24HourTime);
  const setInterfacePreferenceReady = useUiStore(
    (state) => state.setInterfacePreferenceReady,
  );
  const settingsQuery = useAuroraUserSettings();
  const themeMode = settingsQuery.data?.settings_map?.theme_mode || "aurora_dark";
  const contextPreferenceLoaded = useRef(false);
  const petPreferenceLoaded = useRef(false);
  const interfacePreferenceLoaded = useRef(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(
      CONTEXT_PANEL_STORAGE_KEY,
    );

    if (stored === "true" || stored === "false") {
      setContextOpen(stored === "true");
    }

    contextPreferenceLoaded.current = true;

    return useUiStore.subscribe((state, previousState) => {
      if (
        contextPreferenceLoaded.current &&
        state.contextOpen !== previousState.contextOpen
      ) {
        window.localStorage.setItem(
          CONTEXT_PANEL_STORAGE_KEY,
          String(state.contextOpen),
        );
      }
    });
  }, [setContextOpen]);

  useEffect(() => {
    setPetVisible(readPetVisibility());
    setPetPreferenceReady(true);
    petPreferenceLoaded.current = true;

    return useUiStore.subscribe((state, previousState) => {
      if (
        petPreferenceLoaded.current &&
        state.petVisible !== previousState.petVisible
      ) {
        writePetVisibility(state.petVisible);
      }
    });
  }, [setPetPreferenceReady, setPetVisible]);

  useEffect(() => {
    const preferences = readInterfacePreferences();
    setReducedMotion(preferences.reducedMotion);
    setUiDensity(preferences.uiDensity);
    setUse24HourTime(preferences.use24HourTime);
    setInterfacePreferenceReady(true);
    interfacePreferenceLoaded.current = true;

    return useUiStore.subscribe((state, previousState) => {
      if (
        interfacePreferenceLoaded.current &&
        (state.reducedMotion !== previousState.reducedMotion ||
          state.uiDensity !== previousState.uiDensity ||
          state.use24HourTime !== previousState.use24HourTime)
      ) {
        writeInterfacePreferences({
          reducedMotion: state.reducedMotion,
          uiDensity: state.uiDensity,
          use24HourTime: state.use24HourTime,
        });
      }
    });
  }, [
    setInterfacePreferenceReady,
    setReducedMotion,
    setUiDensity,
    setUse24HourTime,
  ]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.orionDensity = uiDensity;
    root.dataset.orionReducedMotion = String(reducedMotion);
    root.dataset.orionTheme = themeMode;
  }, [reducedMotion, themeMode, uiDensity]);

  return (
    <main className="aurora-os-bg flex h-dvh overflow-hidden bg-[#05070b] text-slate-100">
      <Sidebar />

      <section className="relative flex min-w-0 flex-1 flex-col">
        <Topbar />
        <OperationalStatusBar />

        <div className="orion-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5 2xl:px-6">
          <div className="mx-auto w-full max-w-[1880px]">
            {children}
          </div>
        </div>
      </section>

      {contextOpen && (
        <div
          id="orion-live-context-panel"
          className="orion-scrollbar hidden h-dvh w-[360px] shrink-0 overflow-y-auto border-l border-white/[0.08] bg-[#070a10]/95 p-4 backdrop-blur-2xl xl:block 2xl:w-[420px]"
        >
          <ContextPanel />
        </div>
      )}

      <OrionPet />
      <CommandPalette />
      <NotificationCenter />
    </main>
  );
}
