import Link from "next/link";
import { PublicFeatureCard } from "@/components/public-demo/PublicFeatureCard";
import { PublicHero } from "@/components/public-demo/PublicHero";
import { PublicScreenshotCard } from "@/components/public-demo/PublicScreenshotCard";
import { PublicSection } from "@/components/public-demo/PublicSection";
import { ORION_SCREENSHOTS } from "@/lib/portfolioRegistry";

const FEATURES = [
  ["Safe agentic execution", "Approval-gated tools, plugin permissions, and audit logs keep automation visible and controlled."],
  ["Aurora OS dashboard", "A command center for memory, projects, tools, security, release readiness, and demos."],
  ["Tool permission enforcement", "Tools map to plugins so disabled modules safely block their related actions."],
  ["Quality Gate", "Backend, frontend, release verification, and readiness checks combine into one workflow."],
  ["Portfolio release manager", "Local generators prepare public documentation, demo scripts, architecture notes, and launch assets."],
  ["Presenter mode", "Guided walkthroughs, recording overlays, scene presets, and clean portfolio demo controls."],
] as const;

const DEMO_STEPS = [
  "Open Aurora OS and introduce O.R.I.O.N.",
  "Show Dashboard Intelligence and system readiness.",
  "Switch to Security View and explain controlled execution.",
  "Show Quality Gate and release verification.",
  "Open the portfolio showcase and local release assets.",
  "Use Presenter Controls for a clean recorded demo.",
] as const;

export default function PublicDemoPage() {
  return (
    <main className="min-h-screen overflow-x-clip bg-[#05070B] text-slate-100">
      <PublicHero />

      <PublicSection eyebrow="Core features" title="Built like an AI operating dashboard." description="Safe agent workflows, release verification, and a polished interface—designed to keep people in control.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([title, description], index) => <PublicFeatureCard key={title} title={title} description={description} index={index} />)}
        </div>
      </PublicSection>

      <PublicSection id="architecture" eyebrow="Architecture" title="Local-first, modular, and safety-gated." description="Each layer keeps tool access explicit and produces an audit trail before execution reaches the local workspace." muted>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {["Aurora OS frontend", "API service layer", "FastAPI backend", "Agent registry", "Plugin permissions", "Approval system", "Local execution", "Audit history"].map((layer, index) => (
            <li key={layer} className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <span className="text-xs font-black text-cyan-300">{String(index + 1).padStart(2, "0")}</span>
              <p className="mt-3 text-sm font-bold text-slate-200">{layer}</p>
            </li>
          ))}
        </ol>
      </PublicSection>

      <PublicSection eyebrow="Screenshot showcase" title="Aurora OS in action." description="A visual walkthrough of dashboard intelligence, the security model, and release presentation tools.">
        <div className="grid gap-5 md:grid-cols-2">
          {ORION_SCREENSHOTS.slice(0, 6).map((screenshot) => <PublicScreenshotCard key={screenshot.id} screenshot={screenshot} />)}
        </div>
      </PublicSection>

      <PublicSection id="demo-flow" eyebrow="Demo flow" title="A clean portfolio presentation sequence." muted>
        <ol className="grid gap-4 md:grid-cols-2">
          {DEMO_STEPS.map((step, index) => (
            <li key={step} className="flex items-start gap-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <span className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm font-black text-cyan-200">{String(index + 1).padStart(2, "0")}</span>
              <p className="pt-2 text-sm leading-7 text-slate-300">{step}</p>
            </li>
          ))}
        </ol>
      </PublicSection>

      <section className="px-4 py-16 sm:px-6 md:px-10 md:py-20">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-emerald-400/20 bg-emerald-500/10 p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-200">Public launch ready</p>
          <h2 className="mt-4 max-w-4xl text-3xl font-black leading-tight text-white sm:text-4xl md:text-5xl">Portfolio-ready, safety-conscious, and locally controlled.</h2>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300">The public demo is a static presentation surface. Publishing, release creation, and GitHub operations remain manual and reviewable.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/" className="rounded-2xl bg-emerald-300 px-6 py-3 text-sm font-black text-emerald-950 transition hover:bg-emerald-200">Enter Aurora OS</Link>
            <a href="#demo-flow" className="rounded-2xl border border-white/10 px-6 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/10">Review demo flow</a>
          </div>
        </div>
      </section>
    </main>
  );
}
