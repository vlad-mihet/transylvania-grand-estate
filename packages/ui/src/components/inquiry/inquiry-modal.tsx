"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useInquirySubmission, type InquiryLocale } from "@tge/hooks";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@tge/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { AccentButton } from "../shared/accent-button";
import { useInquiryModal } from "./inquiry-context";
import { GdprConsentCheckbox } from "./gdpr-consent-checkbox";
import { HoneypotField } from "./honeypot-field";

export type InquiryTone = "luxury" | "light";

const toneClasses: Record<
  InquiryTone,
  {
    dialogContent: string;
    entityPill: string;
    label: string;
    input: string;
    title: string;
    description: string;
    successIcon: string;
    successText: string;
  }
> = {
  luxury: {
    dialogContent: "bg-background border-copper/10",
    entityPill: "text-copper bg-copper/5 border border-copper/10",
    label: "text-cream-muted",
    input:
      "bg-white/5 border-copper/10 text-cream placeholder:text-cream-muted/50",
    title: "font-serif text-cream",
    description: "text-cream-muted",
    successIcon: "text-copper",
    successText: "text-cream-muted",
  },
  light: {
    dialogContent: "bg-background border-border",
    entityPill: "text-primary bg-primary/10 border border-primary/20",
    label: "text-muted-foreground",
    input:
      "bg-background border-border text-foreground placeholder:text-muted-foreground/50",
    title: "text-foreground",
    description: "text-muted-foreground",
    successIcon: "text-primary",
    successText: "text-muted-foreground",
  },
};

interface InquiryModalProps {
  tone?: InquiryTone;
}

export function InquiryModal({ tone = "light" }: InquiryModalProps) {
  const { isOpen, context, closeInquiry } = useInquiryModal();
  const t = useTranslations("InquiryModal");
  const tConsent = useTranslations("GdprConsent");
  const locale = useLocale() as InquiryLocale;
  const palette = toneClasses[tone];
  // Delegate the submit + analytics-stamping triad to the shared hook so the
  // global modal produces the same `source: "${brand.key}-contact"` and
  // `sourceUrl: window.location.href` payload that the contact-page form does.
  // Without this, every modal-driven inquiry stored `source = NULL` and the
  // dominant lead-capture surface was unattributable.
  const { submit, isSubmitting, isSuccess, error, reset } = useInquirySubmission();
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!consent) {
      setConsentError(tConsent("requiredError"));
      return;
    }
    setConsentError(null);
    const formData = new FormData(e.currentTarget);
    await submit({
      type: context.type,
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      message: String(formData.get("message") ?? ""),
      entityName: context.entityName,
      entitySlug: context.entitySlug,
      gdprConsent: true,
      // Capture the submitter's current UI locale so the confirmation
      // email arrives in the right language and admin replies can match.
      // Falls back to server-side `sourceUrl` regex if absent (older
      // clients during rolling deploy).
      locale,
      // Honeypot — humans never see this field; bots that auto-fill every
      // input land here. The API silently drops the row when non-empty.
      website: String(formData.get("website") ?? ""),
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeInquiry();
      // Defer reset until after the close transition so the success state
      // doesn't visibly snap back to the form mid-fade.
      setTimeout(() => {
        reset();
        setConsent(false);
        setConsentError(null);
      }, 300);
    }
  };

  const title =
    context.type === "property" && context.entityName
      ? t("titleProperty", { name: context.entityName })
      : context.type === "developer" && context.entityName
        ? t("titleDeveloper", { name: context.entityName })
        : t("titleGeneral");

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn("sm:max-w-md", palette.dialogContent)}
        overlayClassName="bg-black/70 backdrop-blur-sm"
      >
        {isSuccess ? (
          <div role="status" aria-live="polite" className="text-center py-4">
            <CheckCircle
              aria-hidden="true"
              className={cn("h-12 w-12 mx-auto mb-4", palette.successIcon)}
            />
            <DialogTitle className={cn("text-xl mb-2", palette.title)}>
              {t("success.title")}
            </DialogTitle>
            <DialogDescription
              className={cn("text-sm", palette.successText)}
            >
              {t("success.message")}
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className={cn("text-xl", palette.title)}>
                {title}
              </DialogTitle>
              <DialogDescription className={cn("text-sm", palette.description)}>
                {t("description")}
              </DialogDescription>
            </DialogHeader>

            {context.entityName && (
              <div
                className={cn("text-xs rounded-md px-3 py-2", palette.entityPill)}
              >
                {context.type === "property" ? t("regarding") : t("about")}{" "}
                <span className="font-medium">{context.entityName}</span>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              aria-busy={isSubmitting}
              className="space-y-4"
            >
              <HoneypotField />
              <div className="space-y-2">
                <Label
                  htmlFor="inquiry-name"
                  className={cn("text-sm", palette.label)}
                >
                  {t("name")}
                </Label>
                <Input
                  id="inquiry-name"
                  name="name"
                  required
                  className={palette.input}
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="inquiry-email"
                  className={cn("text-sm", palette.label)}
                >
                  {t("email")}
                </Label>
                <Input
                  id="inquiry-email"
                  name="email"
                  type="email"
                  required
                  className={palette.input}
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="inquiry-message"
                  className={cn("text-sm", palette.label)}
                >
                  {t("message")}
                </Label>
                <Textarea
                  id="inquiry-message"
                  name="message"
                  required
                  minLength={10}
                  rows={4}
                  placeholder={t("messagePlaceholder")}
                  className={cn("resize-none", palette.input)}
                />
              </div>

              <GdprConsentCheckbox
                id="inquiry-consent"
                checked={consent}
                onCheckedChange={(next) => {
                  setConsent(next);
                  if (next) setConsentError(null);
                }}
                error={consentError}
                tone={tone === "luxury" ? "luxury" : "light"}
              />

              {error && (
                <div
                  role="alert"
                  className="flex items-center gap-2 text-sm text-destructive"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {error || t("error")}
                </div>
              )}

              <AccentButton
                type="submit"
                className="w-full"
                disabled={isSubmitting || !consent}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("submit")
                )}
              </AccentButton>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
