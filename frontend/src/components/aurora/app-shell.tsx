"use client";

import { ReactNode } from "react";
import { AiOrb } from "./ai-orb";
import { CommandPalette } from "./command-palette";
import { ContextPanel } from "./context-panel";
import { NotificationCenter } from "./notification-center";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="aurora-os-bg flex h-dvh overflow-hidden bg-[#05070b] text-slate-100">
      <Sidebar />
      <section className="relative flex min-w-0 flex-1 flex-col">
        <Topbar />
        <div className="orion-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5 2xl:px-6">
          <div className="mx-auto w-full max-w-[1880px]">{children}</div>
        </div>
      </section>
      <ContextPanel />
      <AiOrb />
      <CommandPalette />
      <NotificationCenter />
    </main>
  );
}
