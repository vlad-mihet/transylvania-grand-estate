"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ErrorState, SubmitButton } from "@tge/ui";
import { useApiFormErrors } from "@tge/hooks";
import { useRouter } from "@/i18n/navigation";
import { AppHeader } from "@/components/app-header";
import { AccountSkeleton } from "@/components/skeletons";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useSession } from "@/hooks/use-session";
import {
  useChangePassword,
  useLogout,
  useResendVerification,
  useUpdateProfile,
} from "@/hooks/mutations";

const LOCALE_OPTIONS: readonly { code: "ro" | "en" | "fr" | "de"; label: string }[] = [
  { code: "ro", label: "Română" },
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
];

const profileSchema = z.object({
  name: z.string().min(2).max(200),
  locale: z.enum(["ro", "en", "fr", "de"]),
});
type ProfileValues = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12),
});
type PasswordValues = z.infer<typeof passwordSchema>;

export default function AccountPage() {
  const t = useTranslations("Academy");
  const router = useRouter();
  const { isReady } = useAuthGuard();
  const session = useSession();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const resendVerification = useResendVerification();
  const logout = useLogout();

  const profile = session.profile;

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", locale: "ro" },
  });
  useEffect(() => {
    if (profile) {
      profileForm.reset({
        name: profile.name,
        locale: (profile.locale ?? "ro") as ProfileValues["locale"],
      });
    }
  }, [profile, profileForm]);

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  useApiFormErrors(profileForm, updateProfile.error, (err) =>
    toast.error(err instanceof Error ? err.message : String(err)),
  );
  useApiFormErrors(passwordForm, changePassword.error, (err) =>
    toast.error(err instanceof Error ? err.message : String(err)),
  );

  async function onSaveProfile(values: ProfileValues) {
    try {
      await updateProfile.mutateAsync(values);
      toast.success(t("account.saved"));
    } catch {
      // field errors handled by useApiFormErrors; toast fallback also handled.
    }
  }

  async function onChangePassword(values: PasswordValues) {
    try {
      await changePassword.mutateAsync(values);
      passwordForm.reset();
      toast.success(t("account.passwordChanged"));
    } catch {
      // field errors / fallback handled by useApiFormErrors.
    }
  }

  async function onResendVerification() {
    if (!profile) return;
    await resendVerification
      .mutateAsync({ email: profile.email })
      .catch(() => undefined);
    toast.success(t("account.verificationSent"));
  }

  async function onLogout() {
    await logout.mutateAsync();
    router.replace("/login");
  }

  if (!isReady || session.isLoading) {
    return (
      <>
        <AppHeader />
        <AccountSkeleton />
      </>
    );
  }
  if (session.error || !profile) {
    return (
      <>
        <AppHeader />
        <div className="mx-auto max-w-5xl px-6 py-12">
          <ErrorState
            title={t("errors.generic")}
            description={session.error?.message}
            onRetry={() => session.refetch()}
            retryLabel={t("errors.retry")}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <div className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-semibold">{t("account.title")}</h1>

        {!profile.emailVerifiedAt && (
          <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-sm font-semibold text-amber-900">
              {t("account.verificationTitle")}
            </h2>
            <p className="mt-2 text-sm text-amber-800">
              {t("account.verificationBody")}
            </p>
            <div className="mt-3">
              <SubmitButton
                type="button"
                size="sm"
                onClick={onResendVerification}
                loading={resendVerification.isPending}
                loadingLabel={t("account.verificationSending")}
                className="bg-amber-600 text-white hover:bg-amber-500"
              >
                {t("account.verificationResend")}
              </SubmitButton>
            </div>
          </section>
        )}

        <section className="mt-8 rounded-lg border border-[color:var(--color-border)] bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
            {t("account.profileHeading")}
          </h2>
          <form
            onSubmit={profileForm.handleSubmit(onSaveProfile)}
            className="mt-4 flex flex-col gap-4"
          >
            <div>
              <p className="text-xs text-[color:var(--color-muted-foreground)]">
                {t("account.emailLabel")}
              </p>
              <p className="font-mono text-sm">{profile.email}</p>
            </div>
            <label className="text-sm">
              <span className="mb-1 block font-medium">
                {t("account.nameLabel")}
              </span>
              <input
                type="text"
                autoComplete="name"
                {...profileForm.register("name")}
                className="w-full rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]"
              />
              {profileForm.formState.errors.name ? (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {profileForm.formState.errors.name.message}
                </p>
              ) : null}
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">
                {t("account.localeLabel")}
              </span>
              <select
                {...profileForm.register("locale")}
                className="w-full rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]"
              >
                {LOCALE_OPTIONS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <SubmitButton
                type="submit"
                loading={updateProfile.isPending}
              >
                {t("account.save")}
              </SubmitButton>
            </div>
          </form>
        </section>

        <section className="mt-6 rounded-lg border border-[color:var(--color-border)] bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
            {t("account.passwordHeading")}
          </h2>
          <form
            onSubmit={passwordForm.handleSubmit(onChangePassword)}
            className="mt-4 flex flex-col gap-4"
          >
            {/*
              Hidden username field so browser password managers can associate
              the credential with the logged-in account. Required by the
              accessibility/autofill contract — Chrome warns "Password forms
              should have (optionally hidden) username fields" otherwise.
            */}
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={profile.email}
              readOnly
              aria-hidden="true"
              tabIndex={-1}
              className="sr-only"
            />
            <label className="text-sm">
              <span className="mb-1 block font-medium">
                {t("account.currentPasswordLabel")}
              </span>
              <input
                type="password"
                autoComplete="current-password"
                {...passwordForm.register("currentPassword")}
                className="w-full rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]"
              />
              {passwordForm.formState.errors.currentPassword ? (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              ) : null}
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">
                {t("account.newPasswordLabel")}
              </span>
              <input
                type="password"
                autoComplete="new-password"
                {...passwordForm.register("newPassword")}
                className="w-full rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]"
              />
              {passwordForm.formState.errors.newPassword ? (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              ) : null}
            </label>
            <div>
              <SubmitButton
                type="submit"
                loading={changePassword.isPending}
              >
                {t("account.changePassword")}
              </SubmitButton>
            </div>
          </form>
        </section>

        <div className="mt-6">
          <button
            type="button"
            onClick={onLogout}
            disabled={logout.isPending}
            className="rounded-md border border-[color:var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-[color:var(--color-muted)] disabled:opacity-60"
          >
            {t("account.logout")}
          </button>
        </div>
      </div>
    </>
  );
}
