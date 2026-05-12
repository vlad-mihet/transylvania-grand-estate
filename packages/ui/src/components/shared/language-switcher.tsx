"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { Globe, ChevronDown } from "lucide-react";
import {
  locales,
  localeAutonyms,
  type Locale,
  LOCALE_COOKIE_NAME,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
} from "@tge/i18n";
import { cn } from "@tge/utils";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

// next-intl's typed router has a different `pathnames` shape per app, so the
// component's prop accepts the shared `replace` signature with `any` for the
// href payload. Each app's typed `useRouter` is structurally compatible.
type LocaleSwitcherRouter = {
  replace: (
    href: any,
    options: { locale: string; scroll?: boolean },
  ) => void;
};

export interface RenderTriggerArgs {
  /** Currently active locale. */
  locale: Locale;
  /** Localised "Language" label, used for accessibility annotations. */
  label: string;
  /** Native-name autonym of the active locale ("Română"). */
  autonym: string;
  /** True while a locale-change transition is in flight. */
  isPending: boolean;
}

export interface RenderPanelArgs {
  /** Localised "Language" label — typically rendered as a header. */
  label: string;
  /** Currently active locale. */
  locale: Locale;
  /**
   * Pre-rendered `DropdownMenuRadioGroup` containing one entry per
   * supported locale. Drop it into your custom panel layout where you
   * want the list to appear.
   */
  items: ReactNode;
}

export interface LanguageSwitcherProps {
  /** App's typed `useRouter` from its `@/i18n/navigation` (or
   *  `@tge/i18n/navigation` for landing). Required so dynamic-route params
   *  and per-locale pathname rewrites resolve correctly across locales. */
  useRouter: () => LocaleSwitcherRouter;
  /** App's typed `usePathname`. */
  usePathname: () => string;
  /** "default" — Globe + autonym + chevron (header-grade).
   *  "compact" — Globe + 2-letter code (utility bars / auth footers).
   *  When `renderTrigger` is supplied, this is ignored. */
  variant?: "default" | "compact";
  /** Where the dropdown anchors relative to the trigger. */
  align?: "start" | "center" | "end";
  /** Side-effect fired before navigation (e.g. academy persists locale to
   *  AcademyUser). Fire-and-forget — return value is ignored. The cookie
   *  write is handled separately via `persistCookie`. */
  onLocaleChange?: (next: Locale) => void;
  /**
   * Whether to write the `NEXT_LOCALE` cookie on switch. Default `true`.
   * The cookie is what middleware reads on unprefixed-path redirects to
   * route returning users to their preferred locale.
   */
  persistCookie?: boolean;
  /**
   * Fires when the React transition state flips. Used by hosts that show
   * an overlay during navigation (landing's GlobalLoader). Called with
   * `true` immediately after click; `false` after the transition resolves.
   */
  onPending?: (isPending: boolean) => void;
  /** Localized "Language" string. Used as the trigger's `aria-label` and
   *  the dropdown header. Defaults to "Language" when omitted. */
  label?: string;
  /** Class on the trigger button (default trigger only). */
  className?: string;
  /** Class on the dropdown content (the popover). */
  contentClassName?: string;
  /** Full trigger render escape-hatch. Receives the active locale + busy
   *  state; you render whatever you want. Wrapped in
   *  `<DropdownMenuTrigger asChild>` so radix forwards refs/state. */
  renderTrigger?: (args: RenderTriggerArgs) => ReactNode;
  /** Custom per-item rendering. Wrapped in `DropdownMenuRadioItem`. */
  renderItem?: (locale: Locale, isActive: boolean) => ReactNode;
  /** Full panel-contents escape hatch. The default renders a
   *  `DropdownMenuLabel` + `DropdownMenuSeparator` + items; if you need a
   *  custom layout (extra hairline, brand padding, etc.), supply this. */
  renderPanel?: (args: RenderPanelArgs) => ReactNode;
}

/**
 * Platform-wide locale picker. Renders a single dropdown trigger that opens
 * to a list of autonyms (each language in its own language) with radio-group
 * semantics — so a user stuck in the wrong locale can recognise their
 * target without translating the menu first.
 *
 * Each app wires its app-local `useRouter`/`usePathname` so dynamic routes
 * and per-locale pathname rewrites (e.g. revery's `/instrumente` ↔ `/tools`)
 * resolve correctly.
 *
 * Render-prop slots (`renderTrigger`, `renderItem`, `renderPanel`) let
 * brand-themed hosts (landing's copper switcher) absorb back into this
 * component rather than forking it. Use them only when CSS-variable theming
 * isn't expressive enough.
 *
 * Query-string preservation reads `window.location.search` at click time
 * rather than via `useSearchParams()` so the picker can render in
 * statically-prerendered headers without forcing the route to deopt — and
 * without needing a `<Suspense>` boundary in every host layout.
 */
