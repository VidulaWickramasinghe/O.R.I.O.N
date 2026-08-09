"use client";

import { ReactNode, useEffect } from "react";

import { AiOrb } from "./ai-orb";
import { CommandPalette } from "./command-palette";
import { ContextPanel } from "./context-panel";
import { NotificationCenter } from "./notification-center";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

import { useUiStore } from "@/store/ui-store";

const CONTEXT_PANEL_STORAGE_KEY = "orion-context-open";

export function AppShell({ children }: { children: ReactNode }) {
  const contextOpen = useUiStore((state) => state.contextOpen);
  const setContextOpen = useUiStore((state) => state.setContextOpen);

  useEffect(() => {
    const stored = window.localStorage.getItem(
      CONTEXT_PANEL_STORAGE_KEY,
    );

    if (stored === "true" || stored === "false") {
      setContextOpen(stored === "true");
    }
  }, [setContextOpen]);

  useEffect(() => {
    window.localStorage.setItem(
      CONTEXT_PANEL_STORAGE_KEY,
      String(contextOpen),
    );
  }, [contextOpen]);

  return (
    <main className="aurora-os-bg flex h-dvh overflow-hidden bg-[#05070b] text-slate-100">
      <Sidebar />

      <section className="relative flex min-w-0 flex-1 flex-col">
        <Topbar />

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

      <AiOrb />
      <CommandPalette />
      <NotificationCenter />
    </main>
  );
}
