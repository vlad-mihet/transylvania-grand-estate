"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@tge/utils";
import { Checkbox } from "../ui/checkbox";

export type GdprConsentTone = "luxury" | "light";

interface GdprConsentCheckboxProps {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  /** Optional id; needed when label is rendered separately. Defaults to "gdpr-consent". */
  id?: string;
  /** Surface a server-side or post-submit error inline (e.g. when validation rejected the missing tick). */
  error?: string | null;
  /**
   * Where the "privacy policy" anchor points. Each app sets its own route.
   * Default `/privacy` matches the convention in both landing and revery.
   */
  privacyHref?: string;
  tone?: GdprConsentTone;
  className?: string;
}

const toneClasses: Record<
  GdprConsentTone,
  { label: string; link: string; checkbox: string }
> = {
  luxury: {
    label: "text-cream-muted",
    link: "text-copper underline underline-offset-4 hover:text-copper/80",
    checkbox: "border-copper/30 data-[state=checked]:bg-copper",
  },
  light: {
    label: "text-muted-foreground",
    link: "text-primary underline underline-offset-4 hover:text-primary/80",
    checkbox: "",
  },
};

/**
 * Required GDPR consent checkbox shared across every contact-flow surface
 * (landing + revery contact pages, property detail card, inquiry modal). The
 * label embeds a link to the privacy policy via next-intl's rich-text
 * placeholder so each locale controls word order — French "J'accepte la
 * <link>politique de confidentialité</link>" doesn't sit naturally as a
 * suffix in English. Strings live under the `GdprConsent` namespace in each
 * app's `messages/*.json`.
 */
export function GdprConsentCheckbox({
  checked,
  onCheckedChange,
  id = "gdpr-consent",
  error,
  privacyHref = "/privacy",
  tone = "light",
  className,
}: GdprConsentCheckboxProps) {
  const t = useTranslations("GdprConsent");
  const palette = toneClasses[tone];
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-start gap-2.5">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(next) => onCheckedChange(next === true)}
          required
          aria-required="true"
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={cn("mt-0.5", palette.checkbox)}
        />
        <label
          htmlFor={id}
          className={cn("text-sm leading-snug", palette.label)}
        >
          {t.rich("requiredLabel", {
            link: (chunks) => (
              <a
                href={privacyHref}
                target="_blank"
                rel="noopener noreferrer"
                className={palette.link}
              >
                {chunks}
              </a>
            ),
          })}
        </label>
      </div>
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-sm text-destructive ml-7"
        >
          {error}
        </p>
      )}
    </div>
  );
}
