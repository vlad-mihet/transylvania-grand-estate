"use client";

import { Suspense, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { PasswordStrength } from "@/components/password-strength";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api/v1";

function RegisterInner() {
  const t = useTranslations("Academy.register");
  const locale = useLocale() as "ro" | "en" | "fr" | "de";
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch<{ ok: true }>("/academy/auth/register", {
        method: "POST",
        body: { name, email, password, locale },
        skipAuth: true,
      });
      // Always flip to the success screen — backend uses anti-enumeration
      // 202s so we treat every non-error response as "check your inbox".
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  function onGoogle() {
    window.location.href = `${API_URL}/academy/auth/google?intent=register`;
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--color-muted)] p-6">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">{t("sentTitle")}</h1>
          <p className="mt-3 text-sm text-[color:var(--color-muted-foreground)]">
            {t("sentBody", { email })}
          </p>
          <p className="mt-6 text-xs text-[color:var(--color-muted-foreground)]">
            {t("sentFootnote")}{" "}
            <Link
              href="/resend-verification"
              className="underline hover:no-underline"
            >
              {t("sentResendLink")}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--color-muted)] p-6">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
          {t("subtitle")}
        </p>
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium">{t("nameLabel")}</span>
            <input
              type="text"
              required
              minLength={2}
              maxLength={200}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">{t("emailLabel")}</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]"
            />
          </label>
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
            {submitting ? t("submitting") : t("submit")}
          </button>
        </form>
        <div className="my-6 flex items-center gap-3 text-xs text-[color:var(--color-muted-foreground)]">
          <div className="h-px flex-1 bg-[color:var(--color-border)]" />
          <span>OR</span>
          <div className="h-px flex-1 bg-[color:var(--color-border)]" />
        </div>
        <button
          type="button"
          onClick={onGoogle}
          className="w-full rounded-md border border-[color:var(--color-border)] bg-white px-4 py-2 text-sm font-medium hover:bg-[color:var(--color-muted)]"
        >
          {t("googleButton")}
        </button>
        <p className="mt-6 text-center text-xs text-[color:var(--color-muted-foreground)]">
          {t("haveAccount")}{" "}
          <Link href="/login" className="underline hover:no-underline">
            {t("loginLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterInner />
    </Suspense>
  );
}
