import { z } from "zod";
import { AdminRole } from "@prisma/client";

/**
 * Password policy. Centralised here so register / change-password /
 * seed-script all hit the same rules. Login intentionally uses the looser
 * `z.string().max(200)` so invalid-length attempts return the same 401 as
 * wrong-credentials — the distinguishable 400 would leak the policy to
 * attackers crafting credential-stuffing payloads.
 *
 *  - Minimum 12 characters (NIST 2024 guidance: length beats complexity).
 *  - Must contain at least one lowercase, one uppercase, and one digit.
 *  - Symbols are optional — not requiring them keeps paste-friendly
 *    password-manager output acceptable.
 */
export const passwordPolicy = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(200)
  .refine((v) => /[a-z]/.test(v), {
    message: "Password must contain a lowercase letter",
  })
  .refine((v) => /[A-Z]/.test(v), {
    message: "Password must contain an uppercase letter",
  })
  .refine((v) => /\d/.test(v), {
    message: "Password must contain a digit",
  });

export const loginSchema = z
  .object({
    email: z.string().email().max(200),
    password: z.string().max(200),
  })
  .strict();

export const registerSchema = z
  .object({
    email: z.string().email().max(200),
    password: passwordPolicy,
    name: z.string().min(2).max(200),
    role: z.nativeEnum(AdminRole).optional(),
    /** Required when role is AGENT — links the new admin user to an unlinked sales Agent. */
    agentId: z.string().uuid().optional(),
  })
  .strict();

export const refreshTokenSchema = z
  .object({
    refreshToken: z.string().min(1),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword: passwordPolicy,
  })
  .strict();

/**
 * Admin-user management payload. Only `name`, `role`, and the AGENT linkage
 * are mutable via this endpoint — passwords go through `change-password`
 * and email is immutable. Null `agentId` explicitly unlinks.
 */
export const updateUserSchema = z
  .object({
    name: z.string().min(2).max(200).optional(),
    role: z.nativeEnum(AdminRole).optional(),
    agentId: z.string().uuid().nullable().optional(),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
