import Link from "next/link";
import { AppShell } from "@/components/aurora/app-shell";

const lessons = [
  { title: "1. Check your connection", href: "/", action: "Open Dashboard", text: "Wait for Online · authenticated at the top. Backend connected means the local service responded; it does not prove an AI provider is configured. If connection fails, use Refresh operational state and read the backend terminal. Never disable authentication to fix a connection." },
  { title: "2. Set your preferences", href: "/settings", action: "Open Settings", text: "Set your display name, theme, density, notifications and pet visibility. Keep Strict Mode while learning. An administrator configures the API key in backend/.env; never paste a key into chat, memory or a workspace document. Model-backed features may incur provider charges." },
  { title: "3. Try a conversation", href: "/assistant", action: "Open Assistant", text: "Start a New conversation. Try: Explain the difference between a mission and an approval. Do not use tools. Before Send, review the Context sent to the provider controls and use Preview Context. At narrower widths these controls are below the chat. Semantic search can send your query to an embedding provider and is off by default. Changing context choices starts a new conversation." },
  { title: "4. Save a mission without running it", href: "/missions", action: "Open Missions", text: "Enter a title, a clear goal and ordered steps in Create a mission from your goal. Example goal: Prepare a read-only review of my sample project. Steps: Inspect the project; Identify risks; Summarize evidence. Save mission plan only stores the plan. Run Next Step starts one controlled cycle and may contact the AI provider. Learn one-step execution before using Run 3 Steps." },
  { title: "5. Learn the approval queue", href: "/approvals", action: "Open Approvals", text: "An approval is a request, not an execution result. Check the exact action, workspace, target path, script or diff, risk and arguments. Approve only what you understand. Reject unexpected or overbroad requests and give a reason. Rejecting an unwanted request is a safe training exercise. Package build/dev scripts can execute arbitrary code even when their names sound harmless." },
  { title: "6. Register one sample workspace", href: "/workspaces#register-workspace", action: "Register workspace", text: "Use an existing sample-project folder, not your home folder or disk root. Enter its full local path and name. Read and explicitly select both trust and source-consent checkboxes. Registration does not run code or index documents. Select that workspace separately in Assistant or Knowledge. Desktop and indexing actions may be unavailable under your safety policy; ask your trainer to review the restriction, not bypass it." },
  { title: "7. Control retained context", href: "/memory", action: "Inspect Memory", text: "Memory contains retained facts; Knowledge contains explicitly indexed workspace documents. Inspect scope, provenance and sensitivity. Exclude or delete information that should not be used. Do not put credentials or private personal records in a training workspace. Preview covers this turn's prepared input, not earlier conversation history or future tool results." },
  { title: "8. Review evidence and recover", href: "/activity", action: "Open Activity", text: "Use Activity for a human-readable history and Audit for correlated decisions and execution results. Permission to act does not prove a tool completed. Read a mission error before an explicit retry. Pause or cancel when appropriate. Use Diagnostics for storage and recovery information; do not delete databases to clear an error." },
];

export default function HelpPage() {
  return <AppShell><main className="mx-auto max-w-5xl space-y-5">
    <header className="rounded-3xl border border-cyan-300/20 bg-black/25 p-6">
      <p className="text-xs uppercase tracking-widest text-cyan-200">First-time user training</p>
      <h1 className="mt-3 text-3xl font-semibold text-white">Start safely with O.R.I.O.N.</h1>
      <p className="mt-3 leading-7 text-slate-300">O.R.I.O.N. is a local mission-control application. Aurora OS is its interface; the backend stores records and enforces permissions. Local-first does not mean all AI processing stays on your computer. These guide links do not run tools or change security settings.</p>
    </header>
    {lessons.map((lesson) => <section key={lesson.title} className="rounded-3xl border border-white/10 bg-black/25 p-6">
      <h2 className="text-xl font-semibold text-white">{lesson.title}</h2>
      <p className="mt-3 leading-7 text-slate-300">{lesson.text}</p>
      <Link className="mt-4 inline-block rounded-xl border border-cyan-300/30 px-4 py-2 text-cyan-200 focus-visible:outline-2 focus-visible:outline-cyan-300" href={lesson.href}>{lesson.action}</Link>
    </section>)}
    <section className="rounded-3xl border border-amber-300/20 p-6">
      <h2 className="text-xl font-semibold text-white">Before working independently</h2>
      <p className="mt-3 leading-7 text-slate-300">Ask your trainer to watch you save a mission without running it, explain a proposed approval, reject an unwanted request, preview context, and locate the evidence. If you cannot explain an action, do not approve it.</p>
      <p className="mt-3 leading-7 text-slate-300">For setup, troubleshooting, a full trainer checklist and shutdown instructions, read docs/first-time-user-guide.md in your project folder.</p>
    </section>
  </main></AppShell>;
}
