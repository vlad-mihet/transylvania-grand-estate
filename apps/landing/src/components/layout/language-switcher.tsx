"use client";

import { forwardRef } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, Globe } from "lucide-react";
import { LanguageSwitcher as BaseLanguageSwitcher } from "@tge/ui";
import { localeAutonyms, type Locale } from "@tge/i18n";
import { usePathname, useRouter } from "@tge/i18n/navigation";
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
 * TGE-branded locale switcher. Thin adapter over `@tge/ui`'s shared
 * `LanguageSwitcher`, supplying copper-themed `renderTrigger` and
 * `renderPanel` slots so the same component powers admin/academy/revery
 * (shadcn defaults) AND landing's dark/copper luxury chrome — no fork.
 *
 * The shared component handles query preservation, transition state,
 * cookie persistence, and the screen-reader live region; we only override
 * the visual markup.
 */
export function LanguageSwitcher({ variant = "bar" }: Props = {}) {
  const t = useTranslations("Navigation");
  const { show } = useLoader();
  const isBar = variant === "bar";

  return (
    <BaseLanguageSwitcher
      useRouter={useRouter}
      usePathname={usePathname}
      label={t("language")}
      onPending={(isPending) => {
        // Drive the luxury full-screen loader for the duration of the
        // locale transition. The loader auto-hides on the next pathname
        // change (see loader-context); we only need the show() trigger.
        if (isPending) show();
      }}
      renderTrigger={({ locale, label, autonym, isPending }) => (
        <CopperTrigger
          locale={locale}
          label={label}
          autonym={autonym}
          isPending={isPending}
          isBar={isBar}
        />
      )}
      renderPanel={({ label, items }) => (
        <>
          {/* Signature copper-gradient hairline. Ties this popover to the
              MegaMenu visual family (same hairline appears there). */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-copper/30 to-transparent" />
          <div className="p-2">
            <div className="px-3 pt-2 pb-3 text-[11px] font-serif font-semibold uppercase tracking-[0.2em] text-copper/70">
              {label}
            </div>
            {items}
          </div>
        </>
      )}
      renderItem={(code, isActive) => (
        // Copper-text active state + Check icon on the right reads as a
        // luxury menu line instead of a form-radio. The radix radio
        // indicator slot is collapsed via the parent radio-item className
        // (see below).
        <div
          className={cn(
            "flex w-full items-center justify-between gap-3",
            isActive
              ? "text-copper"
              : "text-cream/60 hover:text-cream",
          )}
        >
          <span>{localeAutonyms[code]}</span>
          {isActive ? (
            <Check className="h-3.5 w-3.5 text-copper" aria-hidden="true" />
          ) : null}
        </div>
      )}
      contentClassName={cn(
        // Panel vocabulary mirrors MegaMenu: bg-background/98,
        // backdrop-blur-lg, copper/15 hairline, shadow-2xl. `p-0`
        // hands the inner padding control to `renderPanel`.
        "min-w-[200px] p-0 overflow-hidden rounded-md",
        "bg-background/98 backdrop-blur-lg border border-copper/15 shadow-2xl",
        // `[&_[role=menuitemradio]>span:first-child]:hidden` collapses
        // every radio-item's built-in indicator slot so the rows read
        // as luxury menu lines (carried by copper text + Check icon).
        "[&_[role=menuitemradio]>span:first-child]:hidden",
        // Match the rest of the dark-header line items: smaller padding,
        // copper hover tint.
        "[&_[role=menuitemradio]]:px-3 [&_[role=menuitemradio]]:py-2",
        "[&_[role=menuitemradio]]:text-[14px] [&_[role=menuitemradio]]:rounded-sm",
        "[&_[role=menuitemradio]]:transition-colors [&_[role=menuitemradio]]:duration-500 [&_[role=menuitemradio]]:ease-luxury",
        "[&_[role=menuitemradio]:hover]:bg-copper/5 [&_[role=menuitemradio]:focus]:bg-copper/5",
      )}
    />
  );
}

interface CopperTriggerProps {
  locale: Locale;
  label: string;
  autonym: string;
  isPending: boolean;
  isBar: boolean;
}

/**
 * Trigger button matching the dark/copper header vocabulary. `forwardRef`
 * because radix's `DropdownMenuTrigger asChild` forwards a ref + data
 * attributes (`data-state="open|closed"`) for the open-state chevron flip.
 */
const CopperTrigger = forwardRef<HTMLButtonElement, CopperTriggerProps>(
  function CopperTrigger({ locale, label, autonym, isPending, isBar, ...rest }, ref) {
    return (
      <button
        ref={ref}
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
        {...rest}
      >
        <Globe
          className={isBar ? "h-3 w-3" : "h-4 w-4"}
          aria-hidden="true"
        />
        <span>{autonym}</span>
        <ChevronDown
          className={cn(
            "transition-transform duration-500 ease-luxury opacity-60 group-data-[state=open]:rotate-180",
            isBar ? "h-3 w-3 ml-0.5" : "h-3.5 w-3.5 ml-1",
          )}
          aria-hidden="true"
        />
      </button>
    );
  },
);
