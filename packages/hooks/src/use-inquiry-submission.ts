import { useState } from "react";
import { mutateApi } from "@tge/api-client";
import { getBrand } from "@tge/branding";

export type InquiryType =
  | "general"
  | "property"
  | "developer"
  | "viewing"
  | "valuation";

/**
 * Privacy-policy revision the consent checkbox refers to. Bump when copy or
 * data-handling materially changes — past consent rows keep the old version
 * so we can prove what each user agreed to. Format: ISO date.
 */
export const PRIVACY_POLICY_VERSION = "2026-05-10";

export interface InquiryPayload {
  name: string;
  email: string;
  phone?: string;
  message: string;
  budget?: string;
  propertySlug?: string;
  entityName?: string;
  entitySlug?: string;
  type?: InquiryType;
  // Overrides the auto-derived `${brand.key}-contact` source. Useful when a
  // specific surface (e.g. a property detail sidebar) needs its own tag for
  // attribution without depending on the caller to know the brand key.
  source?: string;
  sourceUrl?: string;
  // GDPR consent. `gdprConsent` MUST be true — the API rejects anything else.
  // `marketingConsent` is the optional opt-in for promotional emails.
  // `gdprConsentVersion` defaults to the constant above so callers don't need
  // to know it; the server pins it to the row.
  gdprConsent: true;
  marketingConsent?: boolean;
  gdprConsentVersion?: string;
  // Honeypot pass-through. Forms wire this from FormData; humans always send
  // empty, bots usually fill it with a URL. Server silently drops non-empty.
  website?: string;
}

export interface UseInquirySubmissionOptions {
  type?: InquiryType;
  sourceSuffix?: string;
  onSuccess?: () => void;
}

export interface InquirySubmissionState {
  submit: (payload: InquiryPayload) => Promise<void>;
  isSubmitting: boolean;
  isSuccess: boolean;
  error: string | null;
  reset: () => void;
}

/**
 * Shared state machine for posting to `POST /inquiries` from any contact
 * form. Encapsulates the loading/success/error triad and stamps the payload
 * with a brand-derived `source` so analytics can attribute inquiries without
 * the caller hardcoding "tge-contact" / "revery-contact".
 */
export function useInquirySubmission(
  options: UseInquirySubmissionOptions = {},
): InquirySubmissionState {
  const { type = "general", sourceSuffix = "contact", onSuccess } = options;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (payload: InquiryPayload): Promise<void> => {
    setIsSubmitting(true);
    setError(null);
    try {
      await mutateApi("/inquiries", {
        body: {
          ...payload,
          type: payload.type ?? type,
          source: payload.source ?? `${getBrand().key}-${sourceSuffix}`,
          sourceUrl:
            payload.sourceUrl ??
            (typeof window !== "undefined" ? window.location.href : undefined),
          gdprConsentVersion:
            payload.gdprConsentVersion ?? PRIVACY_POLICY_VERSION,
          marketingConsent: payload.marketingConsent ?? false,
        },
      });
      setIsSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = (): void => {
    setIsSuccess(false);
    setError(null);
  };

  return { submit, isSubmitting, isSuccess, error, reset };
}
