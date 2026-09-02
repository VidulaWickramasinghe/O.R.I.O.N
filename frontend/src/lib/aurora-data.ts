import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  Briefcase,
  Database,
  FolderKanban,
  Gauge,
  Globe2,
  Home,
  Layers3,
  MessageSquare,
  Mic,
  MonitorCog,
  Plug,
  Settings2,
  ShieldCheck,
  SquareTerminal,
  Workflow,
  Wrench,
} from "lucide-react";

export type PrimaryDestination = {
  href: string;
  label: "Dashboard" | "Assistant" | "Missions" | "Context" | "Workspaces" | "Governance" | "System";
  icon: LucideIcon;
};

export type DestinationTask = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export type SidebarGroup = {
  label: string;
  items: DestinationTask[];
};

export const navItems: PrimaryDestination[] = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/assistant", label: "Assistant", icon: MessageSquare },
  { href: "/missions", label: "Missions", icon: Briefcase },
  { href: "/context", label: "Context", icon: Layers3 },
  { href: "/workspaces", label: "Workspaces", icon: MonitorCog },
  { href: "/governance", label: "Governance", icon: ShieldCheck },
  { href: "/system", label: "System", icon: Gauge },
];

export const destinationTasks: Record<PrimaryDestination["label"], DestinationTask[]> = {
  Dashboard: [{ href: "/", label: "Dashboard", description: "Current state and attention queue", icon: Home }],
  Assistant: [
    { href: "/assistant", label: "Assistant", description: "Chat and reason with O.R.I.O.N.", icon: MessageSquare },
    { href: "/voice", label: "Voice", description: "Push-to-talk and wake-phrase controls", icon: Mic },
    { href: "/browser", label: "Browser research", description: "Controlled public-web research", icon: Globe2 },
  ],
  Missions: [
    { href: "/missions", label: "Mission control", description: "Plan, approve, execute, and recover", icon: Briefcase },
    { href: "/workflows", label: "Workflow blueprints", description: "Reusable mission workflows", icon: Workflow },
    { href: "/agents", label: "Agent readiness", description: "Mission-agent capability state", icon: Bot },
  ],
  Context: [
    { href: "/context", label: "Memory & knowledge", description: "Inspect retrieved local context", icon: Database },
    { href: "/projects", label: "Projects", description: "Project-scoped memory and records", icon: FolderKanban },
  ],
  Workspaces: [
    { href: "/workspaces", label: "Workspace manager", description: "Trusted roots and developer actions", icon: MonitorCog },
  ],
  Governance: [
    { href: "/governance", label: "Governance overview", description: "Approvals, policy, and release evidence", icon: ShieldCheck },
    { href: "/security", label: "Security policy", description: "Profiles and enforcement state", icon: ShieldCheck },
    { href: "/tools", label: "Tools & approvals", description: "Permissions, decisions, and approval queue", icon: Wrench },
    { href: "/plugins", label: "Plugins", description: "Plugin state and permissions", icon: Plug },
  ],
  System: [
    { href: "/system", label: "System health", description: "Backend, desktop, persistence, and diagnostics", icon: Gauge },
    { href: "/analytics", label: "Analytics", description: "Event-derived operational telemetry", icon: BarChart3 },
    { href: "/settings", label: "User settings", description: "Profile and interface preferences", icon: Settings2 },
    { href: "/console", label: "Activity console", description: "Read-only activity and approval stream", icon: SquareTerminal },
  ],
};

export const sidebarGroups: SidebarGroup[] = [
  {
    label: "Operate",
    items: [...destinationTasks.Dashboard, ...destinationTasks.Assistant],
  },
  {
    label: "Mission control",
    items: destinationTasks.Missions,
  },
  {
    label: "Context & workspace",
    items: [...destinationTasks.Context, ...destinationTasks.Workspaces],
  },
  {
    label: "Governance",
    items: destinationTasks.Governance,
  },
  {
    label: "System",
    items: destinationTasks.System,
  },
];

const routeOwners = new Map(
  Object.entries(destinationTasks).flatMap(([label, tasks]) =>
    tasks.map((task) => [task.href, label as PrimaryDestination["label"]] as const),
  ),
);

routeOwners.set("/memory", "Context");
routeOwners.set("/control-center", "System");

export function destinationForPath(pathname: string): PrimaryDestination {
  const normalized = pathname !== "/" ? pathname.replace(/\/$/, "") : pathname;
  const exact = routeOwners.get(normalized);
  const label = exact ?? navItems.find((item) => item.href === normalized)?.label ?? "Dashboard";
  return navItems.find((item) => item.label === label) ?? navItems[0];
}

export const dashboardModels = ["GPT-5.5", "Claude", "Gemini", "Local LLM"];
export const dashboardTimeline = ["Request", "Planning", "Memory", "Agent", "Tools", "Approval", "Complete"];
