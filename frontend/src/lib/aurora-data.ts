import { Bot, Briefcase, FolderKanban, Gauge, Globe2, Home, MemoryStick, Mic, MonitorCog, Package, Settings, Shield, Terminal, Wrench, Workflow, BarChart3, MessageSquare } from "lucide-react";

export const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/assistant", label: "Assistant", icon: MessageSquare },
  { href: "/memory", label: "Memory", icon: MemoryStick },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/missions", label: "Missions", icon: Briefcase },
  { href: "/workspaces", label: "Workspaces", icon: MonitorCog },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/browser", label: "Browser", icon: Globe2 },
  { href: "/voice", label: "Voice", icon: Mic },
  { href: "/workflows", label: "Workflows", icon: Workflow },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/system", label: "System", icon: Gauge },
  { href: "/security", label: "Security", icon: Shield },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/demo", label: "Demo", icon: Package },
  { href: "/console", label: "Console", icon: Terminal },
];

export const notifications = [
  { title: "Agent completed planning", detail: "Planner produced a safe execution plan.", tone: "success" as const },
  { title: "Memory vault updated", detail: "3 new project memories indexed.", tone: "primary" as const },
  { title: "Claude disconnected", detail: "Fallback model is ready.", tone: "warning" as const },
  { title: "Workflow waiting for approval", detail: "Terminal command requires review.", tone: "danger" as const },
];

export const dashboardModels = ["GPT-5.5", "Claude", "Gemini", "Local LLM"];
export const dashboardTimeline = ["Request", "Planning", "Memory", "Agent", "Tools", "Approval", "Complete"];
