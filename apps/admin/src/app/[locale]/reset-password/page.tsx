"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, Input, Label } from "@tge/ui";
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordStrength } from "@/components/shared/password-strength";

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
        Request a new link
      </Link>
    </div>
  );
}

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(12, "Minimum 12 characters")
      .refine((v) => /[a-z]/.test(v), "Needs a lowercase letter")
      .refine((v) => /[A-Z]/.test(v), "Needs an uppercase letter")
      .refine((v) => /\d/.test(v), "Needs a digit"),
    confirm: z.string().min(1),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });
type PasswordForm = z.infer<typeof passwordSchema>;

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
  const [reveal, setReveal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = async (values: PasswordForm) => {
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

      <div className="grid gap-1.5">
        <Label htmlFor="password" className="text-xs font-medium">
          {t("password")}
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={reveal ? "text" : "password"}
            autoComplete="new-password"
            className="h-9 pr-9"
            {...form.register("password")}
          />
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? "Hide password" : "Show password"}
            className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center text-muted-foreground/70 hover:text-foreground"
          >
            {reveal ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        <PasswordStrength value={form.watch("password")} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="confirm" className="text-xs font-medium">
          {t("confirmPassword")}
        </Label>
        <Input
          id="confirm"
          type={reveal ? "text" : "password"}
          autoComplete="new-password"
          className="h-9"
          {...form.register("confirm")}
        />
        {form.formState.errors.confirm && (
          <p className="text-[11px] text-[var(--color-danger)]">
            {form.formState.errors.confirm.message}
          </p>
        )}
      </div>

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
