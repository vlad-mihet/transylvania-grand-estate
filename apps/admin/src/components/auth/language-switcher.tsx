"use client";

import { Fragment } from "react";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@tge/utils";

/**
 * Inline locale switcher for the login footer. Lifted from
 * `apps/reveria/src/components/layout/language-switcher.tsx` (inline variant)
 * and stripped to the admin's mono workbench aesthetic.
 *
 * Clicks call `router.replace({ pathname, params }, { locale })` so that
 * dynamic routes (e.g. `/properties/[id]`) resolve correctly across locales.
 * For the login page itself the path is static (`/login`), but keeping the
 * param-aware pattern makes this component drop-in reusable on any authed
 * page we add it to later.
 */
const LOCALES = [
  { code: "ro", label: "RO" },
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "de", label: "DE" },
] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const switchTo = (next: string) => {
    if (next === locale) return;
    router.replace(
      // @ts-expect-error — next-intl's strict pathname + params pair doesn't
      // accept a dynamically-typed pathname literal; at runtime it correctly
      // resolves whichever template the current route matches.
      { pathname, params },
      { locale: next },
    );
  };

  return (
    <div className="mono inline-flex items-center gap-0.5 text-[10px] uppercase tracking-[0.08em]">
      {LOCALES.map((l, i) => (
        <Fragment key={l.code}>
          {i > 0 && (
            <span aria-hidden className="px-0.5 text-muted-foreground/30">
              ·
            </span>
          )}
          <button
            type="button"
            onClick={() => switchTo(l.code)}
            aria-current={locale === l.code ? "page" : undefined}
            className={cn(
              "rounded-sm px-1 py-0.5 transition-colors",
              locale === l.code
                ? "font-semibold text-foreground"
                : "text-muted-foreground/70 hover:text-foreground",
            )}
          >
            {l.label}
          </button>
        </Fragment>
      ))}
    </div>
  );
}
