"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useInquirySubmission, type InquiryLocale } from "@tge/hooks";
import {
  Button,
  GdprConsentCheckbox,
  HoneypotField,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tge/ui";
import { CheckCircle } from "lucide-react";

const BUDGET_OPTIONS = [
  { value: "under50k", labelKey: "under50k" },
  { value: "50kTo100k", labelKey: "50kTo100k" },
  { value: "100kTo200k", labelKey: "100kTo200k" },
  { value: "200kTo500k", labelKey: "200kTo500k" },
  { value: "500kTo1m", labelKey: "500kTo1m" },
] as const;

export function ContactForm() {
  const t = useTranslations("ContactPage");
  const tConsent = useTranslations("GdprConsent");
  const locale = useLocale() as InquiryLocale;
  const { submit, isSubmitting, isSuccess, error } = useInquirySubmission();
  // Text fields are UNCONTROLLED (read from FormData on submit) — a controlled
  // useState binding lost keystrokes typed before React hydrated on WebKit: the
  // name went into the DOM with no listener attached, then the first later state
  // update reconciled `value` back to "" and wiped it (BUG-110). Uncontrolled
  // inputs keep pre-hydration keystrokes, matching the landing contact form.
  // Only `budget` (a Select, chosen post-hydration) and `consent` stay stateful.
  const [budget, setBudget] = useState("");
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!consent) {
      setConsentError(tConsent("requiredError"));
      return;
    }
    setConsentError(null);
    const fd = new FormData(e.currentTarget);
    await submit({
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      budget,
      message: String(fd.get("message") ?? ""),
      gdprConsent: true,
      locale,
      website: String(fd.get("website") ?? ""),
    });
  };

  const submitError = error ? (error ?? t("form.error.generic")) : null;

  if (isSuccess) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <CheckCircle className="h-16 w-16 text-primary mx-auto mb-6" />
        <h2 className="text-3xl font-bold text-foreground mb-4">
          {t("form.success.title")}
        </h2>
        <p className="text-muted-foreground text-lg">
          {t("form.success.message")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={isSubmitting} className="space-y-6">
      <HoneypotField />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label
            htmlFor="contact-name"
            className="text-[11px] text-muted-foreground uppercase tracking-[0.18em] font-medium"
          >
            {t("form.fullName")}
          </Label>
          <Input
            id="contact-name"
            name="name"
            required
            className="h-11 rounded-lg border-border text-foreground placeholder:text-muted-foreground hover:border-primary focus-visible:border-primary focus-visible:ring-primary focus-visible:ring-[3px]"
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="contact-email"
            className="text-[11px] text-muted-foreground uppercase tracking-[0.18em] font-medium"
          >
            {t("form.email")}
          </Label>
          <Input
            id="contact-email"
            name="email"
            required
            type="email"
            className="h-11 rounded-lg border-border text-foreground placeholder:text-muted-foreground hover:border-primary focus-visible:border-primary focus-visible:ring-primary focus-visible:ring-[3px]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label
            htmlFor="contact-phone"
            className="text-[11px] text-muted-foreground uppercase tracking-[0.18em] font-medium"
          >
            {t("form.phone")}
          </Label>
          <Input
            id="contact-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            pattern="^\+?[0-9 ]{8,15}$"
            placeholder="+40 712 345 678"
            title={t("form.phonePlaceholder")}
            className="h-11 rounded-lg border-border text-foreground placeholder:text-muted-foreground hover:border-primary focus-visible:border-primary focus-visible:ring-primary focus-visible:ring-[3px]"
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="contact-budget"
            className="text-[11px] text-muted-foreground uppercase tracking-[0.18em] font-medium"
          >
            {t("form.budget")}
          </Label>
          <Select value={budget} onValueChange={setBudget}>
            <SelectTrigger
              id="contact-budget"
              aria-label={t("form.budget")}
              className="w-full h-11 rounded-lg border-border text-foreground hover:border-primary focus-visible:border-primary focus-visible:ring-primary focus-visible:ring-[3px]"
            >
              <SelectValue placeholder={t("form.selectBudget")} />
            </SelectTrigger>
            <SelectContent>
              {BUDGET_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(`form.budgetOptions.${option.labelKey}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="contact-message"
          className="text-[11px] text-muted-foreground uppercase tracking-[0.18em] font-medium"
        >
          {t("form.message")}
        </Label>
        <Textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          placeholder={t("form.messagePlaceholder")}
          className="rounded-lg border-border text-foreground placeholder:text-muted-foreground hover:border-primary focus-visible:border-primary focus-visible:ring-primary focus-visible:ring-[3px] resize-none"
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
        tone="light"
      />

      {submitError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {submitError}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting || !consent}
        className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {isSubmitting ? "..." : t("form.submit")}
      </Button>
    </form>
  );
}
