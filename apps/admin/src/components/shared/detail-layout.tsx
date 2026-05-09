import type { ReactNode } from "react";

interface DetailLayoutProps {
  /** Left rail — typically images + localized long-form content. */
  main: ReactNode;
  /** Right rail — non-localized metadata cards (one or more). */
  meta: ReactNode;
}

/**
 * Two-rail detail layout shared across every read-only entity view
 * (city, agent, developer, testimonial, property). Mirrors the editor's
 * `EntryEditorShell` 8/4 column split so the read↔edit transition doesn't
 * shift content under the user's eyes.
 *
 * - `lg:col-span-8` left rail holds visuals + localized fields.
 * - `lg:col-span-4` right rail is sticky on `lg+` and stacks the meta cards.
 * - Below `lg`, both rails collapse to `col-span-12` and stack vertically.
 */
export function DetailLayout({ main, meta }: DetailLayoutProps) {
  return (
    <div className="grid grid-cols-12 gap-5">
      <div className="col-span-12 lg:col-span-8 flex flex-col gap-5">
        {main}
      </div>
      <aside className="col-span-12 lg:col-span-4 flex flex-col gap-4 lg:sticky lg:top-[4.5rem] lg:self-start">
        {meta}
      </aside>
    </div>
  );
}

interface DetailMetaCardProps {
  title?: string;
  children: ReactNode;
}

/** A bordered card in the metadata rail with an uppercase tracked title. */
export function DetailMetaCard({ title, children }: DetailMetaCardProps) {
  return (
    <div className="rounded-md border border-border bg-card">
      {title ? (
        <header className="border-b border-border px-5 py-3">
          <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-muted-foreground">
            {title}
          </p>
        </header>
      ) : null}
      <dl className="flex flex-col gap-4 p-5">{children}</dl>
    </div>
  );
}

interface MetaRowProps {
  label: string;
  value: ReactNode;
}

/** Single label-above-value row inside a `DetailMetaCard`. */
export function MetaRow({ label, value }: MetaRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">
        {value === null || value === undefined || value === "" ? (
          <span className="text-muted-foreground/60">—</span>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
