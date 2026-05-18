"use client";

import { localeAutonyms } from "@tge/i18n";
import { useEntryLocale } from "../entry-locale-provider";
import {
  LOCALE_LABELS,
  type LocaleCompleteness,
  type LocaleErrorCounts,
  type LocaleKey,
  type LocaleStatus,
} from "../types";
import { InfoCard } from "./info-card";

const STATUS_PRESENT: Record<LocaleStatus, { dot: string; label: string }> = {
  filled: { dot: "bg-success", label: "Complete" },
  partial: { dot: "bg-warning", label: "Partial" },
  missing: { dot: "border border-muted-foreground/40", label: "Empty" },
  error: { dot: "bg-destructive", label: "Errors" },
};

export interface LocaleMatrixCardProps {
  completeness: LocaleCompleteness;
  errorCounts?: LocaleErrorCounts;
}

/**
 * Sidebar matrix of all locales with completeness pips. Click a row to set
 * it as the active locale being edited. The active locale is highlighted.
 *
 * The richer Contentful-style version with per-locale publish state badges
 * + per-row publish actions arrives in Phase 1A — this baseline mirrors
 * the inline header switcher in card form, useful for consumers that want
 * locale awareness in the info rail without duplicating the header.
 */
export function LocaleMatrixCard({
  completeness,
  errorCounts,
}: LocaleMatrixCardProps) {
  const { available, active, setActive, primary } = useEntryLocale();

  return (
    <InfoCard title="Locales">
      <ul className="space-y-0.5">
        {available.map((locale) => {
          const status = completeness[locale] ?? "missing";
          const errors = errorCounts?.[locale] ?? 0;
          const isActive = locale === active;
          const isPrimary = locale === primary;
          const present = STATUS_PRESENT[status];
          return (
            <li key={locale}>
              <button
                type="button"
                onClick={() => setActive(locale)}
                aria-current={isActive ? "true" : undefined}
                className={[
                  "flex w-full items-center gap-2 rounded px-1.5 py-1 text-left transition-colors",
                  isActive ? "bg-copper/10" : "hover:bg-muted",
                ].join(" ")}
                title={
                  isActive
                    ? `Editing ${localeAutonyms[locale]}`
                    : `Switch to ${localeAutonyms[locale]}`
                }
              >
                <span
                  aria-hidden
                  className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${present.dot}`}
                />
                <span
                  className={[
                    "mono inline-flex h-5 w-7 shrink-0 items-center justify-center rounded text-[10px] font-semibold tracking-[0.08em]",
                    isActive
                      ? "bg-copper/15 text-copper"
                      : isPrimary
                        ? "bg-copper/5 text-copper/80"
                        : "bg-muted text-muted-foreground",
                  ].join(" ")}
                >
                  {LOCALE_LABELS[locale]}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">
                  {localeAutonyms[locale]}
                  {isPrimary ? (
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      · source
                    </span>
                  ) : null}
                </span>
                <span className="mono shrink-0 text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                  {errors > 0 ? `${errors} err` : present.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </InfoCard>
  );
}

// Re-export for consumers that pass the type through.
export type { LocaleKey };
