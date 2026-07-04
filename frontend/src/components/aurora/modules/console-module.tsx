import { ActivityEvent } from "../aurora-types";
import { ModuleShell } from "./module-shell";

type ConsoleModuleProps = {
  activity: ActivityEvent[];
};

export function ConsoleModule({ activity }: ConsoleModuleProps) {
  return (
    <ModuleShell
      title="Console"
      description="System logs, activity feed, tool events, and audit trail."
      badge={`${activity.length} events`}
    >
      <div className="space-y-3">
        {activity.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-black/30 p-6 text-sm text-slate-500">
            No activity recorded yet.
          </div>
        ) : (
          activity.map((event) => (
            <div
              key={event.id}
              className="rounded-2xl border border-white/10 bg-black/30 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full border border-cyan-400/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                  {event.type}
                </span>
                <span className="text-xs text-slate-500">
                  {event.timestamp}
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-500">{event.source}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {event.message}
              </p>
            </div>
          ))
        )}
      </div>
    </ModuleShell>
  );
}
