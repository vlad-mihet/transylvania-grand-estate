import { z } from "zod";

/**
 * Shared password-policy schema used by reset-password + accept-invite. Both
 * pages want the same 4-rule policy (min 12 chars, lowercase, uppercase, digit)
 * plus a confirm-match check, but they render in different locales — so the
 * caller passes in already-translated messages and we assemble the schema.
 */
export interface PasswordPolicyMessages {
  minLength: string;
  needsLowercase: string;
  needsUppercase: string;
  needsDigit: string;
  mismatch: string;
}

export function buildPasswordSchema(messages: PasswordPolicyMessages) {
  return z
    .object({
      password: z
        .string()
        .min(12, messages.minLength)
        .refine((v) => /[a-z]/.test(v), messages.needsLowercase)
        .refine((v) => /[A-Z]/.test(v), messages.needsUppercase)
        .refine((v) => /\d/.test(v), messages.needsDigit),
      confirm: z.string().min(1),
    })
    .refine((d) => d.password === d.confirm, {
      path: ["confirm"],
      message: messages.mismatch,
    });
}

export type PasswordFormValues = {
  password: string;
  confirm: string;
};
