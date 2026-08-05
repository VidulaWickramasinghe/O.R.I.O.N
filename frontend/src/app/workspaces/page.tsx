import { AppShell } from "@/components/aurora/app-shell";
import { WorkspacesLiveWorkspace } from "@/components/aurora/modules/workspaces-workspace";

export default function Page() {
  return (
    <AppShell>
      <WorkspacesLiveWorkspace />
    </AppShell>
  );
}
