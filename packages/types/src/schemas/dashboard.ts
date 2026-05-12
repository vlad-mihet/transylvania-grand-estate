import { z } from "zod";

/**
 * Aggregator response for `GET /admin/dashboard/attention`. Each field is a
 * count of items needing operator attention; `null` means the caller's role
 * doesn't include that capability and the field was omitted server-side.
 *
 * The front-end renders one tile per non-null field. The number is always a
 * non-negative integer when present — there's no "loading" sentinel; the
 * client uses React Query's loading state for that.
 */
export const dashboardAttentionSchema = z.object({
  newInquiries: z.number().int().min(0),
  draftArticles: z.number().int().min(0),
  missingEnTotal: z.number().int().min(0),
  pendingAcademyInvitations: z.number().int().min(0).nullable(),
  suspendedUsers: z.number().int().min(0).nullable(),
  auditFailuresSinceBoot: z.number().int().min(0).nullable(),
});

export type DashboardAttention = z.infer<typeof dashboardAttentionSchema>;
