"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleOff,
  Clock3,
  FileText,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

import {
  operationalMissionStatus,
  operationalStatusLabel,
  type OperationalLifecycleStatus,
} from "@/lib/mission-status";
import { cn } from "@/lib/utils";

export type SemanticTone =
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "ai"
  | "neutral";

const toneClasses: Record<SemanticTone, string> = {
  info: "border-cyan-300/25 bg-cyan-300/[0.07] text-cyan-100",
  success: "border-emerald-300/25 bg-emerald-300/[0.07] text-emerald-100",
  warning: "border-amber-300/25 bg-amber-300/[0.07] text-amber-100",
  danger: "border-rose-300/25 bg-rose-300/[0.07] text-rose-100",
  ai: "border-violet-300/25 bg-violet-300/[0.07] text-violet-100",
  neutral: "border-white/10 bg-white/[0.035] text-slate-300",
};

const lifecycleTones: Record<OperationalLifecycleStatus, SemanticTone> = {
  draft: "neutral",
  ready: "info",
  running: "info",
  waiting_for_approval: "warning",
  paused: "warning",
  blocked: "danger",
  failed: "danger",
  cancelled: "neutral",
  complete: "success",
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  metadata,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  metadata?: ReactNode;
}) {
  return (
    <header className="orion-panel overflow-hidden p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-cyan-300">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            {description}
          </p>
          {metadata ? <div className="mt-3">{metadata}</div> : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

export function ConnectionStatus({
  connected,
  authenticated = connected,
  compact = false,
  state,
}: {
  connected: boolean;
  authenticated?: boolean;
  compact?: boolean;
  state?: "connecting" | "online" | "auth_required" | "offline";
}) {
  const resolvedState = state ?? (
    connected && authenticated
      ? "online"
      : connected
        ? "auth_required"
        : "offline"
  );
  const ready = resolvedState === "online";
  const connecting = resolvedState === "connecting";
  const Icon = connecting ? LoaderCircle : ready ? Wifi : WifiOff;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border font-semibold",
        compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-xs",
        ready ? toneClasses.success : connecting ? toneClasses.warning : toneClasses.danger,
      )}
    >
      <Icon size={compact ? 11 : 13} aria-hidden className={connecting ? "animate-spin" : undefined} />
      {resolvedState === "online"
        ? "Online · authenticated"
        : resolvedState === "connecting"
          ? "Connecting · authenticating"
          : resolvedState === "auth_required"
            ? "Authentication required"
            : "Backend offline"}
    </span>
  );
}

export function OperationalStatusBanner({
  tone,
  title,
  description,
  action,
}: {
  tone: SemanticTone;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const Icon =
    tone === "success"
      ? CheckCircle2
      : tone === "danger"
        ? ShieldAlert
        : tone === "warning"
          ? AlertTriangle
          : Clock3;
  return (
    <section
      role={tone === "danger" ? "alert" : "status"}
      className={cn("rounded-2xl border p-4", toneClasses[tone])}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Icon className="shrink-0" size={18} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{title}</p>
          <p className="mt-1 text-xs leading-5 opacity-75">{description}</p>
        </div>
        {action}
      </div>
    </section>
  );
}

export function MissionStatusBadge({ status }: { status: unknown }) {
  const lifecycle = operationalMissionStatus(status);
  const tone = lifecycle ? lifecycleTones[lifecycle] : "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
        toneClasses[tone],
      )}
    >
      {operationalStatusLabel(status)}
    </span>
  );
}

export function ApprovalStatusBadge({ status }: { status: unknown }) {
  const normalized = String(status ?? "").trim().toLowerCase();
  const lifecycle = normalized === "pending" || normalized === "requested" || normalized === "waiting"
    ? "waiting_for_approval"
    : normalized === "executing"
      ? "running"
      : normalized === "approved"
        ? "complete"
        : normalized === "rejected"
          ? "cancelled"
          : normalized === "failed"
            ? "failed"
            : normalized;
  return <MissionStatusBadge status={lifecycle} />;
}

export function RiskBadge({ risk }: { risk: unknown }) {
  const normalized = String(risk ?? "unavailable").trim().toLowerCase();
  const tone: SemanticTone =
    normalized === "critical" || normalized === "high"
      ? "danger"
      : normalized === "medium"
        ? "warning"
        : normalized === "low"
          ? "success"
          : "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
        toneClasses[tone],
      )}
    >
      <ShieldAlert size={11} aria-hidden />
      {normalized} risk
    </span>
  );
}

export function ApprovalCard({
  title,
  description,
  risk,
  metadata,
  actions,
}: {
  title: string;
  description: string;
  risk: unknown;
  metadata?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.045] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
        </div>
        <RiskBadge risk={risk} />
      </div>
      {metadata ? <div className="mt-3 text-xs text-slate-500">{metadata}</div> : null}
      {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
    </article>
  );
}

