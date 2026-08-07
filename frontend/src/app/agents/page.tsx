import { AppShell } from "@/components/aurora/app-shell";
import { AgentsLiveWorkspace } from "@/components/aurora/modules/agents-workspace";

export default function AgentsPage() {
  return (
    <AppShell>
      <AgentsLiveWorkspace />
    </AppShell>
  );
}
