"use client";
import { ReactNode } from "react";
import { AiOrb } from "./ai-orb";
import { CommandPalette } from "./command-palette";
import { ContextPanel } from "./context-panel";
import { NotificationCenter } from "./notification-center";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return <main className="aurora-os-bg flex h-screen overflow-hidden bg-[#05070B] text-slate-100"><Sidebar/><section className="flex min-w-0 flex-1 flex-col"><Topbar/><div className="min-h-0 flex-1 overflow-y-auto p-4 xl:p-5">{children}</div></section><ContextPanel/><AiOrb/><CommandPalette/><NotificationCenter/></main>;
}
