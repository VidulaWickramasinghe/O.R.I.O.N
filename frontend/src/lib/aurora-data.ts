import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  CheckSquare2,
  ClipboardList,
  Database,
  FileSearch,
  Gauge,
  Home,
  Library,
  MessageSquare,
  MonitorCog,
  Plug,
  Rocket,
  Settings2,
  ShieldCheck,
  SquareTerminal,
  Wrench,
} from "lucide-react";

export type PrimaryDestination = {
  href: string;
  label: "Command" | "Operations" | "Intelligence" | "Environment" | "Capabilities" | "Governance" | "System";
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
  { href: "/", label: "Command", icon: Home },
  { href: "/missions", label: "Operations", icon: Briefcase },
  { href: "/memory", label: "Intelligence", icon: Database },
  { href: "/workspaces", label: "Environment", icon: MonitorCog },
  { href: "/tools", label: "Capabilities", icon: Wrench },
  { href: "/security", label: "Governance", icon: ShieldCheck },
  { href: "/system", label: "System", icon: Gauge },
];

export const destinationTasks: Record<PrimaryDestination["label"], DestinationTask[]> = {
  Command: [
    { href: "/", label: "Dashboard", description: "Current state, active work, and next action", icon: Home },
    { href: "/assistant", label: "Assistant", description: "Chat and reason with O.R.I.O.N.", icon: MessageSquare },
  ],
  Operations: [
    { href: "/missions", label: "Missions", description: "Plan, approve, execute, and recover", icon: Briefcase },
    { href: "/approvals", label: "Approvals", description: "Review actions waiting for a decision", icon: CheckSquare2 },
    { href: "/activity", label: "Activity", description: "Follow meaningful operational events", icon: ClipboardList },
  ],
  Intelligence: [
    { href: "/memory", label: "Memory", description: "Inspect and control retained context", icon: Database },
    { href: "/knowledge", label: "Knowledge", description: "Manage indexed, consented workspace sources", icon: Library },
  ],
  Environment: [
    { href: "/workspaces", label: "Workspaces", description: "Trusted roots and workspace profiles", icon: MonitorCog },
    { href: "/developer", label: "Developer Mode", description: "Inspect, review, approve, patch, and validate", icon: SquareTerminal },
  ],
  Capabilities: [
    { href: "/tools", label: "Tools", description: "Search capabilities, risks, and permissions", icon: Wrench },
    { href: "/plugins", label: "Plugins", description: "Inspect capability ownership and access", icon: Plug },
  ],
  Governance: [
    { href: "/security", label: "Security", description: "Effective policy, access, and recent denials", icon: ShieldCheck },
    { href: "/audit", label: "Audit", description: "Correlated decisions and execution evidence", icon: FileSearch },
    { href: "/release", label: "Release Center", description: "Build evidence and release decision", icon: Rocket },
  ],
  System: [
    { href: "/analytics", label: "Analytics", description: "Event-derived operational telemetry", icon: BarChart3 },
    { href: "/system", label: "Diagnostics", description: "Backend, desktop, persistence, and recovery", icon: Gauge },
    { href: "/settings", label: "User settings", description: "Profile and interface preferences", icon: Settings2 },
    { href: "/help", label: "User guide", description: "First-time training and safe operating steps", icon: BookOpen },
  ],
};

export const sidebarGroups: SidebarGroup[] = navItems.map(({ label }) => ({
  label,
  items: destinationTasks[label],
}));

const routeOwners = new Map(
  Object.entries(destinationTasks).flatMap(([label, tasks]) =>
    tasks.map((task) => [task.href, label as PrimaryDestination["label"]] as const),
  ),
);

routeOwners.set("/context", "Intelligence");
routeOwners.set("/projects", "Intelligence");
routeOwners.set("/agents", "Command");
routeOwners.set("/browser", "Command");
routeOwners.set("/voice", "Command");
routeOwners.set("/workflows", "Operations");
routeOwners.set("/console", "Operations");
routeOwners.set("/governance", "Governance");
routeOwners.set("/control-center", "System");

export function destinationForPath(pathname: string): PrimaryDestination {
  const normalized = pathname !== "/" ? pathname.replace(/\/$/, "") : pathname;
  const exact = routeOwners.get(normalized);
  const label = exact ?? navItems.find((item) => item.href === normalized)?.label ?? "Command";
  return navItems.find((item) => item.label === label) ?? navItems[0];
}

// Secondary dashboard customisation only. These labels are not operational
// telemetry and are intentionally excluded from the default command overview.
export const dashboardTimeline = ["Request", "Planning", "Memory", "Agent", "Tools", "Approval", "Complete"];
