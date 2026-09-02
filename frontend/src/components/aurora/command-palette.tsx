"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Bot,
  Brain,
  BriefcaseBusiness,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  Mic,
  Plug,
  Search,
  Settings2,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";

import {
  filterCommands,
  moveCommandSelection,
  resolveCommandIntent,
  type CommandIcon,
  type MutationCommand,
  type OrionCommand,
} from "@/lib/command-registry";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";

const commandIcons: Record<CommandIcon, typeof Search> = {
  activity: Activity,
  assistant: Bot,
  context: Brain,
  dashboard: LayoutDashboard,
  governance: ShieldCheck,
  missions: BriefcaseBusiness,
  plugins: Plug,
  research: Search,
  settings: Settings2,
  system: Gauge,
  tools: Wrench,
  voice: Mic,
  workspaces: FolderKanban,
};

export function CommandPalette() {
  const router = useRouter();
  const open = useUiStore((state) => state.commandOpen);
  const setOpen = useUiStore((state) => state.setCommandOpen);
  const contextOpen = useUiStore((state) => state.contextOpen);
  const setContextOpen = useUiStore((state) => state.setContextOpen);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pendingMutation, setPendingMutation] =
    useState<MutationCommand | null>(null);
  const filteredCommands = useMemo(() => filterCommands(query), [query]);

  function closePalette() {
    setOpen(false);
    setQuery("");
    setSelectedIndex(0);
    setPendingMutation(null);
  }

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (open) closePalette();
        else setOpen(true);
        return;
      }
      if (open && event.key === "Escape") {
        event.preventDefault();
        if (pendingMutation) setPendingMutation(null);
        else closePalette();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  function execute(command: OrionCommand) {
    const intent = resolveCommandIntent(command);
    if (intent.type === "confirm") {
      setPendingMutation(command as MutationCommand);
      return;
    }
    router.push(intent.href);
    closePalette();
  }

  function confirmMutation() {
    if (!pendingMutation) return;
    if (pendingMutation.action === "toggle-context-panel") {
      setContextOpen(!contextOpen);
    }
    closePalette();
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((current) =>
        moveCommandSelection(
          current,
          event.key === "ArrowDown" ? "next" : "previous",
          filteredCommands.length,
        ),
      );
      return;
    }
    if (event.key === "Enter" && filteredCommands[selectedIndex]) {
      event.preventDefault();
      execute(filteredCommands[selectedIndex]);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-[10vh] backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) closePalette();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Aurora command palette"
        className="w-full max-w-2xl overflow-hidden rounded-[1.75rem] border border-cyan-300/20 bg-[#0a0e16]/98 shadow-2xl shadow-cyan-950/60"
      >
        {pendingMutation ? (
          <div
            role="alertdialog"
            aria-labelledby="command-confirmation-title"
            className="p-6"
          >
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300">
              Confirmation required
            </p>
            <h2
              id="command-confirmation-title"
              className="mt-3 text-xl font-semibold text-white"
            >
              {pendingMutation.label}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {pendingMutation.confirmation}
            </p>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              This changes local interface state only. No agent tool or backend
              capability will execute.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setPendingMutation(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                autoFocus
                onClick={confirmMutation}
                className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-200"
              >
                Confirm action
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
              <Search size={19} className="text-cyan-300" />
              <input
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleInputKeyDown}
                aria-label="Search commands"
                aria-controls="orion-command-results"
                aria-activedescendant={
                  filteredCommands[selectedIndex]
                    ? `command-${filteredCommands[selectedIndex].id}`
                    : undefined
                }
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                placeholder="Search destinations and safe actions…"
              />
              <button
                onClick={closePalette}
                aria-label="Close command palette"
                className="rounded-xl border border-white/10 p-2 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div
              id="orion-command-results"
              role="listbox"
              aria-label="Commands"
              className="orion-scrollbar max-h-[58vh] overflow-y-auto p-3"
            >
              {filteredCommands.length === 0 ? (
                <p className="p-8 text-center text-sm text-slate-500">
                  No matching command.
                </p>
              ) : (
                filteredCommands.map((command, index) => {
                  const Icon = commandIcons[command.icon];
                  const previousGroup = filteredCommands[index - 1]?.group;
                  return (
                    <div key={command.id}>
                      {command.group !== previousGroup && (
                        <p className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">
                          {command.group}
                        </p>
                      )}
                      <button
                        id={`command-${command.id}`}
                        role="option"
                        aria-selected={index === selectedIndex}
                        onMouseEnter={() => setSelectedIndex(index)}
                        onClick={() => execute(command)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition",
                          index === selectedIndex
                            ? "bg-cyan-300/10 text-white"
                            : "text-slate-300 hover:bg-white/[0.04]",
                        )}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] text-cyan-200">
                          <Icon size={17} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">
                            {command.label}
                          </span>
                          <span className="mt-1 block truncate text-xs text-slate-500">
                            {command.description}
                          </span>
                        </span>
                        {command.kind === "mutation" && (
                          <span className="rounded-lg border border-amber-300/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                            Confirm
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex justify-between border-t border-white/10 px-5 py-3 text-[11px] text-slate-500">
              <span>↑ ↓ Select</span>
              <span>Enter Run · Esc Close</span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
