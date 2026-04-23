"use client";

import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api-client";

function ResendVerificationInner() {
  const t = useTranslations("Academy.resendVerification");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // Anti-enumeration: the backend always returns 202, so we treat any
    // non-network-error outcome as "sent" and display the same copy.
    try {
      await apiFetch("/academy/auth/resend-verification", {
        method: "POST",
        body: { email },
        skipAuth: true,
      });
    } catch {
      // Swallow — generic copy below preserves anti-enumeration.
    }
    setSubmitted(true);
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--color-muted)] p-6">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
          {t("intro")}
        </p>
        {submitted ? (
          <p
            className="mt-6 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800"
            role="status"
          >
            {t("sent")}
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
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
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-[color:var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {submitting ? t("submitting") : t("submit")}
            </button>
          </form>
        )}
        <p className="mt-6 text-center text-xs">
          <Link
            href="/login"
            className="text-[color:var(--color-muted-foreground)] hover:underline"
          >
            {t("backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResendVerificationPage() {
  return (
    <Suspense fallback={null}>
      <ResendVerificationInner />
    </Suspense>
  );
}
