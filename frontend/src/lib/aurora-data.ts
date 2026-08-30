import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Gauge,
  Home,
  Layers3,
  MessageSquare,
  MonitorCog,
  ShieldCheck,
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
  Dashboard: [{ href: "/", label: "Mission overview", description: "Current state and attention queue" }],
  Assistant: [
    { href: "/assistant", label: "Assistant", description: "Chat and reason with O.R.I.O.N." },
    { href: "/voice", label: "Voice", description: "Voice and wake-phrase controls" },
    { href: "/browser", label: "Research", description: "Controlled public-web research" },
  ],
  Missions: [
    { href: "/missions", label: "Mission control", description: "Plan, approve, execute, and recover" },
    { href: "/workflows", label: "Blueprints", description: "Reusable mission workflows" },
    { href: "/agents", label: "Agent readiness", description: "Mission-agent capability state" },
  ],
  Context: [
    { href: "/context", label: "Memory & knowledge", description: "Inspect retrieved local context" },
    { href: "/projects", label: "Projects", description: "Project-scoped memory and records" },
  ],
  Workspaces: [
    { href: "/workspaces", label: "Workspace manager", description: "Trusted roots and developer actions" },
  ],
  Governance: [
    { href: "/governance", label: "Governance overview", description: "Approvals, policy, and release evidence" },
    { href: "/security", label: "Security policy", description: "Profiles and enforcement state" },
    { href: "/tools", label: "Tools & approvals", description: "Permissions, decisions, and approval queue" },
    { href: "/plugins", label: "Plugins", description: "Plugin state and permissions" },
  ],
  System: [
    { href: "/system", label: "System health", description: "Backend, desktop, persistence, and diagnostics" },
    { href: "/analytics", label: "Analytics", description: "Event-derived operational telemetry" },
    { href: "/settings", label: "Settings", description: "Local profile and preferences" },
    { href: "/console", label: "Activity console", description: "Read-only activity and approval stream" },
  ],
};

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
