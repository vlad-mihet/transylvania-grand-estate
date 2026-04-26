"use client";

import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { SubmitButton } from "@tge/ui";
import { Link } from "@/i18n/navigation";
import { PublicShell } from "@/components/public-shell";
import { useResendVerification } from "@/hooks/mutations";

const schema = z.object({ email: z.string().email() });
type Values = z.infer<typeof schema>;

function ResendVerificationInner() {
  const t = useTranslations("Academy.resendVerification");
  const resend = useResendVerification();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: Values) {
    // Anti-enumeration: always 202. Swallow errors; show the same copy.
    await resend.mutateAsync(values).catch(() => undefined);
  }

  const submitted = resend.isSuccess || resend.isError;

  return (
    <PublicShell>
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
          {t("intro")}
        </p>
        {submitted ? (
          <p
            className="mt-6 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800"
            role="status"
          >
            {t("sent")}
          </p>
        ) : (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-6 flex flex-col gap-4"
          >
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
            <SubmitButton
              type="submit"
              loading={resend.isPending}
              loadingLabel={t("submitting")}
            >
              {t("submit")}
            </SubmitButton>
          </form>
        )}
        <p className="mt-6 text-center text-xs">
          <Link
            href="/login"
            className="text-[color:var(--color-muted-foreground)] hover:underline"
          >
            {t("backToLogin")}
          </Link>
        </p>
      </div>
    </PublicShell>
  );
}

export default function ResendVerificationPage() {
  return (
    <Suspense fallback={null}>
      <ResendVerificationInner />
    </Suspense>
  );
}
