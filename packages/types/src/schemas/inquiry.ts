import { z } from "zod";
import { InquiryStatus, InquiryType } from "@prisma/client";
import { paginationSchema } from "./_primitives";

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
    // caller's brand key (e.g. "tge-contact", "reveria-property-detail");
    // accept it so the API can attribute inquiries.
    source: z.string().max(120).optional(),
    sourceUrl: z.string().url().max(500).optional(),
  })
  .strict();

export const queryInquirySchema = paginationSchema.extend({
  type: z.nativeEnum(InquiryType).optional(),
  status: z.nativeEnum(InquiryStatus).optional(),
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
