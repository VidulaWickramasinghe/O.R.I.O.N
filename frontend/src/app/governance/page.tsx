import Link from "next/link";

import { AppShell } from "@/components/aurora/app-shell";
import { DashboardWorkspace } from "@/components/aurora/dashboard-workspace";
import { GovernanceReleaseViewActivator } from "@/components/aurora/GovernanceReleaseViewActivator";

const governanceModules = [
  {
    title: "Quality Gate",
    description: "Run backend, frontend, and release validation.",
    href: "#quality-gate",
  },
  {
    title: "Release Candidate",
    description: "Review freeze and release-candidate readiness.",
    href: "#release-candidate",
  },
  {
    title: "Stable Public Release",
    description: "Check stable release lock and readiness gates.",
    href: "#stable-release",
  },
  {
    title: "Post-Release Maintenance",
    description: "Review known issues and maintenance planning.",
    href: "#post-release-maintenance",
  },
  {
    title: "Patch Release",
    description: "Manage local patch and hotfix workflow.",
    href: "#patch-release",
  },
  {
    title: "Changelog Intelligence",
    description: "Review release notes and changelog composer status.",
    href: "#changelog-intelligence",
  },
  {
    title: "Roadmap Planner",
    description: "Plan future features and prevent duplicate proposals.",
    href: "#roadmap-planner",
  },
  {
    title: "Safety Review Board",
    description: "Review feature safety and approval eligibility.",
    href: "#safety-review-board",
  },
  {
    title: "Production Readiness",
    description: "Inspect production readiness and RC v2 snapshot.",
    href: "#production-readiness",
  },
  {
    title: "Final Launch",
    description: "Review final launch freeze and public readiness.",
    href: "#final-launch",
  },
  {
    title: "GitHub Launch",
    description: "Review GitHub launch assistant and release checklist.",
    href: "#github-launch",
  },
  {
    title: "Public Landing",
    description: "Check public demo route and screenshot readiness.",
    href: "#public-landing",
  },
  {
    title: "UI Polish",
    description: "Review UI polish and responsive showcase readiness.",
    href: "#ui-polish",
  },
  {
    title: "Plugin System",
    description: "Inspect plugin registry and enabled modules.",
    href: "#plugin-system",
  },
  {
    title: "Security Policy",
    description: "Check active policy profile and safety mode.",
    href: "#security-policy",
  },
  {
    title: "Tool Permission Enforcement",
    description: "Inspect allowed, blocked, and policy-gated tools.",
    href: "#tool-permission",
  },
  {
    title: "Tool Audit Center",
    description: "Review tool execution audit events.",
    href: "#tool-audit",
  },
];

export default function GovernancePage() {
  return (
    <AppShell>
      <GovernanceReleaseViewActivator />
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

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 lg:col-span-2">
              <p className="text-sm font-semibold text-amber-100">
                Governance view active
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-100/75">
                Use this page as the command centre for release and governance.
                The controls below connect to the live Dashboard Workspace.
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
              <p className="text-sm font-semibold text-cyan-100">
                Recommended action
              </p>
              <p className="mt-1 text-xs leading-5 text-cyan-100/70">
                Scroll to Dashboard Views, choose Release View, then use the
                live governance panels below.
              </p>
              <a
                href="#dashboard-workspace"
                className="mt-3 inline-flex rounded-xl bg-cyan-300 px-4 py-2 text-xs font-bold text-slate-950 transition hover:scale-[1.02]"
              >
                Open Release View Controls
              </a>
            </div>
          </div>

          <section className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {governanceModules.map((module) => (
              <a
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
              </a>
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
            <Link
              href="/public-demo"
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-200"
            >
              Public Demo
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
