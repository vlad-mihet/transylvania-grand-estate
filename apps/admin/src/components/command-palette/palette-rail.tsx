"use client";

import {
  Building2,
  FileText,
  HardHat,
  Inbox,
  Landmark,
  Layers,
  Map as MapIcon,
  MapPin,
  MessageSquare,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@tge/utils";
import type { SearchEntityType } from "@tge/types/schemas/search";
import type { ScopeValue } from "./scope-chips";

interface Props {
  /** Entity types the current user's role is allowed to filter by. */
  allowed: readonly SearchEntityType[];
  value: ScopeValue;
  onChange: (next: ScopeValue) => void;
  /**
   * Per-entity count for the rail badges. Source depends on context:
   *   • Empty state — total inventory (`/search/counts`).
   *   • Active query — per-entity result totals (`/search` `group.total`).
   * The rail doesn't care which; it just renders the number.
   */
  countsByEntity: Partial<Record<SearchEntityType, number>>;
  /** Sum across all allowed entities. Drives the `All` badge. */
  totalCount: number;
}

const ENTITY_ICON: Record<SearchEntityType, LucideIcon> = {
  property: Building2,
  agent: UserCircle,
  developer: HardHat,
  city: MapPin,
  county: MapIcon,
  article: FileText,
  inquiry: Inbox,
  testimonial: MessageSquare,
  bankRate: Landmark,
  user: Users,
};

/**
 * Vertical filter rail — Slack-style category list on the left side of the
 * palette modal. Always rendered on md+ viewports; mobile falls back to
 * the existing horizontal `<ScopeChips />`.
 *
 * Items are vanilla `<button>` elements, deliberately OUTSIDE cmdk, so the
 * Command's ↑↓ keyboard navigation stays anchored to the result list (the
 * meaningful navigation surface). Rail-switching happens via mouse, Tab, or
 * the palette-level `Alt+1…9` shortcut.
 */
export function PaletteRail({
  allowed,
  value,
  onChange,
  countsByEntity,
  totalCount,
}: Props) {
  const t = useTranslations("CommandPalette");
  const tScope = useTranslations("CommandPalette.scope");

  return (
    <nav
      aria-label={t("filterHeading")}
      className="hidden h-full w-[220px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-border bg-muted/40 px-2 py-3 md:flex"
    >
      <div className="mono px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {t("filterHeading")}
      </div>

      <RailItem
        icon={Layers}
        label={tScope("all")}
        count={totalCount}
        active={value === "all"}
        onClick={() => onChange("all")}
      />

      <div className="my-1 h-px shrink-0 bg-border" />

      {allowed.map((entity) => {
        const count = countsByEntity[entity];
        return (
          <RailItem
            key={entity}
            icon={ENTITY_ICON[entity]}
            label={tScope(entity)}
            count={count}
            active={value === entity}
            onClick={() => onChange(entity)}
          />
        );
      })}
    </nav>
  );
}

function RailItem({
  icon: Icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  /** undefined → count not yet loaded; show "—" placeholder. */
  count: number | undefined;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "group flex h-9 w-full shrink-0 cursor-pointer items-center gap-3 rounded-sm border-l-2 px-2.5 text-left text-sm transition-colors",
        active
          ? "border-copper bg-copper/10 text-copper"
          : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active ? "text-copper" : "text-muted-foreground group-hover:text-foreground",
        )}
      />
      <span className="flex-1 truncate">{label}</span>
      <span
        className={cn(
          "mono shrink-0 text-[10px] tabular-nums tracking-[0.04em]",
          count === undefined || count === 0
            ? "text-muted-foreground/40"
            : active
              ? "text-copper"
              : "text-muted-foreground",
        )}
      >
        {count === undefined ? "—" : formatCount(count)}
      </span>
    </button>
  );
}

/**
 * Compact thousands separator for the rail badges. Property catalogs can
 * easily exceed 1k — "1.2k" reads better than "1234" in a 26px-wide slot.
 */
function formatCount(n: number): string {
  if (n < 1_000) return String(n);
  if (n < 10_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  if (n < 1_000_000) return `${Math.round(n / 1_000)}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}
