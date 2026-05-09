import { z } from "zod";
import { AdminRole, AdminUserStatus } from "@prisma/client";

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

/**
 * Filter shape for `GET /auth/users`. Coerces single string params into
 * arrays so `?role=ADMIN` and `?role=ADMIN&role=EDITOR` both round-trip
 * cleanly. `search` is a substring match against name + email.
 */
const arrayParam = <T extends z.ZodTypeAny>(item: T) =>
  z.preprocess(
    (v) => (v == null ? undefined : Array.isArray(v) ? v : [v]),
    z.array(item).optional(),
  );

export const listUsersSchema = z
  .object({
    role: arrayParam(z.nativeEnum(AdminRole)),
    status: arrayParam(z.nativeEnum(AdminUserStatus)),
    search: z.string().max(200).optional(),
  })
  .strict();

/**
 * Bulk action over a set of admin user ids. The server caps `ids` at 100;
 * we mirror that here so the admin UI fails fast before the round-trip.
 * `set-role` requires `role`; the service double-checks because Zod's
 * discriminated union would have required action-as-literal at the type
 * level, which is overkill for an internal endpoint.
 */
export const bulkUserActionSchema = z
  .object({
    ids: z.array(z.string().uuid()).min(1).max(100),
    action: z.enum(["suspend", "reactivate", "delete", "set-role"]),
    role: z.nativeEnum(AdminRole).optional(),
  })
  .strict()
  .refine((v) => v.action !== "set-role" || v.role !== undefined, {
    message: "role is required when action is set-role",
    path: ["role"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersInput = z.infer<typeof listUsersSchema>;
export type BulkUserActionInput = z.infer<typeof bulkUserActionSchema>;
