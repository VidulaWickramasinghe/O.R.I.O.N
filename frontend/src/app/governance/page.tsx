import { AppShell } from "@/components/aurora/app-shell";
import { DashboardWorkspace } from "@/components/aurora/dashboard-workspace";

const governanceModules = [
  "Quality Gate",
  "Release Candidate",
  "Stable Public Release",
  "Post-Release Maintenance",
  "Patch Release",
  "Changelog Intelligence",
  "Roadmap Planner",
  "Safety Review Board",
  "Production Readiness",
  "Final Launch",
  "GitHub Launch",
  "Public Landing",
  "UI Polish",
  "Plugin System",
  "Security Policy",
  "Tool Permission Enforcement",
  "Tool Audit Center",
];

export default function GovernancePage() {
  return (
    <AppShell>
      <main className="mx-auto w-full max-w-[1600px] space-y-6">
        <header className="rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.04] p-5 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">
            Release & Governance Centre
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-white">
            O.R.I.O.N. specialist operations
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Central workspace for release readiness, stable release control,
            patch planning, roadmap governance, safety review, plugin security,
            tool permission enforcement, and audit visibility.
          </p>

          <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4">
            <p className="text-sm font-semibold text-amber-100">
              Governance view active
            </p>
            <p className="mt-1 text-xs leading-5 text-amber-100/75">
              Use the Dashboard Views panel below and select Release View to
              expose the full release/governance module set. This page now acts
              as the canonical route for governance operations.
            </p>
          </div>

          <section className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {governanceModules.map((module) => (
              <div
                key={module}
                className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3"
              >
                <p className="text-sm font-semibold text-slate-100">{module}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Governance module
                </p>
              </div>
            ))}
          </section>
        </header>

        <DashboardWorkspace />
      </main>
    </AppShell>
  );
}
