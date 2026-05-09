import type { ReactNode } from "react";
import { Label } from "@tge/ui";

export interface MetaSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
}

/**
 * Visual group inside the metadata rail. Use to break a long list of
 * fields into thematic clusters ("Pricing", "Location", "Specs"). The
 * group is title-only — no card wrapper — so it nests cleanly inside
 * the shell's metadata card.
 */
export function MetaSection({ title, description, children }: MetaSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      {title || description ? (
        <header>
          {title ? (
            <h3 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-muted-foreground">
              {title}
            </h3>
          ) : null}
          {description ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
          ) : null}
        </header>
      ) : null}
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

export interface MetaFieldProps {
  id: string;
  label: string;
  helper?: string;
  error?: string;
  children: ReactNode;
}

/**
 * One non-localized field in the metadata rail. Renders a small label,
 * the input slot, and a helper or error caption underneath. Designed to
 * stack vertically inside `EntryEditorShell`'s right rail.
 */
export function MetaField({
  id,
  label,
  helper,
  error,
  children,
}: MetaFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium tracking-[0.04em]">
        {label}
      </Label>
      {children}
      {error ? (
        <p className="text-[11px] text-destructive">{error}</p>
      ) : helper ? (
        <p className="text-[11px] text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}
