"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { SubmitButton } from "@tge/ui";
import { Link } from "@/i18n/navigation";
import { PublicShell } from "@/components/public-shell";
import { useForgotPassword } from "@/hooks/mutations";

const schema = z.object({ email: z.string().email() });
type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const t = useTranslations("Academy.forgotPassword");
  const forgot = useForgotPassword();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: Values) {
    // Endpoint is always 200 by design — anti-enumeration. Swallow any
    // network error; UI always flips to the confirmation screen.
    await forgot.mutateAsync(values).catch(() => undefined);
  }

  return (
    <PublicShell>
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        {forgot.isSuccess || forgot.isError ? (
          <>
            <p className="mt-3 text-sm text-[color:var(--color-muted-foreground)]">
              {t("sent")}
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block text-sm font-medium text-[color:var(--color-primary)] hover:underline"
            >
              {t("backToLogin")}
            </Link>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
              {t("intro")}
            </p>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-5 flex flex-col gap-4"
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
              <SubmitButton type="submit" loading={forgot.isPending}>
                {t("submit")}
              </SubmitButton>
              <Link
                href="/login"
                className="text-xs text-[color:var(--color-muted-foreground)] hover:underline"
              >
                {t("backToLogin")}
              </Link>
            </form>
          </>
        )}
      </div>
    </PublicShell>
  );
}
