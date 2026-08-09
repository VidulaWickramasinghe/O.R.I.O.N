"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Camera,
  FileText,
  GitBranch,
  Globe2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { GlassPanel } from "@/components/aurora/glass-panel";
import { StatusChip } from "@/components/aurora/status-chip";
import { PortfolioCaseStudyPanel } from "@/components/aurora/panels/PortfolioCaseStudyPanel";
import { PortfolioDemoPanel } from "@/components/aurora/panels/PortfolioDemoPanel";
import { ScreenshotGalleryPanel } from "@/components/aurora/panels/ScreenshotGalleryPanel";
import { PortfolioShowcaseStatusPanel } from "@/components/aurora/panels/PortfolioShowcaseStatusPanel";
import {
  getPortfolioShowcaseStatus,
  savePortfolioShowcaseReport,
} from "@/lib/api/portfolio-showcase";
import {
  getGitHubPolishStatus,
  saveGitHubPolishArtifacts,
} from "@/lib/api/github-polish";
import {
  getPublicLandingStatus,
  savePublicLandingReport,
} from "@/lib/api/public-landing";
import { getDemoStatus } from "@/lib/api/demo";
import type { PortfolioShowcaseResult } from "@/types/orion";

type AnyResult = Record<string, unknown>;

type SourceState = {
  showcase: boolean;
  github: boolean;
  publicLanding: boolean;
  demo: boolean;
};

type Tone = "primary" | "secondary" | "success" | "warning" | "danger" | "muted";

function text(value: unknown, fallback = "Unavailable") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function numberText(value: unknown, fallback = "0") {
  if (typeof value === "number") return String(value);
  if (typeof value === "string" && value.trim()) return value;
  return fallback;
}

function toneForStatus(value: unknown): Tone {
  const normalized = text(value, "").toLowerCase();

  if (
    normalized.includes("ready") ||
    normalized.includes("passed") ||
    normalized.includes("complete") ||
    normalized.includes("available") ||
    normalized.includes("ok")
  ) {
    return "success";
  }

  if (
    normalized.includes("missing") ||
    normalized.includes("pending") ||
    normalized.includes("warning") ||
    normalized.includes("disabled") ||
    normalized.includes("unchecked")
  ) {
    return "warning";
  }

  if (
    normalized.includes("failed") ||
    normalized.includes("error") ||
    normalized.includes("blocked")
  ) {
    return "danger";
  }

  return "primary";
}

