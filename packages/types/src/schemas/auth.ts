import { z } from "zod";
import { AdminRole } from "@prisma/client";

/**
 * Auth payloads. New-password inputs (register, change-password) enforce a
 * >= 6 minimum; login intentionally does NOT, so a too-short password returns
 * the same 401 as a wrong one — otherwise the distinguishable 400 leaks the
 * server-side policy to attackers.
 */
export const loginSchema = z
  .object({
    email: z.string().email().max(200),
    password: z.string().max(200),
  })
  .strict();

export const registerSchema = z
  .object({
    email: z.string().email().max(200),
    password: z.string().min(6).max(200),
    name: z.string().min(2).max(200),
    role: z.nativeEnum(AdminRole).optional(),
  })
  .strict();

export const refreshTokenSchema = z
  .object({
    refreshToken: z.string().min(1),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(6).max(200),
    newPassword: z.string().min(6).max(200),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
