"use client";

import { AuthProvider } from "@/components/auth/auth-provider";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthStatus } from "@/components/auth/auth-status";
import { LoginForm } from "@/components/auth/login-form";
import { Link } from "@/i18n/navigation";
import { supportMailto } from "@/lib/config/brand";
import { useTranslations } from "next-intl";

/**
 * Multi-role entry point — deliberately minimal. The wordmark + copper
 * hairline (both owned by AuthShell) carry the identity; the card heading
 * names the action.
 *
 * Anatomy (top → bottom): wordmark · auth card · action row · status pill ·
 * footer. AuthShell owns everything except the card contents + afterCard slot.
 */
export default function LoginPage() {
  const t = useTranslations("Login");

  return (
    <AuthProvider>
      <AuthShell
        showVersion
        afterCard={
          <>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <Link
                href="/forgot-password"
                className="transition-colors hover:text-foreground hover:underline"
              >
                {t("forgotPassword")}
              </Link>
              <span aria-hidden className="text-muted-foreground/30">
                ·
              </span>
              <a
                href={supportMailto("Access request")}
                className="transition-colors hover:text-foreground hover:underline"
              >
                {t("needAccess")}
              </a>
            </div>

            <AuthStatus />
          </>
        }
      >
        <h1 className="mb-5 text-[17px] font-semibold tracking-tight text-foreground">
          {t("signIn")}
        </h1>
        <LoginForm />
      </AuthShell>
    </AuthProvider>
  );
}
