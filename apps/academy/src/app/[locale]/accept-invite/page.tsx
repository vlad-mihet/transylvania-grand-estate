"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { apiFetch, setTokens, ApiError } from "@/lib/api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api/v1";

function AcceptInviteInner() {
  const t = useTranslations("Academy.acceptInvite");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [email, setEmail] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setInvalid(true);
      return;
    }
    apiFetch<{ email: string; expiresAt: string }>(
      "/academy/auth/invitations/verify",
      { method: "POST", body: { token }, skipAuth: true },
    )
      .then((res) => setEmail(res.email))
      .catch(() => setInvalid(true));
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiFetch<{
        accessToken: string;
        refreshToken: string;
      }>("/academy/auth/invitations/accept-password", {
        method: "POST",
        body: { token, password },
        skipAuth: true,
      });
      setTokens({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      router.push("/");
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
    window.location.href = `${API_URL}/academy/auth/google?invitation=${encodeURIComponent(token)}`;
  }

  if (invalid) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="max-w-sm text-center text-sm text-[color:var(--color-muted-foreground)]">
          {t("invalid")}
        </p>
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
        {email ? (
          <p className="mt-4 text-sm">
            <span className="font-medium">{email}</span>
          </p>
        ) : null}
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
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
          </label>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting || !email}
            className="rounded-md bg-[color:var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {t("submit")}
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
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteInner />
    </Suspense>
  );
}
