import Link from "next/link";
import { sidebarGroups } from "@/lib/aurora-data";
import { guideWorkflows, sidebarLessons } from "@/lib/user-guide";

export function UserGuide() {
  return <div className="mx-auto max-w-5xl space-y-6">
    <header className="rounded-3xl border border-cyan-300/20 bg-black/25 p-6">
      <p className="text-xs uppercase tracking-widest text-cyan-200">Operator handbook · start with a sample workspace</p>
      <h1 className="mt-3 text-3xl font-semibold text-white">Work confidently with O.R.I.O.N.</h1>
      <p className="mt-3 leading-7 text-slate-300">Register a source, choose a task, review permission, execute deliberately, then inspect evidence. Learn what each step does—and what it does not do.</p>
      <nav aria-label="Guide contents" className="mt-5 flex flex-wrap gap-3 text-sm text-cyan-200">
        {guideWorkflows.map((item) => <Link key={item.id} href={`#${item.id}`} className="rounded-xl border border-white/15 px-3 py-2 underline">{item.title}</Link>)}
        <Link href="#sidebar-reference" className="rounded-xl border border-white/15 px-3 py-2 underline">Every sidebar option</Link>
        <Link href="#recovery-checklist" className="rounded-xl border border-white/15 px-3 py-2 underline">Recovery and trainer checklist</Link>
      </nav>
    </header>
    {guideWorkflows.map((workflow) => <section id={workflow.id} key={workflow.id} className="scroll-mt-6 rounded-3xl border border-white/10 bg-black/25 p-6">
      <h2 className="text-2xl font-semibold text-white">{workflow.title}</h2>
      <p className="mt-3 leading-7 text-cyan-100">{workflow.purpose}</p>
      <ol className="mt-5 list-decimal space-y-4 pl-6 leading-7 text-slate-200">{workflow.steps.map((step) => <li key={step}>{step}</li>)}</ol>
      <p className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-300/5 p-4 text-sm leading-6 text-amber-100">{workflow.caution}</p>
      <div className="mt-5 flex flex-wrap gap-3">{workflow.links.map((link) => <Link key={link.href} href={link.href} className="rounded-xl border border-cyan-300/30 px-4 py-2 text-cyan-200 underline">{link.label} →</Link>)}</div>
    </section>)}
    <section id="sidebar-reference" className="scroll-mt-6 space-y-5">
      <h2 className="text-2xl font-semibold text-white">Every sidebar option: purpose → steps → result</h2>
      <p className="leading-7 text-slate-300">These links navigate only. They do not run tools, start missions or change permissions.</p>
      {sidebarGroups.map((group) => <section key={group.label} className="rounded-3xl border border-white/10 bg-black/25 p-6">
        <h3 className="text-xl font-semibold text-cyan-200">{group.label}</h3>
        <div className="mt-4 space-y-3">{group.items.map((item) => {
          const lesson = sidebarLessons[item.href];
          return <details key={item.href} className="rounded-2xl border border-white/15 p-4">
            <summary className="cursor-pointer text-lg font-semibold text-white">{item.label}</summary>
            <p className="mt-3 leading-6 text-slate-300">{item.description}</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 leading-7 text-slate-200">{lesson.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            <p className="mt-3 text-sm leading-6 text-amber-100">Expected result: {lesson.result}</p>
            <Link href={item.href} className="mt-4 inline-block text-cyan-200 underline">Open {item.label} →</Link>
          </details>;
        })}</div>
      </section>)}
    </section>
    <section className="rounded-3xl border border-white/10 bg-black/25 p-6">
      <h2 className="text-2xl font-semibold text-white">Secondary workflows</h2>
      <ul className="mt-4 list-disc space-y-3 pl-5 leading-7 text-slate-200">
        <li><Link href="/browser" className="text-cyan-200 underline">Browser research</Link>: research public sources when policy permits; review URLs and evidence. Web content is untrusted input, not permission.</li>
        <li><Link href="/voice" className="text-cyan-200 underline">Voice</Link>: use push-to-talk, review/edit the transcript and submit intentionally through the normal assistant flow. No always-listening default.</li>
        <li><Link href="/workflows" className="text-cyan-200 underline">Workflow blueprints</Link>: inspect a template and optional workspace ID, customize its goal and create a plan. Templates do not execute immediately or grant permissions.</li>
      </ul>
    </section>
    <section id="recovery-checklist" className="scroll-mt-6 rounded-3xl border border-amber-300/20 p-6">
      <h2 className="text-2xl font-semibold text-white">Recovery and trainer checklist</h2>
      <ul className="mt-4 list-disc space-y-3 pl-5 leading-7 text-slate-200">
        <li>Backend unavailable: check both terminals from the same checkout and run <code>./scripts/verify_api.sh</code>. Port 3000 is the frontend; a 401 at the API root on port 8000 can be expected.</li>
        <li>Provider unavailable: ask the administrator to check the private key/model, then restart. Do not paste credentials into chat.</li>
        <li>Empty queue: distinguish no request, denied request and terminal history. Refresh after an action returns an approval ID.</li>
        <li>Interrupted mission: inspect the exact run and side-effect result before retrying. Cancel does not roll back previous effects.</li>
        <li>Before independent work: register without creating an approval, save/reload a plan without running it, explain a requested target, reject it, preview context and find audit evidence.</li>
      </ul>
      <p className="mt-5 text-sm leading-6 text-slate-300">For installation, IntelliJ terminals, paired ports and shutdown, read docs/first-time-user-guide.md in your project folder. Local-first does not mean all AI processing stays on your computer. Train only with non-sensitive data.</p>
    </section>
  </div>;
}
