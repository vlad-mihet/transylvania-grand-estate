"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { apiFetch, getAccessToken } from "@/lib/api-client";

const LOCALES: readonly { code: "ro" | "en" | "fr" | "de"; label: string }[] = [
  { code: "ro", label: "RO" },
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "de", label: "DE" },
];

/**
 * Compact language picker. Uses next-intl's typed router so the swap is a
 * soft Next.js navigation — react-hook-form values, scroll position, and
 * any other client state survive the locale change. Mirrors the pattern
 * already in use by apps/admin and apps/reveria.
 *
 * The `@ts-expect-error` is unavoidable: the typed router can't narrow
 * `params` to the specific shape required by each pathname at compile
 * time, but `useParams()` already carries whatever the current route
 * needs, so it resolves correctly at runtime.
 *
 * When the student is signed in, the choice is also persisted to the
 * AcademyUser record so their next login lands in the same language.
 */
export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const onChange = (next: "ro" | "en" | "fr" | "de") => {
    if (next === locale) return;
    startTransition(() => {
      if (getAccessToken()) {
        // Fire-and-forget — the navigation below doesn't wait, and a failed
        // server write leaves the DB locale stale, which the next login fixes.
        apiFetch("/academy/auth/me", {
          method: "PATCH",
          body: { locale: next },
        }).catch(() => undefined);
      }
      const query = Object.fromEntries(searchParams.entries());
      router.replace(
        // @ts-expect-error -- typed router can't narrow params per pathname; safe at runtime
        { pathname, params, query },
        { locale: next, scroll: false },
      );
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
