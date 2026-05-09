"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { Globe, ChevronDown } from "lucide-react";
import { locales, localeAutonyms, type Locale } from "@tge/i18n";
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

export interface LanguageSwitcherProps {
  /** App's typed `useRouter` from its `@/i18n/navigation` (or
   *  `@tge/i18n/navigation` for landing). Required so dynamic-route params
   *  and per-locale pathname rewrites resolve correctly across locales. */
  useRouter: () => LocaleSwitcherRouter;
  /** App's typed `usePathname`. */
  usePathname: () => string;
  /** "default" — Globe + autonym + chevron (header-grade).
   *  "compact" — Globe + 2-letter code (utility bars / auth footers). */
  variant?: "default" | "compact";
  /** Where the dropdown anchors relative to the trigger. */
  align?: "start" | "center" | "end";
  /** Side-effect fired before navigation (e.g. academy persists locale to
   *  AcademyUser). Fire-and-forget — return value is ignored. */
  onLocaleChange?: (next: Locale) => void;
  /** Localized "Language" string. Used as the trigger's `aria-label` and the
   *  dropdown header. Defaults to "Language" when omitted. */
  label?: string;
  /** Class on the trigger button. */
  className?: string;
  /** Class on the dropdown content (the popover). */
  contentClassName?: string;
}

/**
 * Platform-wide locale picker. Renders a single dropdown trigger that opens
 * to a list of autonyms (each language in its own language) with radio-group
 * semantics — so a user stuck in the wrong locale can recognise their target
 * without translating the menu first.
 *
 * Each app wires its app-local `useRouter`/`usePathname` so dynamic routes
 * and per-locale pathname rewrites (e.g. revery's `/instrumente` ↔ `/tools`)
 * resolve correctly. Theming inherits from the host via `--popover`,
 * `--foreground`, `--muted-foreground`, `--accent`, `--accent-foreground` —
 * no hardcoded brand colors.
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
  label = "Language",
  className,
  contentClassName,
}: LanguageSwitcherProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();

  const handleChange = (value: string) => {
    const next = value as Locale;
    if (next === locale) return;
    startTransition(() => {
      onLocaleChange?.(next);
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
  };

  const triggerLabel =
    variant === "compact" ? locale.toUpperCase() : localeAutonyms[locale];

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
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
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className={cn("min-w-[160px]", contentClassName)}
      >
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={locale} onValueChange={handleChange}>
          {locales.map((code) => (
            <DropdownMenuRadioItem
              key={code}
              value={code}
              className="cursor-pointer"
            >
              {localeAutonyms[code]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
