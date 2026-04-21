"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Button, Input, Label } from "@tge/ui";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { AuthProvider, useAuth } from "@/components/auth/auth-provider";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordStrength } from "@/components/shared/password-strength";
import { BRAND, supportMailto } from "@/lib/config/brand";

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
            // AuthProvider.logout clears state; reload to re-run the
            // verify flow without any stale cookie or memory token.
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

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M12 4.75c2.04 0 3.88.7 5.33 2.06l3.96-3.96C18.95 0.7 15.7 -0.5 12 -0.5 7.39 -0.5 3.4 2.08 1.39 5.84l4.62 3.58C6.99 6.6 9.26 4.75 12 4.75zM23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.28 1.48-1.12 2.73-2.39 3.58l3.69 2.86c2.15-1.99 3.72-4.93 3.72-8.68zM5.96 14.42a6.85 6.85 0 0 1-.37-2.17c0-.75.13-1.48.36-2.17L1.33 6.5A11.45 11.45 0 0 0 .5 12.25c0 1.85.45 3.6 1.23 5.14l4.23-3.02zM12 24c3.24 0 5.96-1.08 7.94-2.92l-3.69-2.86c-1.04.7-2.38 1.1-4.25 1.1-2.74 0-5.01-1.85-5.99-4.66l-4.6 3.57C3.3 21.93 7.39 24 12 24z" />
    </svg>
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
  const [reveal, setReveal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const googleEnabled =
    process.env.NEXT_PUBLIC_SSO_GOOGLE_ENABLED === "true";
  const googleHref = apiUrl
    ? `${apiUrl}/auth/google?invitation=${encodeURIComponent(token)}`
    : "#";

  const form = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = async (values: PasswordForm) => {
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
      // will re-hydrate from the refresh cookie we just set. Agents land on
      // their listings page; anyone else (shouldn't happen in v1) hits the
      // root dashboard.
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
          <a
            href={googleHref}
            className="flex h-9 w-full items-center gap-2.5 rounded-md border border-border bg-card px-3 text-left text-xs font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              <GoogleMark className="h-3.5 w-3.5" />
            </span>
            <span className="flex-1 truncate">{t("continueWithGoogle")}</span>
          </a>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" aria-hidden />
            <span className="mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {t("or")}
            </span>
            <span className="h-px flex-1 bg-border" aria-hidden />
          </div>
        </>
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

      <Button
        type="submit"
        className="h-9 w-full"
        disabled={submitting}
      >
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