export function PortfolioLiveWorkspace() {
  const [showcase, setShowcase] = useState<PortfolioShowcaseResult | null>(null);
  const [githubPolish, setGithubPolish] = useState<AnyResult | null>(null);
  const [publicLanding, setPublicLanding] = useState<AnyResult | null>(null);
  const [demoStatus, setDemoStatus] = useState<AnyResult | null>(null);

  const [sources, setSources] = useState<SourceState>({
    showcase: false,
    github: false,
    publicLanding: false,
    demo: false,
  });

  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState("");
  const [message, setMessage] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState("");

  const loadPortfolioSources = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const [showcaseResult, githubResult, publicLandingResult, demoResult] =
      await Promise.allSettled([
        getPortfolioShowcaseStatus(),
        getGitHubPolishStatus(),
        getPublicLandingStatus(),
        getDemoStatus(),
      ]);

    setSources({
      showcase: showcaseResult.status === "fulfilled",
      github: githubResult.status === "fulfilled",
      publicLanding: publicLandingResult.status === "fulfilled",
      demo: demoResult.status === "fulfilled",
    });

    setShowcase(showcaseResult.status === "fulfilled" ? showcaseResult.value : null);
    setGithubPolish(githubResult.status === "fulfilled" ? githubResult.value as AnyResult : null);
    setPublicLanding(
      publicLandingResult.status === "fulfilled"
        ? publicLandingResult.value as AnyResult
        : null,
    );
    setDemoStatus(demoResult.status === "fulfilled" ? demoResult.value as AnyResult : null);

    const failures = [
      showcaseResult,
      githubResult,
      publicLandingResult,
      demoResult,
    ].filter((result) => result.status === "rejected").length;

    if (failures === 4) {
      setMessage("Portfolio readiness sources failed to load. Confirm the backend is running.");
    } else if (failures > 0) {
      setMessage(
        `${failures} portfolio source${failures === 1 ? "" : "s"} unavailable. Loaded sources are shown without substitute data.`,
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
    void loadPortfolioSources();
  }, [loadPortfolioSources]);

  async function handleSaveShowcaseReport() {
    setLoadingAction("showcase-report");
    setMessage("");

    try {
      const result = await savePortfolioShowcaseReport();
      setShowcase(result);
      setSources((current) => ({ ...current, showcase: true }));
      setMessage("Portfolio showcase report saved locally.");
    } catch {
      setMessage("Portfolio showcase report save failed.");
    } finally {
      setLoadingAction("");
    }
  }

  async function handleSaveGitHubAssets() {
    setLoadingAction("github-assets");
    setMessage("");

    try {
      const result = await saveGitHubPolishArtifacts();
      setGithubPolish(result as AnyResult);
      setSources((current) => ({ ...current, github: true }));
      setMessage("GitHub polish assets saved locally.");
    } catch {
      setMessage("GitHub polish asset save failed.");
    } finally {
      setLoadingAction("");
    }
  }

  async function handleSavePublicLandingReport() {
    setLoadingAction("public-landing-report");
    setMessage("");

    try {
      const result = await savePublicLandingReport();
      setPublicLanding(result as AnyResult);
      setSources((current) => ({ ...current, publicLanding: true }));
      setMessage("Public landing report saved locally.");
    } catch {
      setMessage("Public landing report save failed.");
    } finally {
      setLoadingAction("");
    }
  }

  const readinessCards = useMemo(
    () => [
      {
        label: "Showcase screenshots",
        value: sources.showcase
          ? `${numberText(showcase?.existing_count)}/${numberText(showcase?.expected_count)}`
          : "Unavailable",
        detail: sources.showcase
          ? `${numberText(showcase?.missing_count)} missing screenshot assets`
          : "No /api/portfolio-showcase/status response loaded.",
        tone: sources.showcase ? toneForStatus(showcase?.status) : "muted",
      },
      {
        label: "GitHub polish",
        value: sources.github ? text(githubPolish?.status, "Loaded") : "Unavailable",
        detail: sources.github
          ? `${numberText(githubPolish?.passed)} passed / ${numberText(githubPolish?.failed)} failed`
          : "No /api/github-polish/status response loaded.",
        tone: sources.github ? toneForStatus(githubPolish?.status) : "muted",
      },
      {
        label: "Public landing",
        value: sources.publicLanding
          ? text(publicLanding?.status, "Loaded")
          : "Unavailable",
        detail: sources.publicLanding
          ? `${numberText(publicLanding?.screenshot_count)} screenshots · export ${text(publicLanding?.static_export_ready, "unknown")}`
          : "No /api/public-landing/status response loaded.",
        tone: sources.publicLanding ? toneForStatus(publicLanding?.status) : "muted",
      },
      {
        label: "Demo mode",
        value: sources.demo
          ? demoStatus?.demo_mode
            ? "enabled"
            : "disabled"
          : "Unavailable",
        detail: sources.demo
          ? `${text(demoStatus?.project_name, "Project")} · ${text(demoStatus?.release_version, "version unknown")}`
          : "No /api/demo/status response loaded.",
        tone: sources.demo ? toneForStatus(demoStatus?.demo_mode ? "enabled" : "disabled") : "muted",
      },
    ],
    [demoStatus, githubPolish, publicLanding, showcase, sources],
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <header className="rounded-3xl border border-cyan-300/15 bg-black/25 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
              Live portfolio readiness
            </p>

            <h1 className="mt-2 text-3xl font-semibold text-white">
              O.R.I.O.N. portfolio showcase
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Review the public case-study story, screenshot gallery, showcase
              readiness, GitHub polish state, public landing readiness, and demo
              identity using verified backend records.
            </p>
          </div>

          <button
            onClick={() => void loadPortfolioSources()}
            disabled={loading || Boolean(loadingAction)}
            className="rounded-xl border border-cyan-400/30 px-4 py-3 text-xs font-bold text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-60"
          >
            <RefreshCw className="inline" size={15} />{" "}
            {loading ? "Refreshing..." : "Refresh portfolio state"}
          </button>
        </div>
      </header>

      {message && (
        <p
          role="alert"
          className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] p-4 text-sm leading-6 text-cyan-100"
        >
          {message}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        {readinessCards.map((item) => (
          <MetricCard
            key={item.label}
            label={item.label}
            value={item.value}
            detail={item.detail}
            tone={item.tone as Tone}
          />
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <main className="space-y-5">
          <PortfolioShowcaseStatusPanel
            result={showcase}
            loading={loading || loadingAction === "showcase-report"}
            onLoad={loadPortfolioSources}
            onSave={handleSaveShowcaseReport}
          />

          <PortfolioCaseStudyPanel />
          <PortfolioDemoPanel />
          <ScreenshotGalleryPanel />
        </main>

        <aside className="space-y-5">
          <GlassPanel className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Sparkles size={18} className="text-cyan-300" />
              Live source status
            </h2>

            <div className="mt-4 space-y-2">
              <SourceRow label="/api/portfolio-showcase/status" ok={sources.showcase} />
              <SourceRow label="/api/github-polish/status" ok={sources.github} />
              <SourceRow label="/api/public-landing/status" ok={sources.publicLanding} />
              <SourceRow label="/api/demo/status" ok={sources.demo} />
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              Last refresh: {lastLoadedAt || "Unchecked"}
            </p>
          </GlassPanel>

          <ReadinessReport
            icon={<GitBranch size={18} className="text-violet-300" />}
            title="GitHub polish readiness"
            data={githubPolish}
            onSave={handleSaveGitHubAssets}
            loading={loadingAction === "github-assets"}
            buttonLabel="Save local GitHub assets"
          />

          <ReadinessReport
            icon={<Globe2 size={18} className="text-emerald-300" />}
            title="Public landing readiness"
            data={publicLanding}
            onSave={handleSavePublicLandingReport}
            loading={loadingAction === "public-landing-report"}
            buttonLabel="Save landing report"
          />

          <GlassPanel className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Camera size={18} className="text-cyan-300" />
              Showcase asset summary
            </h2>

            {!showcase ? (
              <p className="mt-3 text-sm text-slate-500">
                No portfolio showcase scan loaded.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-2">
                <SmallMetric label="Expected" value={numberText(showcase.expected_count)} />
                <SmallMetric label="Existing" value={numberText(showcase.existing_count)} />
                <SmallMetric label="Missing" value={numberText(showcase.missing_count)} />
              </div>
            )}
          </GlassPanel>

          <GlassPanel className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <ShieldCheck size={18} className="text-emerald-300" />
              Portfolio safety boundary
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              This portfolio page is presentation and readiness focused. It does
              not publish releases, push to GitHub, delete files, expose secrets,
              or bypass approval gates. Save actions only call existing local
              backend report/artifact endpoints.
            </p>

            <div className="mt-4 grid gap-2">
              <Link
                href="/public-demo"
                className="rounded-xl border border-cyan-400/30 px-3 py-2 text-center text-xs font-bold text-cyan-200 hover:bg-cyan-500/10"
              >
                Open Public Demo
              </Link>

              <Link
                href="/demo"
                className="rounded-xl border border-violet-400/30 px-3 py-2 text-center text-xs font-bold text-violet-200 hover:bg-violet-500/10"
              >
                Open Demo Readiness
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
      <StatusChip tone={ok ? "success" : "muted"}>
        {ok ? "Loaded" : "Unavailable"}
      </StatusChip>
    </div>
  );
}

function ReadinessReport({
  icon,
  title,
  data,
  onSave,
  loading,
  buttonLabel,
}: {
  icon: React.ReactNode;
  title: string;
  data: AnyResult | null;
  onSave: () => void;
  loading: boolean;
  buttonLabel: string;
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
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-slate-400">Status</span>
            <StatusChip tone={toneForStatus(data.status)}>
              {text(data.status, "loaded")}
            </StatusChip>
          </div>

          <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/25 p-4 text-xs leading-5 text-slate-300">
            {text(data.report, "No readiness report returned.")}
          </pre>
        </>
      )}

      <button
        onClick={onSave}
        disabled={loading}
        className="mt-4 w-full rounded-xl border border-cyan-400/30 px-3 py-2 text-center text-xs font-bold text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-60"
      >
        <FileText className="inline" size={14} />{" "}
        {loading ? "Saving..." : buttonLabel}
      </button>
    </GlassPanel>
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

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-cyan-100">{value}</p>
    </div>
  );
}
