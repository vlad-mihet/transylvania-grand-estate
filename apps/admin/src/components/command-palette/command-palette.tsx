"use client";

import { Command } from "cmdk";
import {
  ArrowRight,
  Building2,
  FileText,
  HardHat,
  Inbox,
  Landmark,
  Loader2,
  Map as MapIcon,
  MapPin,
  MessageSquare,
  Search,
  ShieldAlert,
  UserCircle,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { usePermissions } from "@/components/auth/auth-provider";
import { useRouter } from "@/i18n/navigation";
import type { Route } from "next";
import { isPathAllowedForAgent } from "@/lib/agent-paths";
import {
  COMMAND_ACTIONS,
  type CommandAction,
  type CommandGroup,
} from "@/components/command-palette/actions";
import {
  DynamicActionsProvider,
  useDynamicActions,
} from "@/components/command-palette/dynamic-actions-context";
import { cn } from "@tge/utils";
import type {
  RecentSearchItem,
  SearchEntityType,
  SearchResultItem,
} from "@tge/types/schemas/search";
import { ROLE_ENTITY_SCOPE } from "./role-scope";
import { PaletteRail } from "./palette-rail";
import { ScopeChips, type ScopeValue } from "./scope-chips";
import { ResultRow } from "./result-row";
import { TopResultRow } from "./top-result-row";
import { useEntityCounts } from "./use-entity-counts";
import { useGlobalSearch } from "./use-global-search";
import {
  useRecordSearchHistory,
  useRemoveSearchHistory,
  useSearchHistory,
} from "./use-search-history";

interface PaletteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo<PaletteContextValue>(
    () => ({
      open,
      setOpen,
      toggle: () => setOpen((v) => !v),
    }),
    [open],
  );
  return (
    <PaletteContext.Provider value={value}>
      <DynamicActionsProvider>
        {children}
        <CommandPalette />
      </DynamicActionsProvider>
    </PaletteContext.Provider>
  );
}

export function useCommandPalette(): PaletteContextValue {
  const ctx = useContext(PaletteContext);
  if (!ctx)
    throw new Error("useCommandPalette must be used inside CommandPaletteProvider");
  return ctx;
}

const COMMAND_GROUP_ORDER: CommandGroup[] = [
  "context",
  "navigate",
  "create",
  "finance",
  "system",
];

const ENTITY_ORDER: readonly SearchEntityType[] = [
  "property",
  "agent",
  "city",
  "developer",
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
  county: MapIcon,
  article: FileText,
  inquiry: Inbox,
  testimonial: MessageSquare,
  bankRate: Landmark,
  user: Users,
};

/** Map a `SearchEntityType` to the list page where "Show all" jumps to. */
const ENTITY_LIST_ROUTE: Record<SearchEntityType, string> = {
  property: "/properties",
  agent: "/people/agents",
  developer: "/developers",
  city: "/cities",
  county: "/counties",
  article: "/articles",
  inquiry: "/inquiries",
  testimonial: "/testimonials",
  bankRate: "/bank-rates",
  user: "/people/team",
};

const SCOPE_STORAGE_KEY = "tge-admin-search-scope";

