"use client";

import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { SubmitButton } from "@tge/ui";
import { useApiFormErrors } from "@tge/hooks";
import { Link, useRouter } from "@/i18n/navigation";
import { PublicShell } from "@/components/public-shell";
import { validateReturnTo } from "@/lib/return-to";
import { useLogin } from "@/hooks/mutations";
import { ApiError } from "@/lib/api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api/v1";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
type LoginValues = z.infer<typeof loginSchema>;

function LoginInner() {
  const t = useTranslations("Academy.login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useLogin();

  // When the user lands here after a successful password reset we show
  // a soft success banner so the redirect doesn't feel silent.
  const resetSuccess = searchParams.get("reset") === "success";
  const returnToRaw = searchParams.get("returnTo");
  const returnTo = validateReturnTo(returnToRaw);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useApiFormErrors(form, login.error, (err) => {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      form.setError("root", { type: "server", message: t("error") });
      return;
    }
    toast.error(err instanceof Error ? err.message : String(err));
  });

  async function onSubmit(values: LoginValues) {
    try {
      await login.mutateAsync(values);
      router.push(returnTo ?? "/");
    } catch {
      // errors surfaced via useApiFormErrors
    }
  }

  function onGoogle() {
    const suffix = returnToRaw
      ? `?returnTo=${encodeURIComponent(returnToRaw)}`
      : "";
    window.location.href = `${API_URL}/academy/auth/google${suffix}`;
  }

  return (
    <PublicShell>
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold">{t("title")}</h1>
        {resetSuccess ? (
          <p
            className="mb-4 rounded-md bg-green-50 px-3 py-2 text-xs text-green-800"
            role="status"
          >
            {t("resetSuccess")}
          </p>
        ) : null}
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
              autoComplete="current-password"
              {...form.register("password")}
              className="w-full rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]"
            />
            {form.formState.errors.password ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </label>
          {form.formState.errors.root ? (
            <p className="text-sm text-red-600" role="alert">
              {form.formState.errors.root.message}
            </p>
          ) : null}
          <SubmitButton type="submit" loading={login.isPending}>
            {t("submit")}
          </SubmitButton>
          <Link
            href="/forgot-password"
            className="text-center text-xs text-[color:var(--color-muted-foreground)] hover:underline"
          >
            {t("forgotPassword")}
          </Link>
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
          {t("noAccount")}{" "}
          <Link href="/register" className="underline hover:no-underline">
            {t("registerLink")}
          </Link>
        </p>
      </div>
    </PublicShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
