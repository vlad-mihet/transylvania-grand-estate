"use client";

import { useTranslations } from "next-intl";

import { Mono } from "@/components/shared/mono";

/**
 * Server-side computed diff stored on AuditLog.diff. Each entry is either a
 * scalar change (before → after) or an array delta (added/removed sets).
 * The renderer is forgiving: if the row pre-dates the diff column (`null`)
 * it returns null so the calling card can fall back to a JSON viewer.
 */
type ScalarChange = {
  field: string;
  before: unknown;
  after: unknown;
};

type ArrayChange = {
  field: string;
  added: unknown[];
  removed: unknown[];
};

type ChangedField = ScalarChange | ArrayChange;

function isArrayChange(c: ChangedField): c is ArrayChange {
  return "added" in c && "removed" in c;
}

interface AuditDiffProps {
  resource: string;
  diff: unknown;
}

export function AuditDiff({ resource, diff }: AuditDiffProps) {
  const t = useTranslations("AuditLogs");

  if (!Array.isArray(diff) || diff.length === 0) {
    return null;
  }
  const changes = diff as ChangedField[];

  return (
    <ul className="space-y-2">
      {changes.map((change) => (
        <li key={change.field} className="rounded-sm border border-border p-3">
          <FieldLabel resource={resource} field={change.field} />
          {isArrayChange(change) ? (
            <ArrayDelta change={change} t={t} />
          ) : (
            <ScalarDelta change={change} t={t} />
          )}
        </li>
      ))}
    </ul>
  );
}

function FieldLabel({
  resource,
  field,
}: {
  resource: string;
  field: string;
}) {
  const t = useTranslations("AuditLogs");
  const key = `fieldLabel.${resource}.${field}` as Parameters<
    typeof t.has
  >[0];
  const label = t.has(key)
    ? t(key as Parameters<typeof t>[0])
    : humanise(field);
  return (
    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
      {label}
    </p>
  );
}

function ScalarDelta({
  change,
  t,
}: {
  change: ScalarChange;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {change.before == null ? (
        <span className="text-muted-foreground italic">{t("emptyValue")}</span>
      ) : (
        <span className="rounded-sm bg-rose-50 px-2 py-0.5 text-rose-900 line-through dark:bg-rose-950/40 dark:text-rose-200">
          <ValueChip value={change.before} />
        </span>
      )}
      <span aria-hidden className="text-muted-foreground">
        →
      </span>
      {change.after == null ? (
        <span className="text-muted-foreground italic">{t("emptyValue")}</span>
      ) : (
        <span className="rounded-sm bg-emerald-50 px-2 py-0.5 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          <ValueChip value={change.after} />
        </span>
      )}
    </div>
  );
}

function ArrayDelta({
  change,
  t,
}: {
  change: ArrayChange;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="space-y-1.5 text-sm">
      {change.added.length > 0 && (
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-700 dark:text-emerald-400">
            {t("added")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {change.added.map((v, i) => (
              <span
                key={i}
                className="rounded-sm bg-emerald-50 px-2 py-0.5 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
              >
                <ValueChip value={v} />
              </span>
            ))}
          </div>
        </div>
      )}
      {change.removed.length > 0 && (
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-rose-700 dark:text-rose-400">
            {t("removed")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {change.removed.map((v, i) => (
              <span
                key={i}
                className="rounded-sm bg-rose-50 px-2 py-0.5 text-rose-900 line-through dark:bg-rose-950/40 dark:text-rose-200"
              >
                <ValueChip value={v} />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ValueChip({ value }: { value: unknown }) {
  if (value == null) return <span>—</span>;
  if (typeof value === "boolean") return <Mono>{String(value)}</Mono>;
  if (typeof value === "number") return <Mono>{value}</Mono>;
  if (typeof value === "string") {
    if (value.length > 80) {
      return <Mono>{value.slice(0, 80)}…</Mono>;
    }
    return <span>{value}</span>;
  }
  return <Mono className="text-[11px]">{JSON.stringify(value)}</Mono>;
}

function humanise(field: string): string {
  return field
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}
