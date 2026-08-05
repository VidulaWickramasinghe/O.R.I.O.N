import { AppShell } from "@/components/aurora/app-shell";
import { DashboardWorkspace } from "@/components/aurora/dashboard-workspace";

export default function Page() {
  return (
    <AppShell>
      <DashboardWorkspace forceSecurityMode />
    </AppShell>
  );
}