export function ActivityTimeline({
  items,
}: {
  items: Array<{
    id: string | number;
    title: string;
    detail?: string;
    timestamp?: string;
    tone?: SemanticTone;
    href?: string;
  }>;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Meaningful backend events will appear here as work progresses."
      />
    );
  }
  return (
    <ol className="space-y-1">
      {items.map((item) => (
        <li key={item.id} className="relative grid grid-cols-[18px_minmax(0,1fr)] gap-3 pb-4 last:pb-0">
          <span
            className={cn(
              "mt-1.5 h-2.5 w-2.5 rounded-full border",
              toneClasses[item.tone ?? "info"],
            )}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              {item.href ? <Link href={item.href} className="text-sm font-semibold text-slate-200 hover:text-cyan-100">{item.title}</Link> : <p className="text-sm font-semibold text-slate-200">{item.title}</p>}
              {item.timestamp ? (
                <time className="text-[10px] text-slate-600">{item.timestamp}</time>
              ) : null}
            </div>
            {item.detail ? (
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export const ExecutionTimeline = ActivityTimeline;

export function ContextSourceChip({ label, kind = "Context" }: { label: string; kind?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px]", toneClasses.ai)}>
      <FileText size={11} aria-hidden />
      {kind}: {label}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  detail: string;
  tone?: SemanticTone;
}) {
  return (
    <div className={cn("orion-metric-card border p-4", toneClasses[tone])}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-65">{label}</p>
      <div className="mt-2 text-2xl font-black tracking-tight">{value}</div>
      <p className="mt-2 text-xs leading-5 opacity-65">{detail}</p>
    </div>
  );
}

export function DataTable({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="orion-scrollbar overflow-x-auto rounded-2xl border border-white/10">
      <table aria-label={label} className="w-full min-w-[680px] border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center">{children}</div>;
}

export function ActionToolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
      <CircleOff className="mx-auto text-slate-600" size={22} aria-hidden />
      <p className="mt-3 text-sm font-bold text-slate-300">{title}</p>
      <p className="mx-auto mt-1 max-w-xl text-xs leading-5 text-slate-500">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function LoadingSkeleton({ label = "Loading operational data" }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-3 rounded-2xl border border-white/10 p-4">
      <div className="h-4 w-1/3 animate-pulse rounded bg-white/[0.08]" />
      <div className="h-3 w-full animate-pulse rounded bg-white/[0.05]" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.05]" />
    </div>
  );
}

export function ErrorState({ title, description, onRetry }: { title: string; description: string; onRetry?: () => void }) {
  return (
    <OperationalStatusBanner
      tone="danger"
      title={title}
      description={description}
      action={onRetry ? <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-xl border border-rose-200/20 px-3 py-2 text-xs font-bold"><RefreshCw size={13} />Retry</button> : undefined}
    />
  );
}

export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  return (
    <OperationalStatusBanner
      tone="danger"
      title="O.R.I.O.N. backend is unavailable"
      description="Live records are hidden rather than replaced with simulated data. Start the backend, verify local authentication, then retry."
      action={onRetry ? <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-xl border border-rose-200/20 px-3 py-2 text-xs font-bold"><RefreshCw size={13} />Retry connection</button> : undefined}
    />
  );
}

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  children,
  confirmDisabled = false,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
  confirmDisabled?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="orion-confirm-title" aria-describedby="orion-confirm-description">
      <div ref={dialogRef} tabIndex={-1} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b0e15] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="orion-confirm-title" className="font-bold text-white">{title}</h2>
            <p id="orion-confirm-description" className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
          </div>
          <button type="button" aria-label="Close confirmation" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-white/[0.05] hover:text-white"><X size={16} /></button>
        </div>
        {children ? <div className="mt-4">{children}</div> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button ref={cancelRef} type="button" onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-300">Cancel</button>
          <button type="button" disabled={confirmDisabled} onClick={onConfirm} className="rounded-xl bg-amber-300 px-4 py-2 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function CodeViewer({ label, content, className }: { label: string; content: string; className?: string }) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border border-white/10 bg-black/35", className)}>
      <div className="border-b border-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <pre className="orion-scrollbar max-h-[520px] overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-5 text-slate-300">{content || "No output available."}</pre>
    </section>
  );
}

export function DiffViewer({ diff }: { diff: string }) {
  return <CodeViewer label="Proposed diff" content={diff} />;
}

export function LogViewer({ logs }: { logs: string }) {
  return <CodeViewer label="Runtime log" content={logs} />;
}

export function CommandOutput({ output }: { output: string }) {
  return <CodeViewer label="Command output" content={output} />;
}

export function InspectorDrawer({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <aside className="fixed inset-y-0 right-0 z-[120] w-full max-w-md border-l border-white/10 bg-[#080b12]/98 p-5 shadow-2xl backdrop-blur-2xl" aria-label={title}>
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
        <h2 className="font-bold text-white">{title}</h2>
        <button type="button" aria-label="Close inspector" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-white/[0.05] hover:text-white"><X size={16} /></button>
      </div>
      <div className="orion-scrollbar h-[calc(100%-58px)] overflow-y-auto py-4">{children}</div>
    </aside>
  );
}

export function NextActionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-cyan-200">
      {children}<ArrowRight size={13} aria-hidden />
    </Link>
  );
}

export function BusyLabel({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-2"><LoaderCircle className="animate-spin" size={13} aria-hidden />{children}</span>;
}
