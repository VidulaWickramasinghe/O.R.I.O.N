import { AppShell } from "@/components/aurora/app-shell";
import { MissionsWorkspace } from "@/components/aurora/modules/missions-workspace";
import { AuroraQueryProvider } from "@/components/aurora/providers/query-provider";

export default function Page() {
  return (
    <AuroraQueryProvider>
      <AppShell>
        <MissionsWorkspace />
      </AppShell>
    </AuroraQueryProvider>
  );
}
