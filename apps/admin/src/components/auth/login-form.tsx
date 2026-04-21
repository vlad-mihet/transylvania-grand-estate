"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "./auth-provider";
import { Button, Input, Label } from "@tge/ui";
import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCapsLock } from "@/hooks/use-caps-lock";
import { BRAND } from "@/lib/config/brand";
import { cn } from "@tge/utils";

/**
 * Google "G" monochrome mark. Inline SVG so we don't ship a brand asset
 * for a placeholder button. Replace with the real Google wordmark when the
 * OAuth integration lands.
 */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M12 4.75c2.04 0 3.88.7 5.33 2.06l3.96-3.96C18.95 0.7 15.7 -0.5 12 -0.5 7.39 -0.5 3.4 2.08 1.39 5.84l4.62 3.58C6.99 6.6 9.26 4.75 12 4.75zM23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.28 1.48-1.12 2.73-2.39 3.58l3.69 2.86c2.15-1.99 3.72-4.93 3.72-8.68zM5.96 14.42a6.85 6.85 0 0 1-.37-2.17c0-.75.13-1.48.36-2.17L1.33 6.5A11.45 11.45 0 0 0 .5 12.25c0 1.85.45 3.6 1.23 5.14l4.23-3.02zM12 24c3.24 0 5.96-1.08 7.94-2.92l-3.69-2.86c-1.04.7-2.38 1.1-4.25 1.1-2.74 0-5.01-1.85-5.99-4.66l-4.6 3.57C3.3 21.93 7.39 24 12 24z" />
    </svg>
  );
}

/**
 * Minimal Microsoft four-square mark, monochrome. Swap for the brand
 * quad-color SVG when Entra OAuth lands.
 */
function MicrosoftMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <rect x="1" y="1" width="10" height="10" fill="currentColor" />
      <rect x="13" y="1" width="10" height="10" fill="currentColor" opacity="0.7" />
      <rect x="1" y="13" width="10" height="10" fill="currentColor" opacity="0.7" />
      <rect x="13" y="13" width="10" height="10" fill="currentColor" />
    </svg>
  );
}

/**
 * Map OAuth-callback error codes (set by the API when it redirects back to
 * `/login?error=<code>`) to translation keys. Codes not in the map fall
 * through to the generic `oauthFailed` message.
 */
const OAUTH_ERROR_KEYS: Record<
  string,
  "errorNoAccount" | "errorEmailMismatch" | "errorEmailUnverified" | "errorGoogleNotConfigured" | "errorStateInvalid" | "errorOAuthFailed"
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
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const capsLockOn = useCapsLock(passwordRef);
  const { login } = useAuth();
  const router = useRouter();
  const t = useTranslations("Login");
  const searchParams = useSearchParams();

  // Surface OAuth-callback errors (redirected here with ?error=<code>) on
  // first paint. Local form errors override it on next submission. We don't
  // strip the query param \u2014 if the user refreshes, they see the same cause.
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
      setError(err instanceof Error ? err.message : t("loginFailed"));
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
          placeholder={BRAND.supportEmail}
          className="mono h-9"
          autoFocus
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-xs font-medium">
          {t("password")}
        </Label>
        <div className="relative">
          <Input
            id="password"
            ref={passwordRef}
            type={revealed ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-9 pr-9"
            required
          />
          <button
            type="button"
            tabIndex={0}
            onClick={() => setRevealed((r) => !r)}
            aria-pressed={revealed}
            aria-label={revealed ? t("hidePassword") : t("showPassword")}
            className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-sm text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {revealed ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        {capsLockOn && (
          <p
            aria-live="polite"
            className="mono flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-[var(--color-warning)]"
          >
            <Lock className="h-3 w-3" />
            {t("capsLockOn")}
          </p>
        )}
      </div>

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

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" aria-hidden />
        <span className="mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {t("or")}
        </span>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>

      <div className="space-y-2">
        {process.env.NEXT_PUBLIC_SSO_GOOGLE_ENABLED === "true" ? (
          <GoogleSsoLink label={t("ssoGoogle")} />
        ) : (
          <SsoButton
            icon={<GoogleMark className="h-3.5 w-3.5" />}
            label={t("ssoGoogle")}
            tooltip={t("ssoComingSoon")}
          />
        )}
        <SsoButton
          icon={<MicrosoftMark className="h-3.5 w-3.5" />}
          label={t("ssoMicrosoft")}
          tooltip={t("ssoComingSoon")}
        />
      </div>
    </form>
  );
}

interface SsoButtonProps {
  icon: React.ReactNode;
  label: string;
  tooltip: string;
}

function SsoButton({ icon, label, tooltip }: SsoButtonProps) {
  return (
    <button
      type="button"
      disabled
      title={tooltip}
      className={cn(
        "group flex h-9 w-full items-center gap-2.5 rounded-md border border-border bg-card px-3 text-left text-xs font-medium text-foreground/80 transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-70",
      )}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      <span className="mono rounded-sm bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
        <KeyRound className="mr-0.5 inline h-2.5 w-2.5 align-text-top" />
        {tooltip}
      </span>
    </button>
  );
}

/**
 * Browser redirect to the API's Google OAuth start endpoint. Rendered as an
 * anchor (not a button+JS) so it survives JS-disabled environments and
 * keeps the referrer policy simple. No invitation param on the login
 * surface — that path is for returning users.
 */
function GoogleSsoLink({ label }: { label: string }) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const href = apiUrl ? `${apiUrl}/auth/google` : "#";
  return (
    <a
      href={href}
      className={cn(
        "group flex h-9 w-full items-center gap-2.5 rounded-md border border-border bg-card px-3 text-left text-xs font-medium text-foreground/80 transition-colors",
        "hover:bg-muted hover:text-foreground",
      )}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        <GoogleMark className="h-3.5 w-3.5" />
      </span>
      <span className="flex-1 truncate">{label}</span>
    </a>
  );
}
