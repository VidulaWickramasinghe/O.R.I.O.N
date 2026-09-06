import { AppShell } from "@/components/aurora/app-shell";
import { AnalyticsOverview } from "@/components/aurora/analytics-overview";
import { LiveOperationalBoard } from "@/components/aurora/live-operational-board";

export default function AnalyticsPage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        <LiveOperationalBoard />
        <AnalyticsOverview />
      </div>
    </AppShell>
  );
}
