"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";

/**
 * Minimal chrome for logged-out pages (login, register, verify, reset,
 * invite). Ensures a consistent brand surface across the auth flow — a user
 * bouncing between login and register shouldn't feel like they crossed into
 * a different product. Deliberately lighter than `AppHeader`: no account
 * link, no logout, no catalog shortcut — just the app name and locale.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Academy");
  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--color-muted)]">
      <header className="border-b border-[color:var(--color-border)] bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-3">
          <Link
            href="/"
            className="text-sm font-semibold tracking-wide text-[color:var(--color-primary)]"
          >
            {t("appName")}
          </Link>
          <LocaleSwitcher />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        {children}
      </main>
    </div>
  );
}
