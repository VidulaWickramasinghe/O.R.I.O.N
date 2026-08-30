import Link from "next/link";

import { AppShell } from "@/components/aurora/app-shell";
import { DashboardWorkspace } from "@/components/aurora/dashboard-workspace";

const governanceModules = [
  {
    title: "Approval Queue",
    description: "Review pending high-risk operations and their ownership.",
    href: "/tools",
  },
  {
    title: "Security Policy",
    description: "Inspect the active profile and enforcement boundaries.",
    href: "/security",
  },
  {
    title: "Plugin Permissions",
    description: "Manage enabled plugins and declared permissions.",
    href: "/plugins",
  },
  {
    title: "Tool Audit",
    description: "Reconstruct policy decisions and executed actions.",
    href: "#tool-audit",
  },
  {
    title: "Release Evidence",
    description: "Review the current candidate gate and artifact evidence.",
    href: "#release-candidate",
  },
];

export default function GovernancePage() {
  return (
    <AppShell>
      <main className="mx-auto w-full max-w-[1600px] space-y-6">
        <header className="rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.04] p-5 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">
            Governance Centre
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-white">
            Policy, approvals, audit, and release evidence
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            One control surface for human approvals, active security policy,
            plugin permissions, tool decisions, and current release evidence.
            Historical release utilities are no longer primary destinations.
          </p>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 lg:col-span-2">
              <p className="text-sm font-semibold text-amber-100">
                Governance view active
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-100/75">
                Use this page to understand what is permitted, what is waiting,
                what executed, and whether the current build is releasable.
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
              <p className="text-sm font-semibold text-cyan-100">
                Recommended action
              </p>
              <p className="mt-1 text-xs leading-5 text-cyan-100/70">
                Review pending approvals first, then inspect policy and audit
                evidence before changing release state.
              </p>
              <a
                href="#dashboard-workspace"
                className="mt-3 inline-flex rounded-xl bg-cyan-300 px-4 py-2 text-xs font-bold text-slate-950 transition hover:scale-[1.02]"
              >
                Open Governance Controls
              </a>
            </div>
          </div>

          <section className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {governanceModules.map((module) => (
              <Link
                key={module.title}
                href={module.href}
                className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 transition hover:border-cyan-300/40 hover:bg-cyan-300/[0.06]"
              >
                <p className="text-sm font-semibold text-slate-100">
                  {module.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {module.description}
                </p>
              </Link>
            ))}
          </section>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/"
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-200"
            >
              Main Dashboard
            </Link>
            <Link
              href="/security"
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-200"
            >
              Security
            </Link>
            <Link
              href="/tools"
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-200"
            >
              Tools
            </Link>
          </div>
        </header>

        <section id="dashboard-workspace" className="scroll-mt-6">
          <DashboardWorkspace forceGovernanceMode />
        </section>
      </main>
    </AppShell>
  );
}
