import type { NotificationEventItem, ReminderItem, StartupBriefing } from "@/types/orion";
import { GlassPanel } from "@/components/aurora/glass-panel";

export function NotificationEnginePanel({
  reminders,
  events,
  startupBriefing,
  reminderTitle,
  reminderDueAt,
  loading,
  message,
  setReminderTitle,
  setReminderDueAt,
  createReminder,
  updateReminderStatus,
  generateStartupBriefing,
}: {
  reminders: ReminderItem[];
  events: NotificationEventItem[];
  startupBriefing: StartupBriefing | null;
  reminderTitle: string;
  reminderDueAt: string;
  loading: boolean;
  message: string;
  setReminderTitle: (value: string) => void;
  setReminderDueAt: (value: string) => void;
  createReminder: () => void;
  updateReminderStatus: (reminderId: number, status: string) => void;
  generateStartupBriefing: () => void;
}) {
  return (
    <GlassPanel className="border-cyan-400/20 bg-white/[0.06] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Notification Engine</h2>
          <p className="text-sm text-slate-400">
            Local reminders, due tasks, notification events, and startup briefing
          </p>
        </div>
        <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
          v4.3
        </span>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="grid gap-2">
          <input
            value={reminderTitle}
            onChange={(event) => setReminderTitle(event.target.value)}
            placeholder="Reminder title..."
            className="w-full rounded-2xl border border-cyan-400/20 bg-black/40 px-4 py-3 text-sm text-slate-100 outline-none ring-cyan-400/30 placeholder:text-slate-500 focus:ring-2"
          />
          <input
            value={reminderDueAt}
            onChange={(event) => setReminderDueAt(event.target.value)}
            placeholder="tomorrow, 30 minutes, 2 hours, or ISO date..."
            className="w-full rounded-2xl border border-cyan-400/20 bg-black/40 px-4 py-3 text-sm text-slate-100 outline-none ring-cyan-400/30 placeholder:text-slate-500 focus:ring-2"
          />
          <button
            onClick={createReminder}
            disabled={loading}
            className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Reminder"}
          </button>
        </div>

        <button
          onClick={generateStartupBriefing}
          className="w-full rounded-2xl border border-violet-400/30 px-4 py-3 text-sm font-bold text-violet-200 transition hover:bg-violet-500/10"
        >
          Generate Startup Briefing
        </button>

        {message && (
          <p className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
            {message}
          </p>
        )}

        {startupBriefing && (
          <details className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-cyan-200">
              Startup Briefing
            </summary>
            <pre className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">
              {startupBriefing.briefing}
            </pre>
          </details>
        )}

        <div className="max-h-80 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Reminders</p>
            <span className="text-xs text-cyan-300">{reminders.length}</span>
          </div>

          {reminders.length === 0 ? (
            <p className="text-sm text-slate-500">No reminders yet.</p>
          ) : (
            reminders.map((reminder) => (
              <div key={reminder.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-100">{reminder.title}</h3>
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
                      reminder.status === "due"
                        ? "border-red-400/30 text-red-200"
                        : reminder.status === "completed"
                          ? "border-emerald-400/30 text-emerald-200"
                          : "border-cyan-400/30 text-cyan-200"
                    }`}
                  >
                    {reminder.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Due: {reminder.due_at} | Priority: {reminder.priority}
                </p>
                {reminder.description && (
                  <p className="mt-2 text-xs leading-5 text-slate-400">{reminder.description}</p>
                )}
                {reminder.status !== "completed" && reminder.status !== "cancelled" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => updateReminderStatus(reminder.id, "completed")}
                      className="rounded-xl border border-emerald-400/30 px-3 py-2 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/10"
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => updateReminderStatus(reminder.id, "cancelled")}
                      className="rounded-xl border border-red-400/30 px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/10"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <details className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-cyan-200">
            Notification Events
          </summary>
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-sm text-slate-500">No notification events yet.</p>
            ) : (
              events.slice(0, 12).map((event) => (
                <div key={event.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{event.event_type}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">{event.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{event.created_at}</p>
                </div>
              ))
            )}
          </div>
        </details>
      </div>
    </GlassPanel>
  );
}
