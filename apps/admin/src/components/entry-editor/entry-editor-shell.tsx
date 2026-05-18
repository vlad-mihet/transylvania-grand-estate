"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Maximize2, Minimize2 } from "lucide-react";
import { EntryLocaleSwitcher } from "./entry-locale-switcher";
import type { StatusTone } from "./info-rail/status-card";
import type { LocaleCompleteness, LocaleErrorCounts } from "./types";

const STATUS_PILL: Record<StatusTone, string> = {
  draft: "bg-warning-bg text-warning",
  published: "bg-success-bg text-success",
  archived: "bg-muted text-muted-foreground",
  "live-edit": "bg-info-bg text-info",
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
  /** Localized fields — swap with the active locale. */
  localizedFields: ReactNode;
  /**
   * Optional document outline rendered as a collapsible left rail on lg+.
   * Usually `<OutlineSidebar />` wired to the editor via
   * `EntryOutlineProvider`. Hidden in distraction-free mode.
   */
  outline?: ReactNode;
  /**
   * Stack of info-rail cards rendered above the metadata accordion:
   * <StatusCard /> + <ActivityCard /> + <ActionsCard /> + ...
   * Hidden in distraction-free mode.
   */
  infoRail?: ReactNode;
  /** Non-localized fields (slug, status, owner, geo, price, …). */
  metadataFields: ReactNode;
  /** Optional domain block above the metadata rail (catalog hero/gallery/brand). */
  extraSection?: ReactNode;
  /** When dirty, surface an "unsaved changes" cue in the top bar. */
  unsavedDirty?: boolean;
  /**
   * Optional save-status indicator rendered in the header next to actions.
   * Used by the autosave wiring (Phase 4) to surface "Saved 12s ago" /
   * "Saving…" / conflict warnings.
   */
  saveStatus?: ReactNode;
  /**
   * Locale completeness derived by the form via `useLocaleCompleteness`. When
   * provided, the shell renders the locale switcher in the header. Pass
   * `null` to opt out.
   */
  switcherCompleteness?: LocaleCompleteness | null;
  switcherErrorCounts?: LocaleErrorCounts;
  /** Optional caption under "Shared across locales" right rail label. */
  metadataLabel?: string;
}

/**
 * Layout chrome for the entry editor. Three columns on lg+ when an outline
 * is provided (2/7/3), or 8/4 on lg+ without one. Distraction-free mode
 * (⌘.) collapses both rails so the canvas occupies the full viewport. The
 * locale switcher and save-status indicator persist in the header so authors
 * never lose orientation, but the action buttons and breadcrumb fade out.
 *
 * Each `<LocalizedInput|Textarea|TiptapEditor />` reads the active locale
 * from `EntryLocaleProvider` and binds to `${name}.${active}`; the shell is
 * agnostic to the field implementation.
 */
export function EntryEditorShell({
  title,
  breadcrumb,
  status,
  actions,
  localizedFields,
  outline,
  infoRail,
  metadataFields,
  extraSection,
  unsavedDirty,
  saveStatus,
  switcherCompleteness,
  switcherErrorCounts,
  metadataLabel = "Shared across locales",
}: EntryEditorShellProps) {
  const [metadataOpen, setMetadataOpen] = useState(true);
  const [distractionFree, setDistractionFree] = useState(false);
  const showSwitcher = switcherCompleteness != null;
  const hasOutline = outline != null;

  const toggleDistractionFree = useCallback(
    () => setDistractionFree((v) => !v),
    [],
  );

  // Global ⌘. / Ctrl+. shortcut. Scoped to keydown on the document so the
  // toggle works whether or not the editor canvas is focused.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === ".") {
        e.preventDefault();
        toggleDistractionFree();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggleDistractionFree]);

  // Grid template differs by (outline present, distraction-free). Spelled out
  // rather than computed so Tailwind's JIT picks up all variants.
  const gridClass = distractionFree
    ? "grid grid-cols-12 gap-5 px-4 py-5 md:px-6"
    : hasOutline
      ? "grid grid-cols-12 gap-5 px-4 py-5 md:px-6"
      : "grid grid-cols-12 gap-5 px-4 py-5 md:px-6";

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm md:flex-row md:items-center md:justify-between md:gap-6 md:px-6">
        <div className="min-w-0 flex-1">
          {!distractionFree && breadcrumb ? (
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
                  STATUS_PILL[status.tone ?? "neutral"],
                ].join(" ")}
              >
                {status.value}
              </span>
            ) : null}
            {unsavedDirty && !saveStatus ? (
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
            {saveStatus ? <div className="text-[11px]">{saveStatus}</div> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {showSwitcher ? (
            <EntryLocaleSwitcher
              completeness={switcherCompleteness}
              errorCounts={switcherErrorCounts}
            />
          ) : null}
          <button
            type="button"
            onClick={toggleDistractionFree}
            title={
              distractionFree
                ? "Exit distraction-free (⌘.)"
                : "Distraction-free mode (⌘.)"
            }
            className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-pressed={distractionFree}
            aria-label={
              distractionFree
                ? "Exit distraction-free mode"
                : "Enter distraction-free mode"
            }
          >
            {distractionFree ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
          {!distractionFree && actions ? (
            <div className="flex items-center gap-2">{actions}</div>
          ) : null}
        </div>
      </header>

      <div className={gridClass}>
        {hasOutline && !distractionFree ? (
          <aside className="col-span-12 lg:col-span-2 lg:sticky lg:top-[4.5rem] lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:pr-2">
            {outline}
          </aside>
        ) : null}

        <div
          className={[
            "col-span-12 flex flex-col gap-5",
            distractionFree
              ? "lg:col-span-10 lg:col-start-2"
              : hasOutline
                ? "lg:col-span-7"
                : "lg:col-span-8",
          ].join(" ")}
        >
          {localizedFields}
        </div>

        {!distractionFree ? (
          <aside
            className={[
              "col-span-12 flex flex-col gap-4 lg:sticky lg:top-[4.5rem] lg:self-start",
              hasOutline ? "lg:col-span-3" : "lg:col-span-4",
            ].join(" ")}
          >
            {infoRail ? (
              <div className="flex flex-col gap-4">{infoRail}</div>
            ) : null}
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
                  <p className="mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Metadata
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {metadataLabel}
                  </p>
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
        ) : null}
      </div>
    </div>
  );
}
