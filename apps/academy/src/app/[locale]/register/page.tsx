"use client";

import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { SubmitButton } from "@tge/ui";
import { useApiFormErrors } from "@tge/hooks";
import { Link } from "@/i18n/navigation";
import { PublicShell } from "@/components/public-shell";
import { PasswordStrength } from "@/components/password-strength";
import { useRegister } from "@/hooks/mutations";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api/v1";

const registerSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email(),
  password: z.string().min(12),
});
type RegisterValues = z.infer<typeof registerSchema>;

function RegisterInner() {
  const t = useTranslations("Academy.register");
  const locale = useLocale() as "ro" | "en" | "fr" | "de";
  const register = useRegister();

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  useApiFormErrors(form, register.error, (err) =>
    toast.error(err instanceof Error ? err.message : String(err)),
  );

  async function onSubmit(values: RegisterValues) {
    try {
      await register.mutateAsync({ ...values, locale });
    } catch {
      // handled by useApiFormErrors
    }
  }

  function onGoogle() {
    window.location.href = `${API_URL}/academy/auth/google?intent=register`;
  }

  const password = form.watch("password");

  if (register.isSuccess) {
    return (
      <PublicShell>
        <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">{t("sentTitle")}</h1>
          <p className="mt-3 text-sm text-[color:var(--color-muted-foreground)]">
            {t("sentBody", { email: form.getValues("email") })}
          </p>
          <p className="mt-6 text-xs text-[color:var(--color-muted-foreground)]">
            {t("sentFootnote")}{" "}
            <Link
              href="/resend-verification"
              className="underline hover:no-underline"
            >
              {t("sentResendLink")}
            </Link>
          </p>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
          {t("subtitle")}
        </p>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium">{t("nameLabel")}</span>
            <input
              type="text"
              autoComplete="name"
              {...form.register("name")}
              className="w-full rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]"
            />
            {form.formState.errors.name ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">{t("emailLabel")}</span>
            <input
              type="email"
              autoComplete="email"
              {...form.register("email")}
              className="w-full rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]"
            />
            {form.formState.errors.email ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">{t("passwordLabel")}</span>
            <input
              type="password"
              autoComplete="new-password"
              {...form.register("password")}
              className="w-full rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]"
            />
            <PasswordStrength password={password ?? ""} />
            {form.formState.errors.password ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </label>
          <SubmitButton
            type="submit"
            loading={register.isPending}
            loadingLabel={t("submitting")}
          >
            {t("submit")}
          </SubmitButton>
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
        <p className="mt-6 text-center text-xs text-[color:var(--color-muted-foreground)]">
          {t("haveAccount")}{" "}
          <Link href="/login" className="underline hover:no-underline">
            {t("loginLink")}
          </Link>
        </p>
      </div>
    </PublicShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterInner />
    </Suspense>
  );
}
