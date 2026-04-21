"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@tge/ui";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordField } from "@/components/auth/password-field";
import { PasswordStrength } from "@/components/shared/password-strength";
import {
  buildPasswordSchema,
  type PasswordFormValues,
} from "@/lib/validations/password";

type VerifyState =
  | { status: "loading" }
  | { status: "valid"; email: string; firstName: string | null }
  | { status: "expired" | "notFound" };

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const t = useTranslations("ResetPassword");
  const [verify, setVerify] = useState<VerifyState>({ status: "loading" });

  useEffect(() => {
    if (!token) {
      setVerify({ status: "notFound" });
      return;
    }
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    if (!apiBase) {
      setVerify({ status: "notFound" });
      return;
    }
    const ac = new AbortController();
    fetch(
      `${apiBase}/auth/reset-password/verify?token=${encodeURIComponent(token)}`,
      { signal: ac.signal },
    )
      .then(async (res) => {
        if (res.status === 410) {
          setVerify({ status: "expired" });
          return;
        }
        if (!res.ok) {
          setVerify({ status: "notFound" });
          return;
        }
        const body = (await res.json()) as {
          data?: { email: string; firstName: string | null };
        };
        if (!body.data) {
          setVerify({ status: "notFound" });
          return;
        }
        setVerify({ status: "valid", ...body.data });
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") {
          setVerify({ status: "notFound" });
        }
      });
    return () => ac.abort();
  }, [token]);

  return (
    <AuthShell>
      {verify.status === "loading" && (
        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t("verifying")}
        </div>
      )}
      {verify.status === "expired" && (
        <InvalidTokenNotice
          title={t("expiredTitle")}
          body={t("expiredBody")}
        />
      )}
      {verify.status === "notFound" && (
        <InvalidTokenNotice
          title={t("notFoundTitle")}
          body={t("notFoundBody")}
        />
      )}
      {verify.status === "valid" && (
        <ResetForm
          token={token}
          email={verify.email}
          firstName={verify.firstName}
        />
      )}
    </AuthShell>
  );
}

function InvalidTokenNotice({ title, body }: { title: string; body: string }) {
  const tAuth = useTranslations("Auth");
  return (
    <div className="space-y-3 text-center">
      <AlertCircle
        className="mx-auto h-8 w-8 text-[var(--color-warning)]"
        aria-hidden
      />
      <h1 className="text-[17px] font-semibold text-foreground">{title}</h1>
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        {body}
      </p>
      <Link
        href="/forgot-password"
        className="inline-flex items-center gap-1.5 text-[12px] text-foreground underline hover:opacity-80"
      >
        <ArrowLeft className="h-3 w-3" />
        {tAuth("requestNewLink")}
      </Link>
    </div>
  );
}

function ResetForm({
  token,
  email,
  firstName,
}: {
  token: string;
  email: string;
  firstName: string | null;
}) {
  const t = useTranslations("ResetPassword");
  const tErrors = useTranslations("PasswordStrength.errors");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      buildPasswordSchema({
        minLength: tErrors("minLength"),
        needsLowercase: tErrors("needsLowercase"),
        needsUppercase: tErrors("needsUppercase"),
        needsDigit: tErrors("needsDigit"),
        mismatch: tErrors("mismatch"),
      }),
    [tErrors],
  );

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = async (values: PasswordFormValues) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: values.password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(body.error?.message ?? t("failed"));
      }
      const data = (await res.json()) as { user: { role: string } };
      // Hard navigate so AuthProvider re-hydrates from the freshly-set cookie.
      const dest = data.user.role === "AGENT" ? "/my-listings" : "/";
      window.location.href = dest;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-4"
      noValidate
    >
      <div className="mb-1 space-y-1">
        <h1 className="text-[17px] font-semibold tracking-tight text-foreground">
          {firstName
            ? t("headingNamed", { firstName })
            : t("headingGeneric")}
        </h1>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {t("subtitle")}
        </p>
        <p className="mono pt-1 text-[11px] text-muted-foreground/80">{email}</p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-sm border border-[color-mix(in_srgb,var(--color-danger)_30%,var(--border))] bg-[var(--color-danger-bg)] px-3 py-2 text-xs text-[var(--color-danger)]"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <PasswordField
          id="password"
          label={t("password")}
          autoComplete="new-password"
          {...form.register("password")}
        />
        <PasswordStrength value={form.watch("password")} />
      </div>

      <PasswordField
        id="confirm"
        label={t("confirmPassword")}
        autoComplete="new-password"
        showCapsLock={false}
        error={form.formState.errors.confirm?.message}
        {...form.register("confirm")}
      />

      <Button type="submit" className="h-9 w-full" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            {t("submitting")}
          </>
        ) : (
          t("submit")
        )}
      </Button>
    </form>
  );
}
