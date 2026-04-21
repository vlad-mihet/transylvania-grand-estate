"use client";

import { Command } from "cmdk";
import {
  ArrowRight,
  Building2,
  FileText,
  HardHat,
  Inbox,
  Landmark,
  Map,
  MapPin,
  MessageSquare,
  ShieldAlert,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { Route } from "next";
import { Skeleton } from "@tge/ui";
import type {
  SearchEntityType,
  SearchGroup,
  SearchResponse,
  SearchResultItem,
} from "@tge/types/schemas/search";

const ENTITY_ORDER: readonly SearchEntityType[] = [
  "property",
  "agent",
  "developer",
  "city",
  "county",
  "article",
  "inquiry",
  "testimonial",
  "bankRate",
  "user",
];

const ENTITY_ICON: Record<SearchEntityType, LucideIcon> = {
  property: Building2,
  agent: UserCircle,
  developer: HardHat,
  city: MapPin,
  county: Map,
  article: FileText,
  inquiry: Inbox,
  testimonial: MessageSquare,
  bankRate: Landmark,
  user: Users,
};

const ENTITY_I18N: Record<SearchEntityType, string> = {
  property: "groupProperty",
  agent: "groupAgent",
  developer: "groupDeveloper",
  city: "groupCity",
  county: "groupCounty",
  article: "groupArticle",
  inquiry: "groupInquiry",
  testimonial: "groupTestimonial",
  bankRate: "groupBankRate",
  user: "groupUser",
};

/**
 * Per-entity list-page path. "Show all" jumps here with `?q=<query>`,
 * which `useResourceList` (all list pages go through it) picks up as the
 * initial search term. Counties doesn't have a search-enabled list yet but
 * the query string is harmless if the page ignores it.
 */
const ENTITY_LIST_ROUTE: Record<SearchEntityType, string> = {
  property: "/properties",
  agent: "/agents",
  developer: "/developers",
  city: "/cities",
  county: "/counties",
  article: "/articles",
  inquiry: "/inquiries",
  testimonial: "/testimonials",
  bankRate: "/bank-rates",
  user: "/users",
};

interface Props {
  query: string;
  data: SearchResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  onSelect: (item: SearchResultItem) => void;
  onDismiss: () => void;
}

export function GlobalSearchPopover({
  query,
  data,
  isLoading,
  isError,
  onSelect,
  onDismiss,
}: Props) {
  const t = useTranslations("GlobalSearch");
  const router = useRouter();
  const hasQuery = query.trim().length > 0;
  const groups = data?.groups ?? [];
  const resultCount = groups.reduce((sum, g) => sum + g.items.length, 0);

  const orderedGroups = [...groups].sort(
    (a, b) => ENTITY_ORDER.indexOf(a.entity) - ENTITY_ORDER.indexOf(b.entity),
  );

  const goShowAll = (group: SearchGroup) => {
    onDismiss();
    const path = `${ENTITY_LIST_ROUTE[group.entity]}?q=${encodeURIComponent(query)}`;
    router.push(path as Route);
  };

  return (
    <Command
      shouldFilter={false}
      label="Global search"
      loop
      className="overflow-hidden rounded-md border border-border bg-popover shadow-xl"
    >
      {/* Hidden input — the real input lives in the header. cmdk needs an
          input to own focus/key events, but we feed the query in manually. */}
      <Command.Input
        value={query}
        onValueChange={() => {}}
        className="sr-only"
        tabIndex={-1}
      />

      {/* aria-live announcement for screen-readers. Only fires on a
          committed (non-loading) state so we don't narrate every keystroke. */}
      <div className="sr-only" role="status" aria-live="polite">
        {hasQuery && !isLoading && !isError
          ? t("resultsAnnouncement", { count: resultCount })
          : ""}
      </div>

      <Command.List className="max-h-[60vh] overflow-y-auto p-1.5">
        {!hasQuery && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            {t("shortcutHint")}
          </div>
        )}

        {hasQuery && isLoading && <LoadingSkeleton />}

        {hasQuery && isError && (
          <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-destructive">
            <ShieldAlert className="h-4 w-4" />
            <span>{t("error")}</span>
          </div>
        )}

        {hasQuery && !isLoading && !isError && orderedGroups.length === 0 && (
          <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
            {t("empty", { query })}
          </Command.Empty>
        )}

        {orderedGroups.map((group) => {
          const Icon = ENTITY_ICON[group.entity];
          const heading = t(ENTITY_I18N[group.entity]);
          return (
            <Command.Group
              key={group.entity}
              heading={heading}
              className="[&_[cmdk-group-heading]]:mono [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {group.items.map((item) => (
                <Command.Item
                  key={`${item.entity}:${item.id}`}
                  value={`${item.entity} ${item.id} ${item.title} ${item.subtitle ?? ""}`}
                  onSelect={() => onSelect(item)}
                  className="group flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground transition-colors aria-selected:bg-muted"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground group-aria-selected:text-copper" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {item.title}
                    </span>
                    {item.subtitle && (
                      <span className="truncate text-[11px] text-muted-foreground">
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                  {item.badge && (
                    <span className="mono shrink-0 rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
                      {item.badge}
                    </span>
                  )}
                </Command.Item>
              ))}

              {group.hasMore && (
                <Command.Item
                  key={`${group.entity}:__show-all`}
                  value={`${group.entity}-show-all`}
                  onSelect={() => goShowAll(group)}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-[11px] text-muted-foreground transition-colors aria-selected:bg-muted aria-selected:text-foreground"
                >
                  <span>{t("showAll", { group: heading })}</span>
                  <ArrowRight className="h-3 w-3" />
                </Command.Item>
              )}
            </Command.Group>
          );
        })}

        {hasQuery && !isLoading && !isError && orderedGroups.length > 0 && (
          <div className="mt-1.5 flex items-center justify-between border-t border-border px-2 pt-1.5 text-[10px] text-muted-foreground">
            <span className="mono uppercase tracking-[0.08em]">
              {t("footerEnterHint")}
            </span>
            <span className="mono uppercase tracking-[0.08em]">
              {t("footerEscHint")}
            </span>
          </div>
        )}
      </Command.List>
    </Command>
  );
}

function LoadingSkeleton() {
  // Three rows approximating a typical result. Using Skeleton (bundled in
  // @tge/ui) keeps styling consistent with the rest of the admin.
  return (
    <div className="space-y-2 p-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-2 px-1 py-1.5">
          <Skeleton className="h-4 w-4 rounded-sm" />
          <div className="flex flex-1 flex-col gap-1">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
