"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { apiFetch, setTokens, ApiError } from "@/lib/api-client";

type Status = "loading" | "success" | "expired" | "invalid";

function VerifyEmailInner() {
  const t = useTranslations("Academy.verifyEmail");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<Status>("loading");
  // Strict-mode double-invoke guard: one-shot verification must not
  // fire twice (the second call would always 410 and flip the UI to
  // "expired" on a perfectly good token).
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (!token) {
      setStatus("invalid");
      return;
    }
    apiFetch<{
      accessToken: string;
      refreshToken: string;
      user: { id: string; email: string; name: string };
    }>("/academy/auth/verify-email", {
      method: "POST",
      body: { token },
      skipAuth: true,
    })
      .then((res) => {
        setTokens({
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
        });
        setStatus("success");
        router.push("/");
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 410) {
          setStatus("expired");
        } else {
          setStatus("invalid");
        }
      });
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--color-muted)] p-6">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm text-center">
        {status === "loading" && (
          <p className="text-sm text-[color:var(--color-muted-foreground)]">
            {t("verifying")}
          </p>
        )}
        {status === "success" && (
          <>
            <h1 className="text-2xl font-semibold">{t("successTitle")}</h1>
            <p className="mt-3 text-sm text-[color:var(--color-muted-foreground)]">
              {t("successBody")}
            </p>
          </>
        )}
        {status === "expired" && (
          <>
            <h1 className="text-2xl font-semibold">{t("expiredTitle")}</h1>
            <p className="mt-3 text-sm text-[color:var(--color-muted-foreground)]">
              {t("expiredBody")}
            </p>
            <Link
              href="/resend-verification"
              className="mt-6 inline-block rounded-md bg-[color:var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
            >
              {t("expiredAction")}
            </Link>
          </>
        )}
        {status === "invalid" && (
          <>
            <h1 className="text-2xl font-semibold">{t("invalidTitle")}</h1>
            <p className="mt-3 text-sm text-[color:var(--color-muted-foreground)]">
              {t("invalidBody")}
            </p>
            <Link
              href="/register"
              className="mt-6 inline-block rounded-md bg-[color:var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
            >
              {t("invalidAction")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}
