"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { apiFetch, setTokens, ApiError } from "@/lib/api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api/v1";

function LoginInner() {
  const t = useTranslations("Academy.login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When the user lands here after a successful password reset we show
  // a soft success banner so the redirect doesn't feel silent. Any other
  // flash message (e.g. `?error=…` from the OAuth callback) also routes
  // through the search params, keeping the surface minimal.
  const resetSuccess = searchParams.get("reset") === "success";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<{
        accessToken: string;
        refreshToken: string;
        user: { id: string; email: string; name: string };
      }>("/academy/auth/login", {
        method: "POST",
        body: { email, password },
        skipAuth: true,
      });
      setTokens({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setError(t("error"));
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setLoading(false);
    }
  }

  function onGoogle() {
    window.location.href = `${API_URL}/academy/auth/google`;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--color-muted)] p-6">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold">{t("title")}</h1>
        {resetSuccess ? (
          <p
            className="mb-4 rounded-md bg-green-50 px-3 py-2 text-xs text-green-800"
            role="status"
          >
            {t("resetSuccess")}
          </p>
        ) : null}
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]"
            />
          </label>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-[color:var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {t("submit")}
          </button>
          <Link
            href="/forgot-password"
            className="text-center text-xs text-[color:var(--color-muted-foreground)] hover:underline"
          >
            {t("forgotPassword")}
          </Link>
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
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
