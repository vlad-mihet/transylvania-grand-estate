"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { AuthError, useAuth } from "./auth-provider";
import { Button, Input, Label } from "@tge/ui";
import { AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { PasswordField } from "./password-field";
import { GoogleSsoButton } from "./google-sso-button";

/**
 * Map OAuth-callback error codes (set by the API when it redirects back to
 * `/login?error=<code>`) to translation keys. Codes not in the map fall
 * through to the generic `oauthFailed` message.
 */
const OAUTH_ERROR_KEYS: Record<
  string,
  | "errorNoAccount"
  | "errorEmailMismatch"
  | "errorEmailUnverified"
  | "errorGoogleNotConfigured"
  | "errorStateInvalid"
  | "errorOAuthFailed"
> = {
  no_account: "errorNoAccount",
  email_mismatch: "errorEmailMismatch",
  email_unverified: "errorEmailUnverified",
  google_not_configured: "errorGoogleNotConfigured",
  state_invalid: "errorStateInvalid",
  oauth_failed: "errorOAuthFailed",
  oauth_handoff: "errorOAuthFailed",
};

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const t = useTranslations("Login");
  const searchParams = useSearchParams();
  const googleEnabled =
    process.env.NEXT_PUBLIC_SSO_GOOGLE_ENABLED === "true";

  // Surface OAuth-callback errors (redirected here with ?error=<code>) on
  // first paint. Local form errors override it on next submission. We don't
  // strip the query param — if the user refreshes, they see the same cause.
  useEffect(() => {
    const code = searchParams?.get("error");
    if (!code) return;
    const key = OAUTH_ERROR_KEYS[code] ?? "errorOAuthFailed";
    setError(t(key));
  }, [searchParams, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const authed = await login(email, password);
      router.push(authed.role === "AGENT" ? "/my-listings" : "/");
    } catch (err) {
      if (err instanceof AuthError && err.status === 429) {
        setError(t("errorRateLimited"));
      } else {
        setError(err instanceof Error ? err.message : t("loginFailed"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-sm border border-[color-mix(in_srgb,var(--color-danger)_30%,var(--border))] bg-[var(--color-danger-bg)] px-3 py-2 text-xs text-[var(--color-danger)]"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs font-medium">
          {t("email")}
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mono h-9"
          autoFocus
          required
        />
      </div>

      <PasswordField
        id="password"
        name="password"
        label={t("password")}
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <Button
        type="submit"
        className="h-9 w-full"
        disabled={loading || !email || !password}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            {t("signingIn")}
          </>
        ) : (
          t("signInButton")
        )}
      </Button>

      {googleEnabled && (
        <>
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" aria-hidden />
            <span className="mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {t("or")}
            </span>
            <span className="h-px flex-1 bg-border" aria-hidden />
          </div>

          <GoogleSsoButton label={t("ssoGoogle")} />
        </>
      )}
    </form>
  );
}
