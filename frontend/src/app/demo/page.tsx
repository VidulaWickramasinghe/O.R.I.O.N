import { AppShell } from "@/components/aurora/app-shell";
import { AuroraQueryProvider } from "@/components/aurora/providers/query-provider";
import { LegacyDemoWorkspace } from "@/components/aurora/legacy/legacy-modules";

export default function Page() {
  return <AuroraQueryProvider><AppShell><LegacyDemoWorkspace /></AppShell></AuroraQueryProvider>;
}
