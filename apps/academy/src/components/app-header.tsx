"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { apiFetch, clearTokens, getRefreshToken } from "@/lib/api-client";

/**
 * Shared top bar for authenticated pages (dashboard, course, lesson,
 * account). Keeps the student oriented — app name, locale switcher,
 * account shortcut, and one-click logout.
 *
 * Deliberately flat and text-heavy instead of icon-led: the academy
 * surface is for reading, not navigating dozens of sections, so the
 * fewer distinct visual elements the better.
 */
export function AppHeader() {
  const t = useTranslations("Academy");
  const router = useRouter();

  async function onLogout() {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await apiFetch<{ ok: boolean }>("/academy/auth/logout", {
        method: "POST",
        body: { refreshToken },
        skipAuth: true,
      }).catch(() => undefined);
    }
    clearTokens();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-10 border-b border-[color:var(--color-border)] bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-3">
        <Link
          href="/"
          className="text-sm font-semibold tracking-wide text-[color:var(--color-primary)]"
        >
          {t("appName")}
        </Link>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <Link
            href="/account"
            className="text-xs font-medium text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-primary)]"
          >
            {t("account.title")}
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="text-xs font-medium text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-primary)]"
          >
            {t("account.logout")}
          </button>
        </div>
      </div>
    </header>
  );
}
