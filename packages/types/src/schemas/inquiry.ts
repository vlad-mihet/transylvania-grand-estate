import { z } from "zod";
import { InquiryStatus, InquiryType } from "@prisma/client";
import { paginationSchema } from "./_primitives";

/**
 * Submitter locale at submission time. Optional in PR 4a so the rolling
 * deploy doesn't break in-flight payloads from old clients; the server
 * derives from `sourceUrl` regex as a fallback. PR 4c tightens by making
 * the DB column NOT NULL and requiring this field at the schema layer.
 */
const inquiryLocaleSchema = z.enum(["ro", "en", "fr", "de"]);

/**
 * Inquiry — a customer contact submission. The public form endpoint accepts
 * create payloads anonymously; admin endpoints read and update status.
 * Mirrors `apps/api/src/inquiries/dto/*`.
 */
export const createInquirySchema = z
  .object({
    type: z.nativeEnum(InquiryType).optional(),
    name: z.string().min(2).max(100),
    email: z.string().email().max(200),
    phone: z.string().max(40).optional(),
    message: z.string().min(10).max(2000),
    entityName: z.string().max(200).optional(),
    entitySlug: z.string().max(200).optional(),
    budget: z.string().max(100).optional(),
    propertySlug: z.string().max(200).optional(),
    // `source` is stamped by the shared `useInquirySubmission` hook with the
    // caller's brand key (e.g. "tge-contact", "revery-property-detail");
    // accept it so the API can attribute inquiries.
    source: z.string().max(120).optional(),
    sourceUrl: z.string().url().max(500).optional(),
    // GDPR Art.7 consent. The privacy checkbox must be ticked — `z.literal(true)`
    // rejects any submission missing the explicit opt-in. `gdprConsentVersion`
    // identifies the policy revision the user agreed to so we can prove later
    // exactly what they were shown. `marketingConsent` is the separate
    // (optional) opt-in for promotional emails; must default false per GDPR.
    gdprConsent: z.literal(true, {
      message: "You must accept the privacy policy to send your message.",
    }),
    gdprConsentVersion: z.string().max(40).optional(),
    marketingConsent: z.boolean().optional().default(false),
    // Honeypot. The form renders a hidden `<input name="website">` with
    // tabindex=-1 + display:none. Humans never see it, bots that auto-fill
    // every field will. The service accepts the submission shape but skips
    // persistence + emails when this is non-empty, returning a fabricated
    // 201 so a probing bot can't detect the trap. Permissive at the schema
    // layer (any short string) so we don't 4xx and tip the bot off.
    website: z.string().max(120).optional(),
    // Submitter UI locale at submission time. Optional so older clients
    // (deployed during a rolling release) don't fail the `.strict()`
    // check; the service falls back to `deriveSubmitterLocale(sourceUrl)`
    // when absent.
    locale: inquiryLocaleSchema.optional(),
  })
  .strict();

/**
 * SiteId values stored on the Inquiry row (see prisma migration
 * 20260510140000_add_inquiry_site_app_softdelete). Mirrors the public-facing
 * subset of common/site/site.types.ts SiteId — ADMIN/UNKNOWN never persist.
 */
export const inquirySiteIdSchema = z.enum(["TGE_LUXURY", "REVERY", "ACADEMY"]);

/**
 * Originating-app code for the unified queue's source filter chips.
 */
export const inquiryAppSchema = z.enum(["landing", "revery", "academy", "admin"]);

export const queryInquirySchema = paginationSchema.extend({
  // Kanban pulls the whole active board in one request (no board pagination),
  // so inquiries raises the shared max(100) cap. Service still clamps in query.
  limit: z.coerce.number().int().min(1).max(500).default(12),
  type: z.nativeEnum(InquiryType).optional(),
  status: z.nativeEnum(InquiryStatus).optional(),
  siteId: inquirySiteIdSchema.optional(),
  app: inquiryAppSchema.optional(),
  // Source filter — case-insensitive substring match against the `source`
  // tag stamped at submission time (e.g. "tge-property-detail",
  // "revery-contact"). Lets admins triage by originating surface.
  source: z.string().max(120).optional(),
  // Admin-only escape hatch: include soft-deleted rows (deletedAt IS NOT NULL).
  // Coerced from string because query strings serialise everything as text.
  includeDeleted: z
    .union([z.boolean(), z.enum(["0", "1", "true", "false"])])
    .transform((v) => v === true || v === "1" || v === "true")
    .optional(),
});

export const updateInquiryStatusSchema = z
  .object({
    status: z.nativeEnum(InquiryStatus),
  })
  .strict();

export type CreateInquiryInput = z.infer<typeof createInquirySchema>;
export type QueryInquiryInput = z.infer<typeof queryInquirySchema>;
export type UpdateInquiryStatusInput = z.infer<
  typeof updateInquiryStatusSchema
>;
