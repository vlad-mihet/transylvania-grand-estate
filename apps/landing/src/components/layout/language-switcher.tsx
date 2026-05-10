"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Globe, ChevronDown, Check } from "lucide-react";
import { usePathname, useRouter } from "@tge/i18n/navigation";
import { locales, localeAutonyms, type Locale } from "@tge/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@tge/ui";
import { cn } from "@tge/utils";
import { useLoader } from "@/components/loader/loader-context";

interface Props {
  /**
   * "bar" — desktop utility bar trigger (tiny, uppercase, copper-on-hover).
   *   Matches the contact links beside it: text-[11px] tracking-[0.1em],
   *   text-cream-muted hover:text-copper, ease-luxury transitions.
   *
   * "drawer" — mobile-nav sheet trigger (taller for touch, copper-bordered
   *   pill that reads like a real form control instead of a tiny utility link).
   */
  variant?: "bar" | "drawer";
}

/**
 * TGE-branded locale switcher. Forked from `@tge/ui`'s shared `LanguageSwitcher`
 * because the shared trigger renders as a generic ghost button — no copper
 * hover, no luxury easing, no uppercase tracking — which broke visual cohesion
 * with the rest of the dark/copper header.
 *
 * Same selection mechanics as the shared component (typed router, query
 * preservation read at click time to avoid a `useSearchParams()` deopt) — only
 * the chrome is different. Mirror the radix primitives directly so neither the
 * trigger nor the radio items pick up the shadcn ghost-button defaults.
 */
export function LanguageSwitcher({ variant = "bar" }: Props = {}) {
  const t = useTranslations("Navigation");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const { show } = useLoader();
  const label = t("language");

  const handleChange = (value: string) => {
    const next = value as Locale;
    if (next === locale) return;
    show();
    startTransition(() => {
      // Read live query at click time rather than via useSearchParams() so the
      // header can stay on the static prerender path — same trick the shared
      // component uses.
      const query =
        typeof window !== "undefined"
          ? Object.fromEntries(
              new URLSearchParams(window.location.search).entries(),
            )
          : {};
      router.replace(
        { pathname, query },
        { locale: next, scroll: false },
      );
    });
  };

  const isBar = variant === "bar";

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        type="button"
        aria-label={label}
        aria-busy={isPending || undefined}
        data-pending={isPending || undefined}
        className={cn(
          "group inline-flex items-center gap-1.5 cursor-pointer outline-none bg-transparent transition-colors duration-500 ease-luxury",
          "focus-visible:text-copper",
          isBar
            ? "h-7 px-1 text-[11px] uppercase tracking-[0.1em] font-medium text-cream-muted hover:text-copper data-[state=open]:text-copper"
            : "h-10 px-3 text-sm tracking-[0.04em] font-medium text-cream/80 border border-copper/15 rounded-md hover:text-cream hover:border-copper/40 data-[state=open]:text-cream data-[state=open]:border-copper/40",
          isPending && "opacity-70",
        )}
      >
        <Globe
          className={isBar ? "h-3 w-3" : "h-4 w-4"}
          aria-hidden="true"
        />
        <span>{localeAutonyms[locale]}</span>
        <ChevronDown
          className={cn(
            "transition-transform duration-500 ease-luxury opacity-60 group-data-[state=open]:rotate-180",
            isBar ? "h-3 w-3 ml-0.5" : "h-3.5 w-3.5 ml-1",
          )}
          aria-hidden="true"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={isBar ? 12 : 8}
        // Panel vocabulary mirrors `MegaMenu`: bg-background/98,
        // backdrop-blur-lg, copper/15 hairline, shadow-2xl. Plus the signature
        // copper-gradient hairline at the top to tie this popover to the
        // mega-menu visual family.
        className={cn(
          "min-w-[200px] p-0 overflow-hidden rounded-md",
          "bg-background/98 backdrop-blur-lg border border-copper/15 shadow-2xl",
        )}
      >
        <div className="h-px w-full bg-gradient-to-r from-transparent via-copper/30 to-transparent" />
        <div className="p-2">
          <div className="px-3 pt-2 pb-3 text-[11px] font-serif font-semibold uppercase tracking-[0.2em] text-copper/70">
            {label}
          </div>
          <DropdownMenuRadioGroup value={locale} onValueChange={handleChange}>
            {locales.map((code) => {
              const isActive = code === locale;
              return (
                <DropdownMenuRadioItem
                  key={code}
                  value={code}
                  // [&>span:first-child]:hidden collapses the built-in radio
                  // indicator slot so the row reads as a luxury menu line, not
                  // a form-radio. Active state is carried by copper text + a
                  // small copper Check on the right — matches MegaMenuLink's
                  // text vocabulary (text-[14px] text-cream/60 → text-cream).
                  className={cn(
                    "relative flex items-center justify-between gap-3 cursor-pointer rounded-sm",
                    "px-3 py-2 pl-3 text-[14px]",
                    "outline-none select-none",
                    "transition-colors duration-500 ease-luxury",
                    "[&>span:first-child]:hidden",
                    isActive
                      ? "text-copper"
                      : "text-cream/60 hover:text-cream focus:text-cream hover:bg-copper/5 focus:bg-copper/5",
                  )}
                >
                  <span>{localeAutonyms[code]}</span>
                  {isActive ? (
                    <Check className="h-3.5 w-3.5 text-copper" aria-hidden="true" />
                  ) : null}
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