/** Local-fuzzy filter for command actions — simple substring over label + keywords. */
function commandMatches(action: CommandAction, label: string, query: string): boolean {
  if (!query) return true;
  const haystack = [label, ...(action.keywords ?? [])].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const router = useRouter();
  const { can, role } = usePermissions();
  const t = useTranslations("CommandPalette");

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<ScopeValue>("all");

  // Restore the user's most-recent scope across sessions so they don't have
  // to re-pick it every time. Guarded against SSR (window unavailable) — the
  // standard "hydrate post-mount" pattern; the initial render is "all", then
  // we sync from localStorage on first effect tick.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(SCOPE_STORAGE_KEY);
    if (stored === "all" || isSearchEntityType(stored)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration
      setScope(stored);
    }
  }, []);

  const allowedScopes = useMemo<readonly SearchEntityType[]>(() => {
    if (!role) return [];
    return ROLE_ENTITY_SCOPE[role] ?? [];
  }, [role]);

  // Effective scope = user intent clamped to what the current role permits.
  // Computed at render time (no extra state) so a role demotion takes effect
  // immediately without an effect roundtrip.
  const effectiveScope: ScopeValue =
    scope === "all" || allowedScopes.includes(scope) ? scope : "all";

  const handleScopeChange = useCallback((next: ScopeValue) => {
    setScope(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SCOPE_STORAGE_KEY, next);
    }
  }, []);

  // Close handler: reset transient query state so the next open starts clean.
  // Wrapping setOpen here keeps the effect-vs-event-handler boundary tidy —
  // closing is a user event, not a synchronization concern.
  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setQuery("");
  }, [setOpen]);

  const dynamic = useDynamicActions();
  const actions = useMemo<CommandAction[]>(() => {
    return [...COMMAND_ACTIONS, ...dynamic].filter((a) => {
      if (a.requires && !can(a.requires)) return false;
      if (role === "AGENT" && !isPathAllowedForAgent(a.href)) return false;
      return true;
    });
  }, [can, role, dynamic]);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length >= 2;

  const filteredActions = useMemo(() => {
    if (!hasQuery) return [];
    return actions.filter((a) => {
      const label = a.label ?? t(`actions.${a.id}`);
      return commandMatches(a, label, trimmedQuery);
    });
  }, [actions, hasQuery, trimmedQuery, t]);

  const groupedCommands = useMemo(() => {
    const map = new Map<CommandGroup, CommandAction[]>();
    for (const a of filteredActions) {
      const list = map.get(a.group) ?? [];
      list.push(a);
      map.set(a.group, list);
    }
    return COMMAND_GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({
      group: g,
      items: map.get(g)!,
    }));
  }, [filteredActions]);

  const quickActions = useMemo(() => {
    // Top-5 navigate/create actions for the empty state. We bias toward
    // capabilities the role actually has (the registry is already
    // permission-filtered above).
    return actions
      .filter((a) => a.group === "navigate" || a.group === "create")
      .slice(0, 5);
  }, [actions]);

  const { data: searchData, isLoading, isError } = useGlobalSearch(
    trimmedQuery,
    effectiveScope,
  );
  const { data: recents = [] } = useSearchHistory(6);
  const recordHistory = useRecordSearchHistory();
  const removeHistory = useRemoveSearchHistory();

  const goTo = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href as Route);
    },
    [router, setOpen],
  );

  const handleSelectAction = useCallback(
    (action: CommandAction) => goTo(action.href),
    [goTo],
  );

  const handleSelectEntity = useCallback(
    (item: SearchResultItem) => {
      recordHistory.mutate({
        entity: item.entity,
        entityId: item.id,
        title: item.title,
        subtitle: item.subtitle,
        href: item.href,
        imageUrl: item.imageUrl ?? null,
        badge: item.badge ?? null,
      });
      goTo(item.href);
    },
    [goTo, recordHistory],
  );

  const handleSelectRecent = useCallback(
    (item: RecentSearchItem) => {
      // Bump `selectedAt` on re-pick so most-recently-used stays accurate.
      recordHistory.mutate({
        entity: item.entity,
        entityId: item.entityId,
        title: item.title,
        subtitle: item.subtitle,
        href: item.href,
        imageUrl: item.imageUrl,
        badge: item.badge,
      });
      goTo(item.href);
    },
    [goTo, recordHistory],
  );

  const goShowAll = (entity: SearchEntityType) => {
    setOpen(false);
    const path = `${ENTITY_LIST_ROUTE[entity]}?q=${encodeURIComponent(trimmedQuery)}`;
    router.push(path as Route);
  };

  const orderedGroups = useMemo(() => {
    const groups = searchData?.groups ?? [];
    return [...groups].sort(
      (a, b) => ENTITY_ORDER.indexOf(a.entity) - ENTITY_ORDER.indexOf(b.entity),
    );
  }, [searchData]);

  // The API only fills `topResult` when scope="all" + ≥2 groups + score≥3.
  // The frontend trusts that gate and just renders whatever the API sent.
  const topResult = searchData?.topResult ?? null;
  const topResultKey = topResult ? `${topResult.entity}:${topResult.id}` : null;

  /**
   * The rail always shows counts — but the source switches based on whether
   * the user is actively searching:
   *   • No query: total entity inventory ("how many properties exist at all")
   *     from `/search/counts`, cached for 5min.
   *   • Active query: per-entity search-result totals from the current
   *     `/search` response — reflects "how many match what I typed".
   *
   * Either way the rail just receives a `countsByEntity` map plus a
   * `totalCount` for the "All" badge; the switching is invisible to it.
   */
  const {
    countsByEntity: inventoryCountsByEntity,
    totalCount: inventoryTotalCount,
  } = useEntityCounts(open);

  const searchCountsByEntity = useMemo(() => {
    const counts: Partial<Record<SearchEntityType, number>> = {};
    for (const g of orderedGroups) counts[g.entity] = g.total;
    return counts;
  }, [orderedGroups]);

  const searchTotalCount = useMemo(
    () => orderedGroups.reduce((sum, g) => sum + g.total, 0),
    [orderedGroups],
  );

  const countsByEntity = hasQuery ? searchCountsByEntity : inventoryCountsByEntity;
  const totalCount = hasQuery ? searchTotalCount : inventoryTotalCount;

  const totalResultCount = orderedGroups.reduce(
    (sum, g) => sum + g.items.length,
    0,
  );

  return (
    <Command.Dialog
      open={open}
      onOpenChange={handleOpenChange}
      label="Command palette"
      shouldFilter={false}
      loop
      className={cn(
        // Anchored under the sticky header (h-12 = 48px) with an 8px gap so
        // the modal reads as a workbench drawer from the search trigger.
        // Horizontal nudge of +120px on lg+ accounts for the 240px sidebar
        // (`lg:pl-60` in the dashboard layout) — without it the modal sits
        // centered in the viewport, 120px left of the trigger.
        //
        // The shell is a flex column: input row → middle two-pane → footer.
        // The middle uses a grid so the rail and result list share the same
        // top alignment under the input.
        "fixed top-14 z-50 flex h-[min(82vh,640px)] w-[min(94vw,920px)] flex-col left-1/2 lg:left-[calc(50%+120px)] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35)]",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2",
      )}
      // Subtle dim — let the page bleed through so the palette feels like an
      // overlay, not a curtain. `bg-foreground/[0.08]` works in both light
      // and dark themes (foreground inverts with the theme).
      overlayClassName="fixed inset-0 z-40 bg-foreground/[0.08] backdrop-blur-[1.5px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
    >
      {/* ── Input row (full width, above the two-pane area) ────────── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder={t("searchPlaceholder")}
          className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {(isLoading && hasQuery) ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {/* ── Mobile-only scope chips (below md, above results) ───────── */}
      {hasQuery && allowedScopes.length > 0 && (
        <div className="md:hidden">
          <ScopeChips
            allowed={allowedScopes}
            value={effectiveScope}
            onChange={handleScopeChange}
          />
        </div>
      )}

      {/* ── Two-pane middle: rail + results ─────────────────────────── */}
      <div className="flex min-h-0 flex-1">
        <PaletteRail
          allowed={allowedScopes}
          value={effectiveScope}
          onChange={handleScopeChange}
          countsByEntity={countsByEntity}
          totalCount={totalCount}
        />

        <div className="flex min-h-0 flex-1 flex-col">
          {/* aria-live region for screen-readers. */}
          <div className="sr-only" role="status" aria-live="polite">
            {hasQuery && !isLoading && !isError
              ? t("resultsAnnouncement", { count: totalResultCount })
              : ""}
          </div>

          <Command.List className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {/* ─── Empty state ───────────────────────────────────────── */}
            {!hasQuery && (
              <>
                {recents.length > 0 && (
                  <Command.Group
                    heading={t("recentHeading")}
                    className="[&_[cmdk-group-heading]]:mono [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-foreground"
                  >
                    {recents.map((item) => {
                      const Icon = ENTITY_ICON[item.entity];
                      return (
                        <Command.Item
                          key={item.id}
                          value={`recent:${item.id}`}
                          onSelect={() => handleSelectRecent(item)}
                          className="group flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm text-foreground transition-colors aria-selected:bg-muted"
                        >
                          <ResultRow
                            icon={Icon}
                            imageUrl={item.imageUrl}
                            title={item.title}
                            subtitle={item.subtitle}
                            badge={item.badge}
                            meta={relativeTimeShort(item.selectedAt)}
                            trailingAction={
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeHistory.mutate(item.id);
                                }}
                                aria-label={t("removeFromRecent")}
                                className="rounded-sm p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            }
                          />
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                )}

                {quickActions.length > 0 && (
                  <Command.Group
                    heading={t("quickActionsHeading")}
                    className="[&_[cmdk-group-heading]]:mono [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-foreground"
                  >
                    {quickActions.map((action) => {
                      const label = action.label ?? t(`actions.${action.id}`);
                      const Icon = action.icon;
                      return (
                        <Command.Item
                          key={action.id}
                          value={`action:${action.id}`}
                          onSelect={() => handleSelectAction(action)}
                          className="group flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground transition-colors aria-selected:bg-muted"
                        >
                          <Icon className="h-4 w-4 text-muted-foreground group-aria-selected:text-copper" />
                          <span className="flex-1 truncate">{label}</span>
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                )}

                <div className="mt-2 border-t border-border px-3 py-3 text-[11px] text-muted-foreground">
                  <span className="mono mr-2 uppercase tracking-[0.08em] text-muted-foreground/70">
                    {t("tipPrefix")}
                  </span>
                  {t("tip")}
                </div>
              </>
            )}

            {/* ─── Live state ────────────────────────────────────────── */}
            {hasQuery && (
              <>
                {/* Top result: a single elevated lead row when the API
                    decided the query has a clear cross-entity winner. */}
                {topResult && (
                  <Command.Group
                    heading={t("topResultHeading")}
                    className="[&_[cmdk-group-heading]]:mono [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-copper"
                  >
                    <Command.Item
                      key={`top:${topResultKey}`}
                      value={`top:${topResultKey}`}
                      onSelect={() => handleSelectEntity(topResult)}
                      className="group flex cursor-pointer rounded-sm transition-colors aria-selected:bg-copper/10"
                    >
                      <TopResultRow
                        icon={ENTITY_ICON[topResult.entity]}
                        imageUrl={topResult.imageUrl}
                        title={topResult.title}
                        subtitle={topResult.subtitle}
                        badge={topResult.badge}
                      />
                    </Command.Item>
                  </Command.Group>
                )}

                {/* Local-filtered commands */}
                {groupedCommands.map(({ group, items }) => (
                  <Command.Group
                    key={`cmd-${group}`}
                    heading={t(`groups.${group}`)}
                    className="[&_[cmdk-group-heading]]:mono [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-foreground"
                  >
                    {items.map((action) => {
                      const label = action.label ?? t(`actions.${action.id}`);
                      const Icon = action.icon;
                      return (
                        <Command.Item
                          key={action.id}
                          value={`action:${action.id}`}
                          onSelect={() => handleSelectAction(action)}
                          className="group flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground transition-colors aria-selected:bg-muted"
                        >
                          <Icon className="h-4 w-4 text-muted-foreground group-aria-selected:text-copper" />
                          <span className="flex-1 truncate">{label}</span>
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                ))}

                {/* Server-filtered entities */}
                {isError && (
                  <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <span>{t("error")}</span>
                  </div>
                )}

                {!isError &&
                  orderedGroups.map((group) => {
                    const Icon = ENTITY_ICON[group.entity];
                    const heading = t(`groups.entity.${group.entity}`);
                    // Filter out the top-result item from its owning group so
                    // we don't render it twice. Stable per group identity.
                    const items = group.items.filter(
                      (item) =>
                        topResultKey !== `${item.entity}:${item.id}`,
                    );
                    if (items.length === 0) return null;
                    const shown = items.length;
                    const hasMore = group.total > shown;
                    return (
                      <Command.Group
                        key={`entity-${group.entity}`}
                        heading={`${heading} (${shown}/${group.total})`}
                        className="[&_[cmdk-group-heading]]:mono [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-foreground"
                      >
                        {items.map((item) => (
                          <Command.Item
                            key={`${item.entity}:${item.id}`}
                            value={`${item.entity}:${item.id}`}
                            onSelect={() => handleSelectEntity(item)}
                            className="group flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm text-foreground transition-colors aria-selected:bg-muted"
                          >
                            <ResultRow
                              icon={Icon}
                              imageUrl={item.imageUrl}
                              title={item.title}
                              subtitle={item.subtitle}
                              badge={item.badge}
                            />
                          </Command.Item>
                        ))}
                        {hasMore && (
                          <Command.Item
                            key={`${group.entity}:__show-all`}
                            value={`show-all:${group.entity}`}
                            onSelect={() => goShowAll(group.entity)}
                            className="flex cursor-pointer items-center justify-between gap-2 rounded-sm px-3 py-1.5 text-[11px] text-muted-foreground transition-colors aria-selected:bg-muted aria-selected:text-foreground"
                          >
                            <span>{t("showAll", { group: heading })}</span>
                            <ArrowRight className="h-3 w-3" />
                          </Command.Item>
                        )}
                      </Command.Group>
                    );
                  })}

                {!isError && !isLoading && orderedGroups.length === 0 &&
                  filteredActions.length === 0 && (
                    <Command.Empty className="flex flex-col items-center gap-2 px-3 py-10 text-center text-sm text-muted-foreground">
                      {effectiveScope !== "all" ? (
                        <>
                          <span>
                            {t("noScopeResults", {
                              group: t(`groups.entity.${effectiveScope}`),
                              query: trimmedQuery,
                            })}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleScopeChange("all")}
                            className="mono rounded-sm border border-border bg-background px-2 py-0.5 text-[10px] uppercase tracking-[0.06em] text-foreground hover:bg-muted"
                          >
                            {t("searchAllCategories")}
                          </button>
                        </>
                      ) : (
                        <span>{t("empty", { query: trimmedQuery })}</span>
                      )}
                    </Command.Empty>
                  )}
              </>
            )}
          </Command.List>
        </div>
      </div>

    </Command.Dialog>
  );
}

// ── helpers ──────────────────────────────────────────────────────

function isSearchEntityType(value: unknown): value is SearchEntityType {
  return (
    typeof value === "string" &&
    [
      "agent",
      "property",
      "developer",
      "city",
      "county",
      "bankRate",
      "testimonial",
      "article",
      "user",
      "inquiry",
    ].includes(value)
  );
}

/** Short, locale-neutral relative time for the Recent section. */
function relativeTimeShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "now";
  if (diff < 60 * 60_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 24 * 60 * 60_000) return `${Math.floor(diff / (60 * 60_000))}h`;
  if (diff < 30 * 24 * 60 * 60_000)
    return `${Math.floor(diff / (24 * 60 * 60_000))}d`;
  return `${Math.floor(diff / (30 * 24 * 60 * 60_000))}mo`;
}
