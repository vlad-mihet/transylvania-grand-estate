"use client";

import { cn } from "@tge/utils";
import { useTranslations } from "next-intl";

type ToneKey = "neutral" | "success" | "warning" | "danger" | "info";

const toneClasses: Record<ToneKey, string> = {
  neutral:
    "bg-muted text-muted-foreground border-border",
  success:
    "bg-[var(--color-success-bg)] text-[var(--color-success)] border-[color-mix(in_srgb,var(--color-success)_20%,transparent)]",
  warning:
    "bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[color-mix(in_srgb,var(--color-warning)_20%,transparent)]",
  danger:
    "bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[color-mix(in_srgb,var(--color-danger)_20%,transparent)]",
  info:
    "bg-[var(--color-info-bg)] text-[var(--color-info)] border-[color-mix(in_srgb,var(--color-info)_20%,transparent)]",
};

const statusTone: Record<string, ToneKey> = {
  AVAILABLE: "success",
  RESERVED: "warning",
  SOLD: "neutral",
  available: "success",
  reserved: "warning",
  sold: "neutral",
  published: "success",
  draft: "warning",
  archived: "neutral",
  new: "info",
  read: "neutral",
  active: "success",
  inactive: "neutral",
  pending: "warning",
  accepted: "success",
  expired: "neutral",
  revoked: "neutral",
  bounced: "danger",
};

export interface StatusBadgeProps {
  status: string;
  tone?: ToneKey;
  className?: string;
}

/**
 * Compact status pill with semantic tone + mono label. Tone is derived from a
 * known status string unless explicitly overridden.
 */
export function StatusBadge({ status, tone, className }: StatusBadgeProps) {
  const t = useTranslations("Status");
  const resolvedTone: ToneKey = tone ?? statusTone[status] ?? "neutral";
  const label = t.has(status as Parameters<typeof t.has>[0])
    ? t(status as Parameters<typeof t>[0])
    : status.replace(/_/g, " ");

  return (
    <span
      className={cn(
        "mono inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]",
        toneClasses[resolvedTone],
        className,
      )}
    >
      {label}
    </span>
  );
}
