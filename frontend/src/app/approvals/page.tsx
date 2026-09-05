import { AppShell } from "@/components/aurora/app-shell";
import { ToolsWorkspace } from "@/components/aurora/modules/tools-workspace";

export default function ApprovalsPage() {
  return <AppShell><ToolsWorkspace focus="approvals" /></AppShell>;
}
