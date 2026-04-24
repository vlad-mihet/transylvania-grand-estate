"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  apiFetch,
  ApiError,
  clearTokens,
  getAccessToken,
  getRefreshToken,
} from "@/lib/api-client";
import { AppHeader } from "@/components/app-header";

type Profile = {
  id: string;
  email: string;
  name: string;
  locale: "ro" | "en" | "fr" | "de" | null;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

const LOCALE_OPTIONS: readonly { code: "ro" | "en" | "fr" | "de"; label: string }[] = [
  { code: "ro", label: "Română" },
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
];

export default function AccountPage() {
  const t = useTranslations("Academy");
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Profile form state
  const [name, setName] = useState("");
  const [locale, setLocale] = useState<Profile["locale"]>("ro");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Password form state
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);

  // Verification resend state
  const [verificationMsg, setVerificationMsg] = useState<string | null>(null);
  const [verificationSending, setVerificationSending] = useState(false);

  async function onResendVerification() {
    if (!profile) return;
    setVerificationSending(true);
    try {
      await apiFetch("/academy/auth/resend-verification", {
        method: "POST",
        body: { email: profile.email },
        skipAuth: true,
      });
    } catch {
      // Anti-enumeration: the endpoint always 202s anyway. We
      // intentionally don't surface failures to the user.
    }
    setVerificationMsg(t("account.verificationSent"));
    setVerificationSending(false);
  }

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    apiFetch<Profile>("/academy/auth/me")
      .then((p) => {
        setProfile(p);
        setName(p.name);
        setLocale(p.locale ?? "ro");
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearTokens();
          router.replace("/login");
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
      });
  }, [router]);

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const updated = await apiFetch<Profile>("/academy/auth/me", {
        method: "PATCH",
        body: { name, locale },
      });
      setProfile(updated);
      setProfileMsg(t("account.saved"));
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setProfileSaving(false);
    }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdSaving(true);
    setPwdError(null);
    setPwdMsg(null);
    try {
      await apiFetch<{ ok: boolean }>("/academy/auth/change-password", {
        method: "POST",
        body: { currentPassword: currentPwd, newPassword: newPwd },
      });
      setCurrentPwd("");
      setNewPwd("");
      setPwdMsg(t("account.passwordChanged"));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setPwdError(t("login.error"));
      } else {
        setPwdError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setPwdSaving(false);
    }
  }

  async function onLogout() {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await apiFetch<{ ok: boolean }>("/academy/auth/logout", {
        method: "POST",
        body: { refreshToken },
        skipAuth: true,
      }).catch(() => undefined);
    }
    clearTokens();
    router.replace("/login");
  }

  if (error) {
    return (
      <>
        <AppHeader />
        <div className="mx-auto max-w-5xl px-6 py-12">
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        </div>
      </>
    );
  }
  if (!profile) {
    return (
      <>
        <AppHeader />
        <div className="mx-auto max-w-5xl px-6 py-12">…</div>
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
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={onResendVerification}
                disabled={verificationSending}
                className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
              >
                {verificationSending
                  ? t("account.verificationSending")
                  : t("account.verificationResend")}
              </button>
              {verificationMsg ? (
                <span className="text-xs text-amber-900" role="status">
                  {verificationMsg}
                </span>
              ) : null}
            </div>
          </section>
        )}

        <section className="mt-8 rounded-lg border border-[color:var(--color-border)] bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
            {t("account.profileHeading")}
          </h2>
          <form onSubmit={onSaveProfile} className="mt-4 flex flex-col gap-4">
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
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">
                {t("account.localeLabel")}
              </span>
              <select
                value={locale ?? "ro"}
                onChange={(e) =>
                  setLocale(e.target.value as Profile["locale"])
                }
                className="w-full rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]"
              >
                {LOCALE_OPTIONS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            {profileMsg ? (
              <p className="text-xs text-[color:var(--color-muted-foreground)]">
                {profileMsg}
              </p>
            ) : null}
            <div>
              <button
                type="submit"
                disabled={profileSaving}
                className="rounded-md bg-[color:var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {profileSaving ? "…" : t("account.save")}
              </button>
            </div>
          </form>
        </section>

        <section className="mt-6 rounded-lg border border-[color:var(--color-border)] bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
            {t("account.passwordHeading")}
          </h2>
          <form onSubmit={onChangePassword} className="mt-4 flex flex-col gap-4">
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
                required
                autoComplete="current-password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                className="w-full rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">
                {t("account.newPasswordLabel")}
              </span>
              <input
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                className="w-full rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]"
              />
            </label>
            {pwdError ? (
              <p className="text-sm text-red-600" role="alert">
                {pwdError}
              </p>
            ) : null}
            {pwdMsg ? (
              <p className="text-xs text-[color:var(--color-muted-foreground)]">
                {pwdMsg}
              </p>
            ) : null}
            <div>
              <button
                type="submit"
                disabled={pwdSaving}
                className="rounded-md bg-[color:var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {pwdSaving ? "…" : t("account.changePassword")}
              </button>
            </div>
          </form>
        </section>

        <div className="mt-6">
          <button
            type="button"
            onClick={onLogout}
            className="rounded-md border border-[color:var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-[color:var(--color-muted)]"
          >
            {t("account.logout")}
          </button>
        </div>
      </div>
    </>
  );
}
