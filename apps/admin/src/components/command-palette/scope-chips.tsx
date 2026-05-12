"use client";

import { useTranslations } from "next-intl";
import { cn } from "@tge/utils";
import type { SearchEntityType } from "@tge/types/schemas/search";

export type ScopeValue = SearchEntityType | "all";

interface Props {
  /** Entity types the current user's role is allowed to search. */
  allowed: readonly SearchEntityType[];
  value: ScopeValue;
  onChange: (next: ScopeValue) => void;
}

/**
 * Horizontal chip row under the palette input. Selecting a chip restricts the
 * remote search to that one entity (sent as `?types=`). Only chips for entity
 * types the role permits are rendered — the "All" chip always renders.
 *
 * Scrolls horizontally on overflow on narrow viewports; on desktop the chips
 * just wrap if needed thanks to the flex layout.
 */
export function ScopeChips({ allowed, value, onChange }: Props) {
  const t = useTranslations("CommandPalette.scope");

  return (
    <div className="flex shrink-0 items-center gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Chip
        label={t("all")}
        active={value === "all"}
        onClick={() => onChange("all")}
      />
      {allowed.map((entity) => (
        <Chip
          key={entity}
          label={t(entity)}
          active={value === entity}
          onClick={() => onChange(entity)}
        />
      ))}
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mono shrink-0 rounded-sm border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] transition-colors",
        active
          ? "border-copper/40 bg-copper/10 text-copper"
          : "border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
