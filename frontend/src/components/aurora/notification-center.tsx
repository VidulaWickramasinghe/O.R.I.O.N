"use client";
import { X } from "lucide-react";
import { notifications } from "@/lib/aurora-data";
import { useUiStore } from "@/store/ui-store";
import { GlassPanel } from "./glass-panel";
import { StatusChip } from "./status-chip";

export function NotificationCenter() {
  const open = useUiStore((state) => state.notificationsOpen);
  const setOpen = useUiStore((state) => state.setNotificationsOpen);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setOpen(false)}><aside className="ml-auto h-full w-full max-w-sm border-l border-white/10 bg-[#05070B]/95 p-5 backdrop-blur-2xl" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><h2 className="text-lg font-black text-white">Notifications</h2><button aria-label="Close notifications" onClick={() => setOpen(false)} className="rounded-xl border border-white/10 p-2 text-slate-400"><X size={16}/></button></div><div className="mt-5 space-y-3">{notifications.map((note) => <GlassPanel key={note.title} className="p-4"><div className="flex items-center justify-between gap-3"><p className="font-bold text-white">{note.title}</p><StatusChip tone={note.tone}>{note.tone}</StatusChip></div><p className="mt-2 text-sm text-slate-400">{note.detail}</p></GlassPanel>)}</div></aside></div>;
}
