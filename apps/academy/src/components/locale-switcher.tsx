"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { Loader2 } from "lucide-react";
import { apiFetch, getAccessToken } from "@/lib/api-client";

const LOCALES: readonly { code: "ro" | "en" | "fr" | "de"; label: string }[] = [
  { code: "ro", label: "RO" },
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "de", label: "DE" },
];

const LOCALE_CODES = new Set(LOCALES.map((l) => l.code));

/**
 * Compact language picker. Swaps the first path segment (current locale)
 * for the new one and triggers a full-page navigation — full reload is
 * acceptable on a locale switch because all server-rendered messages
 * change anyway, and dodging the typed-router's requirement to
 * reconstruct dynamic-segment params (`{ pathname, params }`) for routes
 * like `/courses/[slug]` keeps this component trivial.
 *
 * When the student is signed in, the choice is also persisted to the
 * AcademyUser record so their next login lands in the same language.
 */
export function LocaleSwitcher() {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const onChange = (next: "ro" | "en" | "fr" | "de") => {
    if (next === locale) return;
    startTransition(() => {
      if (getAccessToken()) {
        // Fire-and-forget — UI already navigates below; a failed server
        // write leaves the DB locale stale, which the next login fixes.
        apiFetch("/academy/auth/me", {
          method: "PATCH",
          body: { locale: next },
        }).catch(() => undefined);
      }
      const parts = window.location.pathname.split("/").filter(Boolean);
      const first = parts[0] as "ro" | "en" | "fr" | "de" | undefined;
      if (first && LOCALE_CODES.has(first)) {
        parts[0] = next;
      } else {
        parts.unshift(next);
      }
      window.location.href = `/${parts.join("/")}${window.location.search}`;
    });
  };

  return (
    <div
      role="group"
      aria-label="Language"
      aria-busy={isPending || undefined}
      className="relative inline-flex rounded-md border border-[color:var(--color-border)] bg-white"
    >
      {LOCALES.map((l) => {
        const isActive = l.code === locale;
        const showSpinner = isPending && isActive;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => onChange(l.code)}
            disabled={isPending}
            className={`relative inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium tracking-wider transition ${
              isActive
                ? "bg-[color:var(--color-primary)] text-white"
                : "text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]"
            } ${isPending ? "cursor-wait" : ""}`}
            aria-pressed={isActive}
          >
            {showSpinner ? (
              <Loader2
                className="h-3 w-3 animate-spin"
                aria-hidden="true"
              />
            ) : null}
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
