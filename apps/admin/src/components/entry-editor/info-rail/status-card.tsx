"use client";

import { type ReactNode } from "react";
import { RelativeTime } from "@/components/shared/relative-time";
import { InfoCard, InfoRow } from "./info-card";

export type StatusTone =
  | "draft"
  | "published"
  | "archived"
  | "live-edit"
  | "neutral";

const TONE: Record<StatusTone, { pill: string; dot: string; label: string }> = {
  draft: {
    pill: "bg-warning-bg text-warning",
    dot: "bg-warning",
    label: "Draft",
  },
  published: {
    pill: "bg-success-bg text-success",
    dot: "bg-success",
    label: "Published",
  },
  archived: {
    pill: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/60",
    label: "Archived",
  },
  "live-edit": {
    pill: "bg-info-bg text-info",
    dot: "bg-info",
    label: "Live edit",
  },
  neutral: {
    pill: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/60",
    label: "",
  },
};

export interface StatusCardProps {
  tone: StatusTone;
  /** Override the tone's default label (e.g. "Draft pending"). */
  label?: ReactNode;
  /** Helper paragraph shown under the pill. */
  helperText?: ReactNode;
  publishedAt?: string | null;
  updatedAt?: string | null;
  updatedBy?: { name?: string | null; email?: string | null } | null;
  /** True when there's a pending draft on top of a published entry. */
  pendingDraft?: boolean;
}

/**
 * Primary entry status card. Renders the headline pill plus key timestamps
 * and the last editor. For entities without a status column (Developers,
 * Cities, Agents, Testimonials, Properties) pass `tone="live-edit"` and a
 * `helperText` explaining the implication.
 */
export function StatusCard({
  tone,
  label,
  helperText,
  publishedAt,
  updatedAt,
  updatedBy,
  pendingDraft,
}: StatusCardProps) {
  const t = TONE[tone];
  const displayLabel = label ?? t.label;

  return (
    <InfoCard title="Status">
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={[
              "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-semibold tracking-[0.04em]",
              t.pill,
            ].join(" ")}
          >
            <span
              aria-hidden
              className={`inline-block h-1.5 w-1.5 rounded-full ${t.dot}`}
            />
            {displayLabel}
          </span>
          {pendingDraft ? (
            <span className="inline-flex items-center rounded bg-warning-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-warning">
              Draft pending
            </span>
          ) : null}
        </div>
        {helperText ? (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {helperText}
          </p>
        ) : null}
        <div className="space-y-0.5">
          {publishedAt ? (
            <InfoRow label="Published">
              <RelativeTime value={publishedAt} />
            </InfoRow>
          ) : null}
          {updatedAt ? (
            <InfoRow label="Updated">
              <RelativeTime value={updatedAt} />
            </InfoRow>
          ) : null}
          {updatedBy?.name || updatedBy?.email ? (
            <InfoRow label="By">
              <span className="truncate">
                {updatedBy.name || updatedBy.email}
              </span>
            </InfoRow>
          ) : null}
        </div>
      </div>
    </InfoCard>
  );
}
