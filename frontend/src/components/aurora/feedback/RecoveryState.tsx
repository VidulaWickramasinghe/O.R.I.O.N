"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  AlertTriangle,
  CircleX,
  DatabaseBackup,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  WifiOff,
} from "lucide-react";

import { RECOVERY_STATES, type RecoveryCode } from "@/lib/recovery";

const icons: Partial<Record<RecoveryCode, typeof AlertTriangle>> = {
  loading: LoaderCircle,
  backend_offline: WifiOff,
  sidecar_crashed: WifiOff,
  permission_denied: ShieldAlert,
  permission_changed: ShieldAlert,
  corrupt_data: DatabaseBackup,
  mission_cancelled: CircleX,
};

type RecoveryStateProps = {
  code: RecoveryCode;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  busy?: boolean;
  focusOnChange?: boolean;
  compact?: boolean;
};

export function RecoveryState({
  code,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  busy = false,
  focusOnChange = true,
  compact = false,
}: RecoveryStateProps) {
  const copy = RECOVERY_STATES[code];
  const Icon = icons[code] ?? AlertTriangle;
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const isLoading = code === "loading";
  const role = copy.urgency === "assertive" ? "alert" : "status";
  const label = actionLabel ?? copy.actionLabel;

  useEffect(() => {
    if (focusOnChange && !isLoading) headingRef.current?.focus();
  }, [code, focusOnChange, isLoading]);

  const actionClass = "aurora-button mt-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200";

  return (
    <section
      role={role}
      aria-live={copy.urgency}
      aria-atomic="true"
      aria-busy={isLoading || busy}
      data-recovery-code={code}
      className={`rounded-2xl border border-white/15 bg-black/30 ${compact ? "p-4" : "p-5"}`}
    >
      <div className="flex items-start gap-3">
        <Icon
          aria-hidden="true"
          className={`mt-0.5 shrink-0 ${isLoading ? "animate-spin text-cyan-300" : "text-amber-300"}`}
          size={20}
        />
        <div className="min-w-0">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            {title ?? copy.title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            {description ?? copy.description}
          </p>
          {onAction && (
            <button type="button" onClick={onAction} disabled={busy} className={actionClass}>
              <RefreshCw aria-hidden="true" size={15} className={busy ? "animate-spin" : ""} />
              {busy ? "Working…" : label}
            </button>
          )}
          {!onAction && actionHref && (
            <Link href={actionHref} className={actionClass}>
              {label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
