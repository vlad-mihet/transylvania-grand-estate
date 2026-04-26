"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { PublicShell } from "@/components/public-shell";
import { ApiError } from "@/lib/api-client";
import { useVerifyEmail } from "@/hooks/mutations";

type Status = "loading" | "success" | "expired" | "invalid";

function VerifyEmailInner() {
  const t = useTranslations("Academy.verifyEmail");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const verify = useVerifyEmail();
  const [status, setStatus] = useState<Status>("loading");
  // Strict-mode double-invoke guard: one-shot verification must not fire
  // twice (the second call would always 410 and flip the UI to "expired"
  // on a perfectly good token).
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (!token) {
      setStatus("invalid");
      return;
    }
    verify
      .mutateAsync({ token })
      .then(() => {
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
    // `verify` is stable from react-query; ignore lint's dep-array complaint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, router]);

  return (
    <PublicShell>
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm text-center">
        {status === "loading" && (
          <div
            className="inline-flex items-center gap-2 text-sm text-[color:var(--color-muted-foreground)]"
            aria-busy="true"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t("verifying")}
          </div>
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
    </PublicShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}
