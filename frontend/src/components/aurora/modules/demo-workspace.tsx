"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clapperboard,
  Film,
  MonitorPlay,
  Presentation,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { GlassPanel } from "@/components/aurora/glass-panel";
import { StatusChip } from "@/components/aurora/status-chip";
import { DemoModule } from "@/components/aurora/modules/demo-module";
import { apiGet } from "@/lib/api/client";
import { getDemoStatus } from "@/lib/api/demo";

type DemoStatusSnapshot = Record<string, unknown> & {
  demo_mode?: boolean;
  project_name?: string;
  interface_name?: string;
  release_version?: string;
  tagline?: string;
  readiness_report?: string;
  last_generated_pack?: string;
};

type DemoReadinessSnapshot = Record<string, unknown> & {
  status?: string;
  generated_at?: string;
  release_version?: string;
  release_name?: string;
  passed?: number;
  failed?: number;
  report?: string;
};

type SourceState = {
  demo: boolean;
  walkthrough: boolean;
  recording: boolean;
};

type Tone = "primary" | "secondary" | "success" | "warning" | "danger" | "muted";

function text(value: unknown, fallback = "Unavailable") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function toneForStatus(value: unknown): Tone {
  const normalized = text(value, "").toLowerCase();

  if (
    normalized.includes("ready") ||
    normalized.includes("enabled") ||
    normalized.includes("clear") ||
    normalized.includes("passed") ||
    normalized.includes("complete")
  ) {
    return "success";
  }

  if (
    normalized.includes("review") ||
    normalized.includes("pending") ||
    normalized.includes("disabled") ||
    normalized.includes("unchecked")
  ) {
    return "warning";
  }

  if (
    normalized.includes("fail") ||
    normalized.includes("error") ||
    normalized.includes("blocked")
  ) {
    return "danger";
  }

  return "primary";
}

