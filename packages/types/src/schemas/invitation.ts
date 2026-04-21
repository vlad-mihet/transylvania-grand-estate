import { z } from "zod";
import { AdminRole } from "@prisma/client";
import { passwordPolicy } from "./auth";
import { createAgentSchema } from "./agent";

/**
 * Admin creates an invitation for a new AGENT: reuses the Agent profile
 * shape (firstName, lastName, email, phone, slug, bio, photo…) plus an
 * optional expiry knob. The API creates the Agent row and Invitation row in
 * a single transaction — the admin fills one form, not two.
 */
/**
 * Locale of the invitation email. Only `en` and `ro` are rendered today
 * (see `apps/api/src/email/templates/agent-invitation.template.ts`);
 * validating at the schema lets the admin UI fail the field rather than
 * sending an unsupported locale upstream.
 */
export const invitationLocaleSchema = z.enum(['en', 'ro']);

export const inviteAgentSchema = createAgentSchema
  .extend({
    expiresInDays: z.number().int().min(1).max(30).optional(),
    locale: invitationLocaleSchema.optional(),
  })
  .strict();

/**
 * Invite an agent that already exists in the DB but has no AdminUser link.
 * The agent record is reused \u2014 only the invitation is created.
 */
export const inviteExistingAgentSchema = z
  .object({
    expiresInDays: z.number().int().min(1).max(30).optional(),
    locale: invitationLocaleSchema.optional(),
  })
  .strict();

/**
 * Public: called by the accept-invite page on mount with the plaintext token
 * from the email link. Returns invitation metadata so the UI can greet the
 * agent by name, or a 404/410 if the token is unknown/expired/revoked.
 * Min/max bounds loose enough to survive transport encodings.
 */
export const verifyInvitationSchema = z
  .object({
    token: z.string().min(16).max(256),
  })
  .strict();

/**
 * Public: accept via password. Password rules match the existing policy
 * used by register + change-password so the UI can reuse the same hint
 * copy and inline validators.
 */
export const acceptInvitationWithPasswordSchema = z
  .object({
    token: z.string().min(16).max(256),
    password: passwordPolicy,
  })
  .strict();

/**
 * Admin list filter. Status normalised to lowercase strings at the schema
 * boundary; the service maps to the Prisma enum.
 */
export const listInvitationsSchema = z
  .object({
    status: z
      .enum(["pending", "accepted", "expired", "revoked", "bounced"])
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type InvitationLocale = z.infer<typeof invitationLocaleSchema>;
export type InviteAgentInput = z.infer<typeof inviteAgentSchema>;
export type InviteExistingAgentInput = z.infer<typeof inviteExistingAgentSchema>;
export type VerifyInvitationInput = z.infer<typeof verifyInvitationSchema>;
export type AcceptInvitationWithPasswordInput = z.infer<
  typeof acceptInvitationWithPasswordSchema
>;
export type ListInvitationsInput = z.infer<typeof listInvitationsSchema>;

/**
 * Shape returned by `/invitations/verify` — kept in sync with the NestJS
 * service. Not a Zod schema (response, not input) but lives here so the
 * admin app can import the type alongside the request schemas.
 */
export type VerifyInvitationResult = {
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  expiresAt: string; // ISO
};
