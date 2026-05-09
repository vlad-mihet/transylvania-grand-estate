"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { EntryLocaleSwitcher } from "./entry-locale-switcher";
import type { LocaleCompleteness, LocaleErrorCounts } from "./types";

type StatusTone = "draft" | "published" | "archived" | "neutral";

const STATUS_TONE: Record<StatusTone, string> = {
  draft: "bg-warning-bg text-warning",
  published: "bg-success-bg text-success",
  archived: "bg-muted text-muted-foreground",
  neutral: "bg-muted text-muted-foreground",
};

export interface EntryEditorShellProps {
  /** Top-bar primary heading — usually "Course: Fundamentele TGE" or the slug. */
  title: ReactNode;
  /** Optional secondary line under the title (e.g. slug chip, breadcrumb). */
  breadcrumb?: ReactNode;
  /** Status pill content (e.g. { value: "Draft", tone: "draft" }). */
  status?: { value: ReactNode; tone?: StatusTone };
  /** Save / Publish / Discard action buttons rendered in the top bar. */
  actions?: ReactNode;
  /** Localized fields — these swap with the active locale. */
  localizedFields: ReactNode;
  /** Non-localized fields (slug, status, owner, geo, price, …). */
  metadataFields: ReactNode;
  /** Optional domain block above the metadata rail (catalog hero/gallery/brand). */
  extraSection?: ReactNode;
  /** When dirty, surface an "unsaved changes" cue in the top bar. */
  unsavedDirty?: boolean;
  /** Locale completeness derived by the form via `useLocaleCompleteness`. */
  switcherCompleteness: LocaleCompleteness;
  switcherErrorCounts?: LocaleErrorCounts;
  /** Optional caption under "Shared across locales" right rail label. */
  metadataLabel?: string;
}

export function EntryEditorShell({
  title,
  breadcrumb,
  status,
  actions,
  localizedFields,
  metadataFields,
  extraSection,
  unsavedDirty,
  switcherCompleteness,
  switcherErrorCounts,
  metadataLabel = "Shared across locales",
}: EntryEditorShellProps) {
  const [metadataOpen, setMetadataOpen] = useState(true);

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm md:flex-row md:items-center md:justify-between md:gap-6 md:px-6">
        <div className="min-w-0 flex-1">
          {breadcrumb ? (
            <div className="text-[11px] tracking-[0.06em] text-muted-foreground">
              {breadcrumb}
            </div>
          ) : null}
          <div className="flex items-center gap-2.5">
            <h1 className="truncate text-base font-semibold tracking-[-0.005em]">
              {title}
            </h1>
            {status ? (
              <span
                className={[
                  "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.08em] uppercase",
                  STATUS_TONE[status.tone ?? "neutral"],
                ].join(" ")}
              >
                {status.value}
              </span>
            ) : null}
            {unsavedDirty ? (
              <span
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                title="You have unsaved changes"
              >
                <span
                  aria-hidden
                  className="inline-block h-1.5 w-1.5 rounded-full bg-copper"
                />
                Unsaved
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <EntryLocaleSwitcher
            completeness={switcherCompleteness}
            errorCounts={switcherErrorCounts}
          />
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      </header>

      <div className="grid grid-cols-12 gap-5 px-4 py-5 md:px-6">
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-5">
          {localizedFields}
        </div>
        <aside className="col-span-12 lg:col-span-4 flex flex-col gap-4 lg:sticky lg:top-[4.5rem] lg:self-start">
          {extraSection ? (
            <div className="rounded-md border border-border bg-card p-4">
              {extraSection}
            </div>
          ) : null}
          <div className="rounded-md border border-border bg-card">
            <button
              type="button"
              onClick={() => setMetadataOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left lg:cursor-default"
              aria-expanded={metadataOpen}
              aria-controls="entry-editor-metadata"
            >
              <div>
                <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-muted-foreground">
                  Metadata
                </p>
                <p className="text-[11px] text-muted-foreground">{metadataLabel}</p>
              </div>
              <span className="lg:hidden text-muted-foreground">
                {metadataOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </span>
            </button>
            <div
              id="entry-editor-metadata"
              className={[
                "border-t border-border px-4 py-4",
                metadataOpen ? "block" : "hidden lg:block",
              ].join(" ")}
            >
              <div className="flex flex-col gap-4">{metadataFields}</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
