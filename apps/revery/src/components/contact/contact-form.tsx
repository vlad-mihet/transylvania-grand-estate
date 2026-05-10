"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useInquirySubmission } from "@tge/hooks";
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
  const { submit, isSubmitting, isSuccess, error } = useInquirySubmission();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    budget: "",
    message: "",
  });
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!consent) {
      setConsentError(tConsent("requiredError"));
      return;
    }
    setConsentError(null);
    const fd = new FormData(e.currentTarget);
    await submit({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      budget: formData.budget,
      message: formData.message,
      gdprConsent: true,
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
            required
            value={formData.name}
            onChange={(e) => updateField("name", e.target.value)}
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
            required
            type="email"
            value={formData.email}
            onChange={(e) => updateField("email", e.target.value)}
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
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            pattern="^\+?[0-9 ]{8,15}$"
            placeholder="+40 712 345 678"
            title={t("form.phonePlaceholder")}
            value={formData.phone}
            onChange={(e) => updateField("phone", e.target.value)}
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
          <Select
            value={formData.budget}
            onValueChange={(value) => updateField("budget", value)}
          >
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
          required
          rows={5}
          value={formData.message}
          onChange={(e) => updateField("message", e.target.value)}
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
