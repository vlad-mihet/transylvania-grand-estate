import { z } from "zod";
import { passwordPolicy } from "./auth";

/**
 * Self-serve password reset flow. The semantics deliberately mirror the
 * invitation-accept shape so the admin UI and API can reuse handlers,
 * throttle configs, and hint copy. SSO-only accounts (no passwordHash) are
 * silently ignored by the forgot-password endpoint \u2014 Google users recover
 * through Google.
 */

export const forgotPasswordSchema = z
  .object({
    email: z.string().email().max(200),
  })
  .strict();

export const verifyResetTokenSchema = z
  .object({
    token: z.string().min(16).max(256),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(16).max(256),
    password: passwordPolicy,
  })
  .strict();

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyResetTokenInput = z.infer<typeof verifyResetTokenSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** Shape returned by the verify endpoint \u2014 kept in sync with the service. */
export type VerifyResetTokenResult = {
  email: string;
  firstName: string | null;
};
