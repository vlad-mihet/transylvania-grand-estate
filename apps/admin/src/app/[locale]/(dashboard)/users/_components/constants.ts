import type { AdminRole } from "@/lib/permissions";

export const ROLES: AdminRole[] = ["SUPER_ADMIN", "ADMIN", "EDITOR", "AGENT"];

export const ROLE_TONE: Record<
  AdminRole,
  "info" | "success" | "warning" | "neutral"
> = {
  SUPER_ADMIN: "info",
  ADMIN: "success",
  EDITOR: "warning",
  AGENT: "neutral",
};
