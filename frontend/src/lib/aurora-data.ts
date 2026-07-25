import type { LucideIcon } from "lucide-react";
import { Bot, Briefcase, FolderKanban, Gauge, Globe2, Home, MemoryStick, Mic, MonitorCog, Package, Settings, Shield, Terminal, Wrench, Workflow, BarChart3, MessageSquare, Rocket } from "lucide-react";
type NavItem={href:string;label:string;icon:LucideIcon};
type NavGroup={label:string;items:NavItem[]};
export const navigationGroups:NavGroup[]=[
 {label:"Core",items:[{href:"/",label:"Dashboard",icon:Home},{href:"/assistant",label:"Assistant",icon:MessageSquare},{href:"/missions",label:"Missions",icon:Briefcase},{href:"/projects",label:"Projects",icon:FolderKanban},{href:"/workspaces",label:"Workspaces",icon:MonitorCog}]},
 {label:"Intelligence",items:[{href:"/memory",label:"Memory",icon:MemoryStick},{href:"/agents",label:"Agents",icon:Bot},{href:"/workflows",label:"Workflows",icon:Workflow},{href:"/analytics",label:"Analytics",icon:BarChart3}]},
 {label:"Tools",items:[{href:"/tools",label:"Tools",icon:Wrench},{href:"/browser",label:"Browser",icon:Globe2},{href:"/voice",label:"Voice",icon:Mic},{href:"/console",label:"Console",icon:Terminal}]},
 {label:"Administration",items:[{href:"/system",label:"System",icon:Gauge},{href:"/security",label:"Security",icon:Shield},{href:"/settings",label:"Settings",icon:Settings},{href:"/demo",label:"Demo",icon:Package},{href:"/governance",label:"Release Centre",icon:Rocket}]},
];
export const navItems=navigationGroups.flatMap(group=>group.items);
export type AuroraNotification={title:string;detail:string;tone:"success"|"primary"|"warning"|"danger"};
export const notifications:AuroraNotification[]=[];
export const dashboardModels=["Configured provider","Fallback provider"];
export const dashboardTimeline=["Request","Planning","Memory","Agent","Tools","Approval","Complete"];
