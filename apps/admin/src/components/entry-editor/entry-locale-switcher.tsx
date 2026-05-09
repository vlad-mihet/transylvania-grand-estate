"use client";

import { localeAutonyms } from "@tge/i18n";
import { useEntryLocale } from "./entry-locale-provider";
import {
  LOCALE_LABELS,
  type LocaleCompleteness,
  type LocaleErrorCounts,
  type LocaleStatus,
} from "./types";

interface EntryLocaleSwitcherProps {
  completeness: LocaleCompleteness;
  errorCounts?: LocaleErrorCounts;
  className?: string;
}

const STATUS_DOT: Record<LocaleStatus, string> = {
  filled: "bg-copper",
  partial: "bg-copper/40",
  missing: "border border-muted-foreground/40",
  error: "bg-destructive",
};

const STATUS_LABEL: Record<LocaleStatus, string> = {
  filled: "all fields filled",
  partial: "some fields missing",
  missing: "no fields filled",
  error: "validation errors",
};

export function EntryLocaleSwitcher({
  completeness,
  errorCounts,
  className,
}: EntryLocaleSwitcherProps) {
  const { active, setActive, available } = useEntryLocale();

  return (
    <div
      className={[
        "inline-flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="tablist"
      aria-label="Editing locale"
    >
      {available.map((locale) => {
        const status = completeness[locale] ?? "missing";
        const errorCount = errorCounts?.[locale] ?? 0;
        const isActive = locale === active;
        return (
          <button
            key={locale}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={`${localeAutonyms[locale]} — ${STATUS_LABEL[status]}${
              errorCount > 0 ? ` (${errorCount} error${errorCount === 1 ? "" : "s"})` : ""
            }`}
            onClick={() => setActive(locale)}
            className={[
              "relative flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold tracking-[0.08em] transition-colors",
              isActive
                ? "bg-copper/10 text-copper"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            ].join(" ")}
          >
            {LOCALE_LABELS[locale]}
            <LocaleDot status={status} />
            {errorCount > 0 ? (
              <span className="ml-0.5 rounded-sm bg-destructive px-1 text-[10px] font-bold leading-tight text-white">
                {errorCount}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function LocaleDot({ status }: { status: LocaleStatus }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`}
    />
  );
}
