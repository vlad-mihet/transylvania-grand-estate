"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, Input, Label } from "@tge/ui";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";

const schema = z.object({
  email: z.string().email("Invalid email"),
});
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const t = useTranslations("ForgotPassword");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      if (!res.ok && res.status !== 202) {
        // Non-202s here are throttle / server errors; show generic message.
        throw new Error("submit_failed");
      }
      // We always land on the "check your inbox" screen, independent of
      // whether the email matched an account. That's the anti-enumeration
      // contract the server relies on; the UI mustn't undermine it.
      setSubmitted(true);
    } catch {
      setError(t("failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      {submitted ? (
        <div className="space-y-4 text-center">
          <CheckCircle2
            className="mx-auto h-8 w-8 text-[var(--color-success,#22a06b)]"
            aria-hidden
          />
          <h1 className="text-[17px] font-semibold text-foreground">
            {t("sentTitle")}
          </h1>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {t("sentBody")}
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-[12px] text-foreground underline hover:opacity-80"
          >
            <ArrowLeft className="h-3 w-3" />
            {t("backToLogin")}
          </Link>
        </div>
      ) : (
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div className="mb-1 space-y-1">
            <h1 className="text-[17px] font-semibold tracking-tight text-foreground">
              {t("title")}
            </h1>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {t("subtitle")}
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
          <div className="grid gap-1.5">
            <Label htmlFor="email" className="text-xs font-medium">
              {t("email")}
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              className="mono h-9"
              autoFocus
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-[11px] text-[var(--color-danger)]">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <Button type="submit" className="h-9 w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              t("submit")
            )}
          </Button>
          <Link
            href="/login"
            className="block text-center text-[12px] text-muted-foreground hover:text-foreground"
          >
            {t("backToLogin")}
          </Link>
        </form>
      )}
    </AuthShell>
  );
}
