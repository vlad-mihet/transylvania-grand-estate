"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Button } from "@tge/ui";
import { Loader2, AlertCircle } from "lucide-react";
import { AuthProvider, useAuth } from "@/components/auth/auth-provider";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordField } from "@/components/auth/password-field";
import { GoogleSsoButton } from "@/components/auth/google-sso-button";
import { PasswordStrength } from "@/components/shared/password-strength";
import { BRAND, supportMailto } from "@/lib/config/brand";
import {
  buildPasswordSchema,
  type PasswordFormValues,
} from "@/lib/validations/password";

type VerifyState =
  | { status: "loading" }
  | {
      status: "valid";
      firstName: string;
      email: string;
      expiresAt: string;
    }
  | { status: "expired" | "notFound" };

export default function AcceptInvitePage() {
  return (
    <AuthProvider>
      <AcceptInviteInner />
    </AuthProvider>
  );
}

function AcceptInviteInner() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const t = useTranslations("AcceptInvite");
  const { user, isLoading: authLoading, logout } = useAuth();
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
      `${apiBase}/invitations/verify?token=${encodeURIComponent(token)}`,
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
          data?: { firstName: string; email: string; expiresAt: string };
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
      {(verify.status === "loading" || authLoading) && (
        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t("verifying")}
        </div>
      )}
      {!authLoading && user && verify.status === "valid" && (
        // Already signed in — accepting would fail on the unique-email
        // constraint anyway, and the happy path of "switch to the new
        // invitee" requires a clean session. Prompt a sign-out instead
        // of silently failing at submit time.
        <AlreadySignedInNotice
          currentEmail={user.email}
          inviteEmail={verify.email}
          onSignOut={async () => {
            await logout();
            if (typeof window !== "undefined") {
              window.location.reload();
            }
          }}
        />
      )}
      {!authLoading && !user && verify.status === "expired" && (
        <ExpiredNotice title={t("expiredTitle")} body={t("expiredBody")} />
      )}
      {!authLoading && !user && verify.status === "notFound" && (
        <ExpiredNotice title={t("notFoundTitle")} body={t("notFoundBody")} />
      )}
      {!authLoading && !user && verify.status === "valid" && (
        <AcceptForm
          token={token}
          firstName={verify.firstName}
          email={verify.email}
        />
      )}
    </AuthShell>
  );
}

function AlreadySignedInNotice({
  currentEmail,
  inviteEmail,
  onSignOut,
}: {
  currentEmail: string;
  inviteEmail: string;
  onSignOut: () => void | Promise<void>;
}) {
  const t = useTranslations("AcceptInvite");
  const [signingOut, setSigningOut] = useState(false);
  return (
    <div className="space-y-4 text-center">
      <AlertCircle
        className="mx-auto h-8 w-8 text-[var(--color-warning)]"
        aria-hidden
      />
      <h1 className="text-[17px] font-semibold text-foreground">
        {t("alreadySignedInTitle")}
      </h1>
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        {t("alreadySignedInBody", {
          currentEmail,
          inviteEmail,
        })}
      </p>
      <Button
        onClick={async () => {
          setSigningOut(true);
          try {
            await onSignOut();
          } finally {
            setSigningOut(false);
          }
        }}
        disabled={signingOut}
        className="w-full"
      >
        {signingOut ? (
          <>
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            {t("signingOut")}
          </>
        ) : (
          t("signOutAndAccept")
        )}
      </Button>
    </div>
  );
}

function ExpiredNotice({ title, body }: { title: string; body: string }) {
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
      <a
        href={supportMailto("Invitation help")}
        className="inline-block text-[12px] text-foreground underline hover:opacity-80"
      >
        {BRAND.supportEmail}
      </a>
    </div>
  );
}

function AcceptForm({
  token,
  firstName,
  email,
}: {
  token: string;
  firstName: string;
  email: string;
}) {
  const t = useTranslations("AcceptInvite");
  const tErrors = useTranslations("PasswordStrength.errors");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const googleEnabled =
    process.env.NEXT_PUBLIC_SSO_GOOGLE_ENABLED === "true";

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
      const res = await fetch("/api/invitations/accept/password", {
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
      // Hard navigate so the dashboard layout re-mounts AuthProvider, which
      // will re-hydrate from the refresh cookie we just set.
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
      <div className="mb-2 space-y-1">
        <h1 className="text-[17px] font-semibold tracking-tight text-foreground">
          {t("welcome", { firstName })}
        </h1>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {t("subtitle")}
        </p>
        <p className="mono pt-1 text-[11px] text-muted-foreground/80">
          {email}
        </p>
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

      {googleEnabled && (
        <>
          <GoogleSsoButton
            label={t("continueWithGoogle")}
            invitationToken={token}
          />

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" aria-hidden />
            <span className="mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {t("or")}
            </span>
            <span className="h-px flex-1 bg-border" aria-hidden />
          </div>
        </>
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
          t("createAccount")
        )}
      </Button>
    </form>
  );
}
