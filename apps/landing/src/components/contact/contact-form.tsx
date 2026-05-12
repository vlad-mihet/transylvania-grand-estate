"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Input } from "@tge/ui";
import { Textarea } from "@tge/ui";
import { Label } from "@tge/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tge/ui";
import { AccentButton, GdprConsentCheckbox, HoneypotField } from "@tge/ui";
import { CheckCircle, Loader2 } from "lucide-react";
import { useInquirySubmission, type InquiryLocale } from "@tge/hooks";

interface ContactFormProps {
  properties: { id: string; slug: string; title: string }[];
}

// Permissive E.164-style check: optional leading +, then 8-15 digits with
// optional spaces. Catches "abc" or "12" without rejecting common Romanian /
// EU formats. We keep it on the loose side because phone-number formatting
// varies wildly and a stricter regex would block legitimate submissions.
const PHONE_PATTERN = "^\\+?[0-9 ]{8,15}$";

export function ContactForm({ properties }: ContactFormProps) {
  const t = useTranslations("ContactPage.form");
  const tConsent = useTranslations("GdprConsent");
  const locale = useLocale() as InquiryLocale;
  const searchParams = useSearchParams();
  const {
    submit,
    isSubmitting: loading,
    isSuccess: submitted,
    error,
  } = useInquirySubmission();
  const [budget, setBudget] = useState("");
  const [propertySlug, setPropertySlug] = useState("");
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  // BUG-016 fix: property-detail "Request info" links pass `?property=<slug>`
  // so the contact form can pre-select the property and skip a step. The
  // effect runs once on mount and falls back gracefully when the slug isn't
  // in the listed properties (just leaves the dropdown empty).
  useEffect(() => {
    const fromUrl = searchParams.get("property");
    if (!fromUrl) return;
    const match = properties.find((p) => p.slug === fromUrl);
    if (match) setPropertySlug(match.slug);
  }, [searchParams, properties]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!consent) {
      setConsentError(tConsent("requiredError"));
      return;
    }
    setConsentError(null);
    const formData = new FormData(e.currentTarget);
    await submit({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: (formData.get("phone") as string | null) || undefined,
      message: String(formData.get("message") ?? ""),
      budget: budget || undefined,
      propertySlug: propertySlug || undefined,
      gdprConsent: true,
      locale,
      website: String(formData.get("website") ?? ""),
    });
  };

  if (submitted) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="frosted-glass p-8 md:p-12 text-center"
      >
        <CheckCircle className="h-16 w-16 text-copper mx-auto mb-6" />
        <h3 className="font-serif text-2xl text-cream mb-2">
          {t("success.title")}
        </h3>
        <p className="text-cream-muted">{t("success.message")}</p>
      </div>
    );
  }

  return (
    <div className="frosted-glass p-8 md:p-14">
      <h2 className="font-serif text-2xl text-cream mb-8 text-center">
        {t("title")}
      </h2>
      <form onSubmit={handleSubmit} aria-busy={loading} className="space-y-6">
        <HoneypotField />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-cream-muted">
              {t("fullName")}
            </Label>
            <Input
              id="name"
              name="name"
              required
              className="bg-white/5 border-copper/10 text-cream placeholder:text-cream-muted/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-cream-muted">
              {t("email")}
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              className="bg-white/5 border-copper/10 text-cream placeholder:text-cream-muted/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-cream-muted">
              {t("phone")}
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              pattern={PHONE_PATTERN}
              placeholder="+40 712 345 678"
              title={t("phonePlaceholder")}
              className="bg-white/5 border-copper/10 text-cream placeholder:text-cream-muted/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-budget" className="text-cream-muted">
              {t("budget")}
            </Label>
            <Select value={budget} onValueChange={setBudget}>
              <SelectTrigger
                id="contact-budget"
                aria-label={t("budget")}
                className="bg-white/5 border-copper/10 text-cream"
              >
                <SelectValue placeholder={t("selectBudget")} />
              </SelectTrigger>
              <SelectContent className="bg-popover border-copper/10">
                <SelectItem value="1-1.5">{t("budgetOptions.1to15")}</SelectItem>
                <SelectItem value="1.5-2">{t("budgetOptions.15to2")}</SelectItem>
                <SelectItem value="2-3">{t("budgetOptions.2to3")}</SelectItem>
                <SelectItem value="3+">{t("budgetOptions.3plus")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-property" className="text-cream-muted">
            {t("property")}
          </Label>
          <Select value={propertySlug} onValueChange={setPropertySlug}>
            <SelectTrigger
              id="contact-property"
              aria-label={t("property")}
              className="bg-white/5 border-copper/10 text-cream"
            >
              <SelectValue placeholder={t("selectProperty")} />
            </SelectTrigger>
            <SelectContent className="bg-popover border-copper/10">
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.slug}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message" className="text-cream-muted">
            {t("message")}
          </Label>
          <Textarea
            id="message"
            name="message"
            required
            minLength={10}
            rows={5}
            placeholder={t("messagePlaceholder")}
            className="bg-white/5 border-copper/10 text-cream placeholder:text-cream-muted/50 resize-none"
          />
        </div>

        <GdprConsentCheckbox
          id="contact-consent"
          checked={consent}
          onCheckedChange={(next) => {
            setConsent(next);
            if (next) setConsentError(null);
          }}
          error={consentError}
          tone="luxury"
        />

        {error && (
          <p role="alert" className="text-red-400 text-sm">
            {error}
          </p>
        )}

        <AccentButton
          type="submit"
          className="w-full mt-3"
          size="lg"
          disabled={loading || !consent}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            t("submit")
          )}
        </AccentButton>
      </form>
    </div>
  );
}
