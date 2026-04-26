"use client";

import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { SubmitButton } from "@tge/ui";
import { useApiFormErrors } from "@tge/hooks";
import { useRouter } from "@/i18n/navigation";
import { PublicShell } from "@/components/public-shell";
import { apiFetch } from "@/lib/api-client";
import { useAcceptInvite } from "@/hooks/mutations";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api/v1";

const schema = z.object({ password: z.string().min(12) });
type Values = z.infer<typeof schema>;

function AcceptInviteInner() {
  const t = useTranslations("Academy.acceptInvite");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [email, setEmail] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const accept = useAcceptInvite();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "" },
  });

  useApiFormErrors(form, accept.error, (err) =>
    toast.error(err instanceof Error ? err.message : String(err)),
  );

  useEffect(() => {
    if (!token) {
      setInvalid(true);
      return;
    }
    apiFetch<{ email: string; expiresAt: string }>(
      "/academy/auth/invitations/verify",
      { method: "POST", body: { token }, skipAuth: true },
    )
      .then((res) => setEmail(res.email))
      .catch(() => setInvalid(true));
  }, [token]);

  async function onSubmit(values: Values) {
    try {
      await accept.mutateAsync({ token, password: values.password });
      router.push("/");
    } catch {
      // handled by useApiFormErrors
    }
  }

  function onGoogle() {
    window.location.href = `${API_URL}/academy/auth/google?invitation=${encodeURIComponent(token)}`;
  }

  if (invalid) {
    return (
      <PublicShell>
        <p className="max-w-sm text-center text-sm text-[color:var(--color-muted-foreground)]">
          {t("invalid")}
        </p>
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
        {email ? (
          <p className="mt-4 text-sm">
            <span className="font-medium">{email}</span>
          </p>
        ) : null}
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-6 flex flex-col gap-4"
        >
          <label className="text-sm">
            <span className="mb-1 block font-medium">{t("passwordLabel")}</span>
            <input
              type="password"
              autoComplete="new-password"
              {...form.register("password")}
              className="w-full rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]"
            />
            {form.formState.errors.password ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </label>
          <SubmitButton
            type="submit"
            loading={accept.isPending}
            disabled={!email}
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
      </div>
    </PublicShell>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteInner />
    </Suspense>
  );
}