export function DemoLiveWorkspace() {
  const [demoStatus, setDemoStatus] = useState<DemoStatusSnapshot | null>(null);
  const [walkthrough, setWalkthrough] = useState<DemoReadinessSnapshot | null>(null);
  const [recording, setRecording] = useState<DemoReadinessSnapshot | null>(null);

  const [sources, setSources] = useState<SourceState>({
    demo: false,
    walkthrough: false,
    recording: false,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState("");

  const loadDemoSources = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const [demoResult, walkthroughResult, recordingResult] = await Promise.allSettled([
      getDemoStatus(),
      apiGet<DemoReadinessSnapshot>("/api/demo-walkthrough/status"),
      apiGet<DemoReadinessSnapshot>("/api/demo-recording/status"),
    ]);

    setSources({
      demo: demoResult.status === "fulfilled",
      walkthrough: walkthroughResult.status === "fulfilled",
      recording: recordingResult.status === "fulfilled",
    });

    if (demoResult.status === "fulfilled") {
      setDemoStatus(demoResult.value as DemoStatusSnapshot);
    } else {
      setDemoStatus(null);
    }

    if (walkthroughResult.status === "fulfilled") {
      setWalkthrough(walkthroughResult.value);
    } else {
      setWalkthrough(null);
    }

    if (recordingResult.status === "fulfilled") {
      setRecording(recordingResult.value);
    } else {
      setRecording(null);
    }

    const failures = [demoResult, walkthroughResult, recordingResult].filter(
      (result) => result.status === "rejected",
    ).length;

    if (failures === 3) {
      setMessage("Demo sources failed to load. Confirm the backend is running.");
    } else if (failures > 0) {
      setMessage(
        `${failures} demo source${failures === 1 ? "" : "s"} unavailable. Loaded sources are shown without substitute data.`,
      );
    }

    setLastLoadedAt(
      new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDemoSources();
  }, [loadDemoSources]);

  const demoModeLabel = demoStatus?.demo_mode ? "enabled" : "disabled";

  const readinessCards = useMemo(
    () => [
      {
        label: "Portfolio demo mode",
        value: sources.demo ? demoModeLabel : "Unavailable",
        detail: sources.demo
          ? "Loaded from /api/demo/status"
          : "No demo status response loaded.",
        tone: sources.demo ? toneForStatus(demoModeLabel) : "muted",
      },
      {
        label: "Walkthrough readiness",
        value: sources.walkthrough ? text(walkthrough?.status, "Loaded") : "Unavailable",
        detail: sources.walkthrough
          ? `Version ${text(walkthrough?.release_version, "unknown")}`
          : "No walkthrough status response loaded.",
        tone: sources.walkthrough ? toneForStatus(walkthrough?.status) : "muted",
      },
      {
        label: "Presenter readiness",
        value: sources.recording ? text(recording?.status, "Loaded") : "Unavailable",
        detail: sources.recording
          ? `Version ${text(recording?.release_version, "unknown")}`
          : "No demo recording status response loaded.",
        tone: sources.recording ? toneForStatus(recording?.status) : "muted",
      },
    ],
    [demoModeLabel, recording, sources, walkthrough],
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <header className="rounded-3xl border border-cyan-300/15 bg-black/25 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
              Live demo command centre
            </p>

            <h1 className="mt-2 text-3xl font-semibold text-white">
              Portfolio demo and presenter readiness
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Review backend demo mode, project identity, guided walkthrough
              readiness, and presenter-control readiness. Demo tools remain
              presentation-only and do not publish, push, record your screen, or
              bypass approvals.
            </p>
          </div>

          <button
            onClick={() => void loadDemoSources()}
            disabled={loading}
            className="rounded-xl border border-cyan-400/30 px-4 py-3 text-xs font-bold text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-60"
          >
            <RefreshCw className="inline" size={15} />{" "}
            {loading ? "Refreshing..." : "Refresh demo state"}
          </button>
        </div>
      </header>

      {message && (
        <p
          role="alert"
          className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-4 text-sm leading-6 text-yellow-100"
        >
          {message}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        {readinessCards.map((item) => (
          <MetricCard
            key={item.label}
            label={item.label}
            value={item.value}
            detail={item.detail}
            tone={item.tone}
          />
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-5">
          <DemoModule />

          <GlassPanel className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Clapperboard size={18} className="text-cyan-300" />
              Demo identity
            </h2>

            {!demoStatus ? (
              <p className="mt-3 text-sm text-slate-500">
                No demo identity loaded from the backend.
              </p>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Detail label="Project" value={text(demoStatus.project_name)} />
                <Detail label="Interface" value={text(demoStatus.interface_name)} />
                <Detail label="Release version" value={text(demoStatus.release_version)} />
                <Detail label="Tagline" value={text(demoStatus.tagline)} />
                <Detail
                  label="Last generated pack"
                  value={text(demoStatus.last_generated_pack, "No pack reported")}
                />
              </div>
            )}
          </GlassPanel>

          <GlassPanel className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <MonitorPlay size={18} className="text-violet-300" />
              Demo readiness report
            </h2>

            <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/25 p-4 text-xs leading-5 text-slate-300">
              {text(demoStatus?.readiness_report, "No demo readiness report loaded.")}
            </pre>
          </GlassPanel>
        </div>

        <aside className="space-y-5">
          <GlassPanel className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Presentation size={18} className="text-cyan-300" />
              Live demo sources
            </h2>

            <div className="mt-4 space-y-2">
              <SourceRow label="/api/demo/status" ok={sources.demo} />
              <SourceRow label="/api/demo-walkthrough/status" ok={sources.walkthrough} />
              <SourceRow label="/api/demo-recording/status" ok={sources.recording} />
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              Last refresh: {lastLoadedAt || "Unchecked"}
            </p>
          </GlassPanel>

          <ReadinessPanel
            icon={<MonitorPlay size={18} className="text-violet-300" />}
            title="Guided walkthrough"
            data={walkthrough}
          />

          <ReadinessPanel
            icon={<Film size={18} className="text-rose-300" />}
            title="Presenter controls"
            data={recording}
          />

          <GlassPanel className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <ShieldCheck size={18} className="text-emerald-300" />
              Demo safety boundary
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Demo mode and presenter controls are local presentation helpers.
              This page does not start screen recording automatically, publish
              releases, push to GitHub, expose secrets, or bypass approvals.
            </p>

            <div className="mt-4 grid gap-2">
              <Link
                href="/public-demo"
                className="rounded-xl border border-cyan-400/30 px-3 py-2 text-center text-xs font-bold text-cyan-200 hover:bg-cyan-500/10"
              >
                Open Public Demo
              </Link>

              <Link
                href="/portfolio"
                className="rounded-xl border border-violet-400/30 px-3 py-2 text-center text-xs font-bold text-violet-200 hover:bg-violet-500/10"
              >
                Open Portfolio Panels
              </Link>
            </div>
          </GlassPanel>
        </aside>
      </div>
    </div>
  );
}

function SourceRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 p-3">
      <span className="break-all text-xs text-slate-400">{label}</span>
      <StatusChip tone={ok ? "success" : "muted"}>{ok ? "Loaded" : "Unavailable"}</StatusChip>
    </div>
  );
}

function ReadinessPanel({
  icon,
  title,
  data,
}: {
  icon: React.ReactNode;
  title: string;
  data: DemoReadinessSnapshot | null;
}) {
  return (
    <GlassPanel className="p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold text-white">
        {icon}
        {title}
      </h2>

      {!data ? (
        <p className="mt-3 text-sm text-slate-500">No backend status loaded.</p>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-slate-400">Status</span>
            <StatusChip tone={toneForStatus(data.status)}>
              {text(data.status, "loaded")}
            </StatusChip>
          </div>

          <Detail label="Release" value={text(data.release_version)} />
          <Detail label="Generated" value={text(data.generated_at)} />

          <div className="grid grid-cols-2 gap-2">
            <SmallMetric label="Passed" value={text(data.passed, "0")} />
            <SmallMetric label="Failed" value={text(data.failed, "0")} />
          </div>
        </div>
      )}
    </GlassPanel>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm text-slate-300">{value}</p>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-cyan-100">{value}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: Tone;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          {label}
        </p>
        <StatusChip tone={tone}>{value}</StatusChip>
      </div>

      <p className="mt-4 break-words text-2xl font-black text-cyan-100">
        {value}
      </p>

      <p className="mt-2 break-words text-xs leading-5 text-slate-500">
        {detail}
      </p>
    </div>
  );
}
