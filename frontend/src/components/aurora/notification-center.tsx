"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { useAuroraNotificationEvents } from "@/components/aurora/lib/aurora-queries";
import { useUiStore } from "@/store/ui-store";

import { GlassPanel } from "./glass-panel";
import { StatusChip } from "./status-chip";

export function NotificationCenter() {
  const open = useUiStore((state) => state.notificationsOpen);
  const setOpen = useUiStore((state) => state.setNotificationsOpen);
  const notificationEventsQuery = useAuroraNotificationEvents();
  const notificationEvents = notificationEventsQuery.data?.events ?? [];
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30"
      onClick={() => setOpen(false)}
    >
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="orion-notifications-title"
        className="ml-auto h-full w-full max-w-sm border-l border-white/10 bg-[#05070B]/95 p-5 backdrop-blur-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="orion-notifications-title" className="text-lg font-black text-white">
            Notifications
          </h2>
          <button
            ref={closeRef}
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
            className="rounded-xl border border-white/10 p-2 text-slate-400"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {notificationEventsQuery.isLoading ? (
            <GlassPanel className="p-4">
              <p role="status" className="text-sm text-slate-500">Loading notifications…</p>
            </GlassPanel>
          ) : notificationEventsQuery.isError ? (
            <GlassPanel className="border-rose-300/20 p-4">
              <p role="alert" className="text-sm text-rose-200">Notifications are unavailable.</p>
              <button type="button" onClick={() => void notificationEventsQuery.refetch()} className="mt-3 rounded-xl border border-rose-300/20 px-3 py-2 text-xs font-bold text-rose-100">Retry</button>
            </GlassPanel>
          ) : notificationEvents.length === 0 ? (
            <GlassPanel className="p-4">
              <p className="text-sm text-slate-500">
                No backend notification events.
              </p>
            </GlassPanel>
          ) : (
            notificationEvents.map((event) => (
              <GlassPanel
                key={event.id}
                className="p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-white">
                    {event.title}
                  </p>

                  <StatusChip tone="primary">
                    {event.event_type}
                  </StatusChip>
                </div>

                <p className="mt-2 text-sm text-slate-400">
                  {event.message}
                </p>

                <p className="mt-2 text-[10px] text-slate-600">
                  {event.source} · {event.created_at}
                </p>
              </GlassPanel>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
