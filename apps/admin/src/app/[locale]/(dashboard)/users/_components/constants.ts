import type { AdminRole } from "@/lib/permissions";

export const ROLES: AdminRole[] = ["SUPER_ADMIN", "ADMIN", "EDITOR", "AGENT"];

/**
 * Subset of roles eligible for the invite-by-email flow on /users. AGENT
 * uses the dedicated /agents/invite path because its invitation also
 * provisions an Agent profile in the same transaction.
 */
export const INVITABLE_ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR"] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export const ROLE_TONE: Record<
  AdminRole,
  "info" | "success" | "warning" | "neutral"
> = {
  SUPER_ADMIN: "info",
  ADMIN: "success",
  EDITOR: "warning",
  AGENT: "neutral",
};

export const USER_STATUSES = ["ACTIVE", "SUSPENDED"] as const;
export type AdminUserStatus = (typeof USER_STATUSES)[number];

export const STATUS_TONE: Record<
  AdminUserStatus,
  "success" | "danger"
> = {
  ACTIVE: "success",
  SUSPENDED: "danger",
};
