"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { GdprConsentCheckbox, HoneypotField } from "@tge/ui";
import { CheckCircle, Loader2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/app-header";

const PRIVACY_POLICY_VERSION = "2026-05-10";

/**
 * Academy support form. Posts to the unified /inquiries endpoint with
 * `app: "academy"` (server-derived from X-Site=ACADEMY). Logged-in students
 * have their name + email pre-filled from useSession; anonymous visitors
 * enter both manually. Closes the C-1 gap from the contact-flow audit —
 * Academy was the only public app without a contact channel.
 */
export default function SupportPage() {
  const t = useTranslations("Support");
  const tConsent = useTranslations("GdprConsent");
  const session = useSession();

  const initialName = session.profile?.name ?? "";
  const initialEmail = session.profile?.email ?? "";

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!consent) {
      setConsentError(tConsent("requiredError"));
      return;
    }
    setConsentError(null);
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      await apiFetch("/inquiries", {
        method: "POST",
        skipAuth: true,
        body: {
          type: "general",
          name,
          email,
          // Topic is concatenated into the message body so it surfaces in the
          // admin queue without requiring a dedicated subject column.
          message: topic ? `[${topic}] ${message}` : message,
          source: "academy-support",
          sourceUrl:
            typeof window !== "undefined" ? window.location.href : undefined,
          gdprConsent: true,
          gdprConsentVersion: PRIVACY_POLICY_VERSION,
          marketingConsent: false,
          website: String(fd.get("website") ?? ""),
        },
      });
      setSubmitted(true);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("genericError");
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader />
        <main className="container mx-auto flex flex-1 items-center justify-center px-6 py-16">
          <div
            role="status"
            aria-live="polite"
            className="max-w-lg rounded-2xl border border-border bg-card p-10 text-center shadow-sm"
          >
            <CheckCircle
              aria-hidden="true"
              className="mx-auto mb-4 h-14 w-14 text-primary"
            />
            <h1 className="mb-2 text-2xl font-semibold text-foreground">
              {t("success.title")}
            </h1>
            <p className="text-muted-foreground">{t("success.message")}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="container mx-auto max-w-2xl px-6 py-16 md:py-20">
        <h1 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">
          {t("title")}
        </h1>
        <p className="mb-10 text-lg text-muted-foreground">{t("subtitle")}</p>

        <form
          onSubmit={handleSubmit}
          aria-busy={submitting}
          className="space-y-5"
        >
          <HoneypotField />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label
                htmlFor="support-name"
                className="block text-sm font-medium text-foreground"
              >
                {t("form.name")}
              </label>
              <input
                id="support-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="support-email"
                className="block text-sm font-medium text-foreground"
              >
                {t("form.email")}
              </label>
              <input
                id="support-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="support-topic"
              className="block text-sm font-medium text-foreground"
            >
              {t("form.topic")}
            </label>
            <select
              id="support-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={submitting}
              className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
            >
              <option value="">{t("form.topicPlaceholder")}</option>
              <option value="account">{t("form.topics.account")}</option>
              <option value="course">{t("form.topics.course")}</option>
              <option value="payment">{t("form.topics.payment")}</option>
              <option value="bug">{t("form.topics.bug")}</option>
              <option value="other">{t("form.topics.other")}</option>
            </select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="support-message"
              className="block text-sm font-medium text-foreground"
            >
              {t("form.message")}
            </label>
            <textarea
              id="support-message"
              required
              minLength={10}
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("form.messagePlaceholder")}
              disabled={submitting}
              className="block w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
            />
          </div>

          <GdprConsentCheckbox
            id="support-consent"
            checked={consent}
            onCheckedChange={(next) => {
              setConsent(next);
              if (next) setConsentError(null);
            }}
            error={consentError}
            tone="light"
            privacyHref="/privacy"
          />

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !consent}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("form.submit")
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
