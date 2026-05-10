-- GDPR consent record on inquiries. Three new columns:
--   gdpr_consent_version  policy revision the user agreed to (audit trail)
--   marketing_consent     separate opt-in for promotional emails (default off)
--   consented_at          server-stamped timestamp of when consent was given
--
-- All three are nullable / defaulted so existing rows keep working without
-- backfill. The Zod DTO enforces gdprConsent: true on every NEW submission,
-- and the service writes consented_at = now() when the row is created. Older
-- inquiries (pre-consent-checkbox) leave consented_at NULL — that's the
-- documented signal for "this row predates GDPR Art.7 capture".
ALTER TABLE "inquiries"
  ADD COLUMN "gdpr_consent_version" VARCHAR(40),
  ADD COLUMN "marketing_consent"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "consented_at"         TIMESTAMP(3);
