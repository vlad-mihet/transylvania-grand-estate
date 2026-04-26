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
import { PasswordStrength } from "@/components/password-strength";
import { useResetPassword } from "@/hooks/mutations";
import { ApiError } from "@/lib/api-client";

const schema = z.object({ password: z.string().min(12) });
type Values = z.infer<typeof schema>;

function ResetPasswordInner() {
  const t = useTranslations("Academy.resetPassword");
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const reset = useResetPassword();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "" },
  });

  useApiFormErrors(form, reset.error, (err) => {
    if (err instanceof ApiError && (err.status === 410 || err.status === 404)) {
      form.setError("root", { type: "server", message: t("invalid") });
      return;
    }
    toast.error(err instanceof Error ? err.message : String(err));
  });

  if (!token) {
    return (
      <PublicShell>
        <p className="max-w-sm text-center text-sm text-[color:var(--color-muted-foreground)]">
          {t("invalid")}
        </p>
      </PublicShell>
    );
  }

  async function onSubmit(values: Values) {
    try {
      await reset.mutateAsync({ token, password: values.password });
      router.replace({ pathname: "/login", query: { reset: "success" } });
    } catch {
      // handled by useApiFormErrors
    }
  }

  const password = form.watch("password");

  return (
    <PublicShell>
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
          {t("intro")}
        </p>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-5 flex flex-col gap-4"
        >
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
          {form.formState.errors.root ? (
            <p className="text-sm text-red-600" role="alert">
              {form.formState.errors.root.message}
            </p>
          ) : null}
          <SubmitButton type="submit" loading={reset.isPending}>
            {t("submit")}
          </SubmitButton>
          <Link
            href="/login"
            className="text-xs text-[color:var(--color-muted-foreground)] hover:underline"
          >
            {t("backToLogin")}
          </Link>
        </form>
      </div>
    </PublicShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
