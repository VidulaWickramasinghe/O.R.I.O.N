export type CommandIcon =
  | "activity"
  | "assistant"
  | "context"
  | "dashboard"
  | "governance"
  | "missions"
  | "plugins"
  | "research"
  | "settings"
  | "system"
  | "tools"
  | "voice"
  | "workspaces";

export type NavigationCommand = {
  id: string;
  kind: "navigation";
  label: string;
  description: string;
  group: string;
  keywords: string[];
  icon: CommandIcon;
  href: string;
};

export type MutationCommand = {
  id: string;
  kind: "mutation";
  label: string;
  description: string;
  group: string;
  keywords: string[];
  icon: CommandIcon;
  action: "toggle-context-panel";
  confirmation: string;
};

export type OrionCommand = NavigationCommand | MutationCommand;
export type CommandIntent =
  | { type: "navigate"; href: string }
  | {
      type: "confirm";
      action: MutationCommand["action"];
      confirmation: string;
    };

export const ORION_COMMANDS: readonly OrionCommand[] = [
  { id: "open-dashboard", kind: "navigation", label: "Open Dashboard", description: "Return to the Aurora command overview.", group: "Destinations", keywords: ["home", "overview"], icon: "dashboard", href: "/" },
  { id: "open-assistant", kind: "navigation", label: "Open Assistant", description: "Start or continue an O.R.I.O.N. conversation.", group: "Destinations", keywords: ["chat", "conversation", "ai"], icon: "assistant", href: "/assistant" },
  { id: "open-missions", kind: "navigation", label: "Open Missions", description: "Plan, run, pause, and inspect missions.", group: "Destinations", keywords: ["plan", "steps", "runs", "history"], icon: "missions", href: "/missions" },
  { id: "open-context", kind: "navigation", label: "Open Context", description: "Inspect memory, knowledge, and retrieval context.", group: "Destinations", keywords: ["memory", "knowledge", "recall"], icon: "context", href: "/context" },
  { id: "open-workspaces", kind: "navigation", label: "Open Workspaces", description: "Inspect registered project workspaces.", group: "Destinations", keywords: ["folders", "projects", "developer"], icon: "workspaces", href: "/workspaces" },
  { id: "open-governance", kind: "navigation", label: "Open Governance", description: "Review approvals, policy, audit, and release evidence.", group: "Destinations", keywords: ["approval", "policy", "audit", "release"], icon: "governance", href: "/governance" },
  { id: "open-system", kind: "navigation", label: "Open System", description: "Inspect health, diagnostics, and persistence recovery.", group: "Destinations", keywords: ["doctor", "health", "backup", "recovery"], icon: "system", href: "/system" },
  { id: "open-tools", kind: "navigation", label: "Open Tools & Approvals", description: "Review tool permissions and pending approvals.", group: "Governance tasks", keywords: ["capability", "permission", "approval"], icon: "tools", href: "/tools" },
  { id: "open-security", kind: "navigation", label: "Open Security Policy", description: "Inspect the active security profile and controls.", group: "Governance tasks", keywords: ["strict", "balanced", "risk"], icon: "governance", href: "/security" },
  { id: "open-plugins", kind: "navigation", label: "Open Plugins", description: "Inspect plugin permissions and enabled state.", group: "Governance tasks", keywords: ["registry", "extensions", "permissions"], icon: "plugins", href: "/plugins" },
  { id: "open-analytics", kind: "navigation", label: "Open Analytics", description: "View persisted operational telemetry.", group: "System tasks", keywords: ["metrics", "events", "usage"], icon: "activity", href: "/analytics" },
  { id: "open-console", kind: "navigation", label: "Open Activity Console", description: "Inspect correlated activity and tool events.", group: "System tasks", keywords: ["logs", "events", "audit"], icon: "activity", href: "/console" },
  { id: "open-settings", kind: "navigation", label: "Open Settings", description: "Manage local user and model preferences.", group: "System tasks", keywords: ["profile", "preferences", "model"], icon: "settings", href: "/settings" },
  { id: "open-projects", kind: "navigation", label: "Open Projects", description: "Inspect project-scoped context.", group: "More tasks", keywords: ["project", "memory", "scope"], icon: "workspaces", href: "/projects" },
  { id: "open-workflows", kind: "navigation", label: "Open Workflows", description: "Inspect reusable mission blueprints.", group: "More tasks", keywords: ["blueprints", "templates", "missions"], icon: "missions", href: "/workflows" },
  { id: "open-agents", kind: "navigation", label: "Open Agent Runs", description: "Inspect scoped agent conversations and providers.", group: "More tasks", keywords: ["providers", "models", "sessions"], icon: "assistant", href: "/agents" },
  { id: "open-browser", kind: "navigation", label: "Open Browser Research", description: "Research bounded public web sources.", group: "More tasks", keywords: ["web", "research", "sources"], icon: "research", href: "/browser" },
  { id: "open-voice", kind: "navigation", label: "Open Voice", description: "Inspect voice and wake phrase status.", group: "More tasks", keywords: ["microphone", "wake", "speech"], icon: "voice", href: "/voice" },
  { id: "toggle-live-context", kind: "mutation", label: "Toggle Live Context Panel", description: "Change whether the local context panel is visible.", group: "Local actions", keywords: ["show", "hide", "sidebar", "panel"], icon: "context", action: "toggle-context-panel", confirmation: "Toggle the Live Context panel for this local Aurora session?" },
] as const;

const normalize = (value: string) => value.trim().toLocaleLowerCase();

export function filterCommands(
  query: string,
  commands: readonly OrionCommand[] = ORION_COMMANDS,
): OrionCommand[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [...commands];

  return commands
    .map((command, order) => {
      const label = normalize(command.label);
      const searchable = normalize(
        [command.label, command.description, command.group, ...command.keywords].join(" "),
      );
      const words = searchable.split(/[^a-z0-9]+/).filter(Boolean);
      if (!terms.every((term) => words.some((word) => word.startsWith(term)))) {
        return null;
      }
      const score =
        (label === terms.join(" ") ? 100 : 0) +
        (label.startsWith(terms[0]) ? 30 : 0) +
        terms.reduce((total, term) => total + (label.includes(term) ? 10 : 1), 0);
      return { command, order, score };
    })
    .filter((result): result is { command: OrionCommand; order: number; score: number } => Boolean(result))
    .sort((left, right) => right.score - left.score || left.order - right.order)
    .map(({ command }) => command);
}

export function moveCommandSelection(
  current: number,
  direction: "next" | "previous",
  commandCount: number,
): number {
  if (commandCount <= 0) return 0;
  if (direction === "next") return (current + 1) % commandCount;
  return (current - 1 + commandCount) % commandCount;
}

export function resolveCommandIntent(command: OrionCommand): CommandIntent {
  if (command.kind === "navigation") {
    return { type: "navigate", href: command.href };
  }
  return {
    type: "confirm",
    action: command.action,
    confirmation: command.confirmation,
  };
}
