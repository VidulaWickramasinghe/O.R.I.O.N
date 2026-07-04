"use client";

import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import {
  Activity,
  Bot,
  Brain,
  Briefcase,
  FileText,
  FolderKanban,
  Gauge,
  Globe2,
  Home,
  Lock,
  MessageSquare,
  Mic,
  MonitorCog,
  PlayCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wrench,
  X,
} from "lucide-react";

import { AuroraView } from "../aurora-types";

type CommandAction = {
  id: string;
  title: string;
  subtitle: string;
  group: string;
  icon: React.ElementType;
  keywords: string[];
  run: () => void;
};

type AuroraCommandPaletteProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  setActiveView: (view: AuroraView) => void;
  runAssistantCommand: (message: string) => void;
  runSystemDoctor?: () => void;
  generateDemoPack?: () => void;
};

export function AuroraCommandPalette({
  open,
  setOpen,
  setActiveView,
  runAssistantCommand,
  runSystemDoctor,
  generateDemoPack,
}: AuroraCommandPaletteProps) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const modifierPressed = isMac ? event.metaKey : event.ctrlKey;

      if (modifierPressed && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(!open);
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  const actions = useMemo<CommandAction[]>(
    () => [
      {
        id: "open-dashboard",
        title: "Open Dashboard",
        subtitle: "Go to Aurora OS overview.",
        group: "Navigation",
        icon: Home,
        keywords: ["home", "overview", "dashboard"],
        run: () => setActiveView("dashboard"),
      },
      {
        id: "open-assistant",
        title: "Open Assistant",
        subtitle: "Go to O.R.I.O.N. chat console.",
        group: "Navigation",
        icon: MessageSquare,
        keywords: ["chat", "orion", "assistant"],
        run: () => setActiveView("assistant"),
      },
      {
        id: "open-memory",
        title: "Open Memory",
        subtitle: "View memory matrix and context retrieval.",
        group: "Navigation",
        icon: Brain,
        keywords: ["memory", "context", "recall"],
        run: () => setActiveView("memory"),
      },
      {
        id: "open-projects",
        title: "Open Projects",
        subtitle: "View project launcher and project memory.",
        group: "Navigation",
        icon: FolderKanban,
        keywords: ["projects", "launcher", "portfolio"],
        run: () => setActiveView("projects"),
      },
      {
        id: "open-missions",
        title: "Open Missions",
        subtitle: "View mission planner and run history.",
        group: "Navigation",
        icon: Briefcase,
        keywords: ["missions", "planner", "execution"],
        run: () => setActiveView("missions"),
      },
      {
        id: "open-workspaces",
        title: "Open Workspaces",
        subtitle: "View local workspaces and desktop actions.",
        group: "Navigation",
        icon: MonitorCog,
        keywords: ["workspace", "folder", "vscode"],
        run: () => setActiveView("workspaces"),
      },
      {
        id: "open-tools",
        title: "Open Tools",
        subtitle: "View approvals, tools, and execution gates.",
        group: "Navigation",
        icon: Wrench,
        keywords: ["tools", "approvals", "commands"],
        run: () => setActiveView("tools"),
      },
      {
        id: "open-browser",
        title: "Open Browser Research",
        subtitle: "Research public documentation pages.",
        group: "Navigation",
        icon: Globe2,
        keywords: ["browser", "research", "web"],
        run: () => setActiveView("browser"),
      },
      {
        id: "open-voice",
        title: "Open Voice",
        subtitle: "View wake phrase and voice state.",
        group: "Navigation",
        icon: Mic,
        keywords: ["voice", "wake", "hey orion"],
        run: () => setActiveView("voice"),
      },
      {
        id: "open-security",
        title: "Open Security",
        subtitle: "View command approval and safety gates.",
        group: "Navigation",
        icon: Lock,
        keywords: ["security", "safety", "approval"],
        run: () => setActiveView("security"),
      },
      {
        id: "open-system",
        title: "Open System",
        subtitle: "View production health and diagnostics.",
        group: "Navigation",
        icon: Gauge,
        keywords: ["system", "doctor", "health"],
        run: () => setActiveView("system"),
      },
      {
        id: "open-demo",
        title: "Open Demo Mode",
        subtitle: "View portfolio demo and release pack.",
        group: "Navigation",
        icon: Sparkles,
        keywords: ["demo", "portfolio", "release"],
        run: () => setActiveView("demo"),
      },
      {
        id: "open-console",
        title: "Open Console",
        subtitle: "View activity feed and tool events.",
        group: "Navigation",
        icon: Terminal,
        keywords: ["console", "logs", "activity"],
        run: () => setActiveView("console"),
      },

      {
        id: "ask-system-status",
        title: "Ask: Check System Status",
        subtitle: "Ask O.R.I.O.N. to inspect current system status.",
        group: "Assistant Commands",
        icon: ShieldCheck,
        keywords: ["status", "health", "system"],
        run: () => runAssistantCommand("Check system status."),
      },
      {
        id: "ask-next-step",
        title: "Ask: What Should I Do Next?",
        subtitle: "Ask O.R.I.O.N. for the next best development action.",
        group: "Assistant Commands",
        icon: Bot,
        keywords: ["next", "roadmap", "development"],
        run: () =>
          runAssistantCommand(
            "What should I do next for O.R.I.O.N.? Use current project context."
          ),
      },
      {
        id: "ask-workspaces",
        title: "Ask: Summarize Workspaces",
        subtitle: "Ask O.R.I.O.N. to summarize registered workspaces.",
        group: "Assistant Commands",
        icon: MonitorCog,
        keywords: ["workspace", "summary"],
        run: () =>
          runAssistantCommand(
            "Summarize my registered workspaces and tell me which one is most ready for GitHub release."
          ),
      },
      {
        id: "ask-missions",
        title: "Ask: List Missions",
        subtitle: "Ask O.R.I.O.N. to list current missions.",
        group: "Assistant Commands",
        icon: PlayCircle,
        keywords: ["missions", "list"],
        run: () => runAssistantCommand("List my missions."),
      },
      {
        id: "ask-memory",
        title: "Ask: Search Memory",
        subtitle: "Ask O.R.I.O.N. what it remembers.",
        group: "Assistant Commands",
        icon: Brain,
        keywords: ["memory", "remember"],
        run: () => runAssistantCommand("What do you remember about O.R.I.O.N.?"),
      },
      {
        id: "ask-release",
        title: "Ask: GitHub Release Readiness",
        subtitle: "Ask O.R.I.O.N. to inspect release readiness.",
        group: "Assistant Commands",
        icon: FileText,
        keywords: ["github", "release", "readiness"],
        run: () =>
          runAssistantCommand(
            "Inspect GitHub release readiness for workspace 1."
          ),
      },

      {
        id: "run-system-doctor",
        title: "Run System Doctor",
        subtitle: "Run production hardening diagnostics.",
        group: "System Actions",
        icon: Activity,
        keywords: ["doctor", "diagnostics", "production"],
        run: () => {
          if (runSystemDoctor) {
            runSystemDoctor();
          } else {
            setActiveView("system");
          }
        },
      },
      {
        id: "generate-demo-pack",
        title: "Generate Demo Release Pack",
        subtitle: "Generate portfolio/demo release files.",
        group: "System Actions",
        icon: Sparkles,
        keywords: ["demo", "release", "portfolio"],
        run: () => {
          if (generateDemoPack) {
            generateDemoPack();
          } else {
            setActiveView("demo");
          }
        },
      },
    ],
    [setActiveView, runAssistantCommand, runSystemDoctor, generateDemoPack]
  );

  const groupedActions = actions.reduce<Record<string, CommandAction[]>>(
    (groups, action) => {
      if (!groups[action.group]) {
        groups[action.group] = [];
      }

      groups[action.group].push(action);
      return groups;
    },
    {}
  );

  function runAction(action: CommandAction) {
    action.run();
    setOpen(false);
    setSearch("");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-md">
      <button
        className="absolute inset-0"
        onClick={() => setOpen(false)}
        aria-label="Close command palette"
      />

      <Command
        shouldFilter
        className="relative z-10 w-full max-w-3xl overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[#070B12]/95 shadow-2xl shadow-cyan-500/20"
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <Search size={20} className="text-cyan-300" />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            autoFocus
            placeholder="Search commands, modules, missions, tools..."
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
          />

          <button
            onClick={() => setOpen(false)}
            className="rounded-xl border border-white/10 p-2 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <Command.List className="max-h-[540px] overflow-y-auto p-3">
          <Command.Empty className="p-6 text-center text-sm text-slate-500">
            No command found.
          </Command.Empty>

          {Object.entries(groupedActions).map(([group, items]) => (
            <Command.Group
              key={group}
              heading={group}
              className="pb-3 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.22em] [&_[cmdk-group-heading]]:text-slate-500"
            >
              {items.map((action) => {
                const Icon = action.icon;

                return (
                  <Command.Item
                    key={action.id}
                    value={`${action.title} ${action.subtitle} ${action.keywords.join(
                      " "
                    )}`}
                    onSelect={() => runAction(action)}
                    className="flex cursor-pointer items-center gap-4 rounded-2xl px-4 py-3 text-sm text-slate-300 outline-none transition data-[selected=true]:bg-cyan-400/10 data-[selected=true]:text-white"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
                      <Icon size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{action.title}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {action.subtitle}
                      </p>
                    </div>
                  </Command.Item>
                );
              })}
            </Command.Group>
          ))}
        </Command.List>

        <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-xs text-slate-500">
          <span>Navigate with ↑ ↓</span>
          <span>Enter to run • Esc to close</span>
        </div>
      </Command>
    </div>
  );
}
