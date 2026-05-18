"use client";

import { type ReactNode } from "react";
import { Label } from "@tge/ui";
import { useEntryLocale } from "./entry-locale-provider";
import { LOCALE_LABELS, PRIMARY_LOCALE, type LocaleKey } from "./types";

interface LocalizedFieldShellProps {
  id: string;
  label: string;
  required?: boolean;
  description?: string;
  errorMessage?: string;
  /** Show "Translate from RO" affordance — already derived by the field. */
  showCopyFromPrimary?: boolean;
  onCopyFromPrimary?: () => void;
  children: ReactNode;
}

/**
 * Visual chrome shared by `LocalizedInput`, `LocalizedTextarea`, and the
 * markdown editor wrapper. Renders the label, the right-gutter locale chip
 * for the *active* locale, the input slot, the copy-from-primary affordance,
 * and the validation message — so the per-field components only own the
 * input itself and the controller wiring.
 */
export function LocalizedFieldShell({
  id,
  label,
  required,
  description,
  errorMessage,
  showCopyFromPrimary,
  onCopyFromPrimary,
  children,
}: LocalizedFieldShellProps) {
  const { active } = useEntryLocale();

  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between gap-3">
        <Label htmlFor={id} className="text-xs font-medium tracking-[0.04em]">
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </Label>
        <LocaleChip locale={active} />
      </div>
      <div className="relative">{children}</div>
      <div className="flex items-start justify-between gap-3 min-h-[1rem]">
        <div className="flex-1">
          {errorMessage ? (
            <p className="text-[11px] text-destructive">{errorMessage}</p>
          ) : description ? (
            <p className="text-[11px] text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {showCopyFromPrimary && onCopyFromPrimary && active !== PRIMARY_LOCALE ? (
          <button
            type="button"
            onClick={onCopyFromPrimary}
            className="text-[11px] font-medium text-muted-foreground hover:text-copper"
          >
            Translate from {LOCALE_LABELS[PRIMARY_LOCALE]}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function LocaleChip({ locale }: { locale: LocaleKey }) {
  return (
    <span
      aria-hidden
      className="mono inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground"
    >
      {LOCALE_LABELS[locale]}
    </span>
  );
}
