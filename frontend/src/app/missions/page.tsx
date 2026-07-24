import { AppShell } from "@/components/aurora/app-shell";
import { AuroraQueryProvider } from "@/components/aurora/providers/query-provider";
import { LegacyMissionsWorkspace } from "@/components/aurora/legacy/legacy-modules";

export default function Page() {
  return <AuroraQueryProvider><AppShell><LegacyMissionsWorkspace /></AppShell></AuroraQueryProvider>;
}