export function LanguageSwitcher({
  useRouter,
  usePathname,
  variant = "default",
  align = "end",
  onLocaleChange,
  persistCookie = true,
  onPending,
  label = "Language",
  className,
  contentClassName,
  renderTrigger,
  renderItem,
  renderPanel,
}: LanguageSwitcherProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();
  const [announcement, setAnnouncement] = useState("");
  const lastAnnouncedLocale = useRef<Locale>(locale);

  // Surface transition state to the host (landing uses this to drive its
  // GlobalLoader). Effect rather than inline so consumers see the React-
  // committed state, not the speculative pre-transition value.
  useEffect(() => {
    onPending?.(isPending);
  }, [isPending, onPending]);

  const handleChange = (value: string) => {
    const next = value as Locale;
    if (next === locale) return;

    if (persistCookie && typeof document !== "undefined") {
      // The same name the server middleware reads on unprefixed-path
      // redirects. SameSite=Lax matches the middleware-side cookie so a
      // server-set and client-set value are interchangeable.
      document.cookie =
        `${LOCALE_COOKIE_NAME}=${next}` +
        `; path=/` +
        `; max-age=${LOCALE_COOKIE_MAX_AGE_SECONDS}` +
        `; samesite=lax`;
    }

    onLocaleChange?.(next);

    startTransition(() => {
      // Read the live query at click time instead of subscribing via
      // `useSearchParams()` — avoids forcing the host route off the static
      // prerender path. `window` is always defined here because the handler
      // only runs on user interaction.
      const query =
        typeof window !== "undefined"
          ? Object.fromEntries(
              new URLSearchParams(window.location.search).entries(),
            )
          : {};
      router.replace(
        { pathname, params, query },
        { locale: next, scroll: false },
      );
    });

    // Announce to assistive tech. The autonym in the user's *new* locale
    // — they're about to see that language, so the announcement reads
    // naturally to a screen reader once the transition lands.
    if (lastAnnouncedLocale.current !== next) {
      setAnnouncement(`${label}: ${localeAutonyms[next]}`);
      lastAnnouncedLocale.current = next;
    }
  };

  const triggerLabel =
    variant === "compact" ? locale.toUpperCase() : localeAutonyms[locale];

  const items = (
    <DropdownMenuRadioGroup value={locale} onValueChange={handleChange}>
      {locales.map((code) => {
        const isActive = code === locale;
        return (
          <DropdownMenuRadioItem
            key={code}
            value={code}
            className="cursor-pointer"
          >
            {renderItem
              ? renderItem(code, isActive)
              : localeAutonyms[code]}
          </DropdownMenuRadioItem>
        );
      })}
    </DropdownMenuRadioGroup>
  );

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          {renderTrigger ? (
            renderTrigger({
              locale,
              label,
              autonym: localeAutonyms[locale],
              isPending,
            })
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={label}
              aria-busy={isPending || undefined}
              data-pending={isPending || undefined}
              className={cn(
                "gap-1.5 transition-opacity",
                variant === "compact"
                  ? "h-7 px-1.5 text-[11px] uppercase tracking-wider"
                  : "h-8 px-2 text-sm",
                isPending && "opacity-70",
                className,
              )}
            >
              <Globe
                className={variant === "compact" ? "h-3.5 w-3.5" : "h-4 w-4"}
                aria-hidden="true"
              />
              <span className="font-medium">{triggerLabel}</span>
              {variant === "default" ? (
                <ChevronDown
                  className="h-3.5 w-3.5 opacity-60"
                  aria-hidden="true"
                />
              ) : null}
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={align}
          className={cn("min-w-[160px]", contentClassName)}
        >
          {renderPanel ? (
            renderPanel({ label, locale, items })
          ) : (
            <>
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                {label}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {items}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Visually-hidden live region. Announces "Language: Français" to
          assistive tech after the user picks a new locale — gives the same
          confirmation sighted users get from the URL change. */}
      <span
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {announcement}
      </span>
    </>
  );
}
