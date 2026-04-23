"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { PasswordStrength } from "@/components/password-strength";

function ResetPasswordInner() {
  const t = useTranslations("Academy.resetPassword");
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="max-w-sm text-center text-sm text-[color:var(--color-muted-foreground)]">
          {t("invalid")}
        </p>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch<{ ok: boolean }>("/academy/auth/reset-password", {
        method: "POST",
        body: { token, newPassword: password },
        skipAuth: true,
      });
      router.replace({ pathname: "/login", query: { reset: "success" } });
    } catch (err) {
      if (err instanceof ApiError && (err.status === 410 || err.status === 404)) {
        setError(t("invalid"));
      } else if (err instanceof ApiError && err.status === 400) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--color-muted)] p-6">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
          {t("intro")}
        </p>
        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium">{t("passwordLabel")}</span>
            <input
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]"
            />
            <PasswordStrength password={password} />
          </label>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-[color:var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? "…" : t("submit")}
          </button>
          <Link
            href="/login"
            className="text-xs text-[color:var(--color-muted-foreground)] hover:underline"
          >
            {t("backToLogin")}
          </Link>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
