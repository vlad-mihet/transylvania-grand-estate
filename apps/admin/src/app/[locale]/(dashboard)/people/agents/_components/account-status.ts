import type { ApiAgent } from "@tge/types";

export type Agent = ApiAgent & { createdAt?: string; updatedAt?: string };

export type AccountStatus =
  | "ACTIVE"
  | "PENDING"
  | "EXPIRED"
  | "REVOKED"
  | "BOUNCED"
  | "NONE";

/**
 * Derive the login-account status from the joined invitation data the API
 * returns on each agent row. Defensively re-evaluates `expiresAt` instead of
 * trusting the stored `status` alone — the hourly expiry cron can lag a
 * PENDING row that has crossed its expiry.
 */
export function resolveAccountStatus(agent: Agent): AccountStatus {
  if (agent.adminUserId) return "ACTIVE";
  const inv = agent.invitation;
  if (!inv) return "NONE";
  if (inv.status === "ACCEPTED") {
    // Invitation accepted but adminUserId missing — shouldn't happen; treat
    // as ACTIVE so the row doesn't invite-spam a real user. A console.warn
    // helps catch data anomalies in staging.
    if (typeof console !== "undefined") {
      console.warn("Agent has ACCEPTED invitation but no adminUserId", agent.id);
    }
    return "ACTIVE";
  }
  if (inv.status === "REVOKED") return "REVOKED";
  if (inv.status === "BOUNCED") return "BOUNCED";
  if (inv.status === "EXPIRED" || new Date(inv.expiresAt) < new Date()) {
    return "EXPIRED";
  }
  return "PENDING";
}

export const ACCOUNT_STATUS_KEY: Record<
  AccountStatus,
  | "statusPending"
  | "statusAccepted"
  | "statusActive"
  | "statusExpired"
  | "statusRevoked"
  | "statusBounced"
  | "statusNoLogin"
> = {
  ACTIVE: "statusActive",
  PENDING: "statusPending",
  EXPIRED: "statusExpired",
  REVOKED: "statusRevoked",
  BOUNCED: "statusBounced",
  NONE: "statusNoLogin",
};

export const ACCOUNT_STATUS_TONE: Record<
  AccountStatus,
  "success" | "warning" | "neutral" | "danger"
> = {
  ACTIVE: "success",
  PENDING: "warning",
  EXPIRED: "neutral",
  REVOKED: "neutral",
  BOUNCED: "danger",
  NONE: "neutral",
};

export const SORT_TOKENS = {
  name: { asc: "name_asc", desc: "name_desc" },
  createdAt: { asc: "oldest", desc: "newest" },
} as const;

/**
 * Send-invite is offered when the agent has no login AND there isn't
 * already a live PENDING invitation (for PENDING, admin should visit the
 * Invitations page to resend). For EXPIRED/REVOKED/NONE/BOUNCED we'll mint
 * a fresh invite.
 */
export function canSendInvite(status: AccountStatus): boolean {
  return (
    status === "NONE" ||
    status === "EXPIRED" ||
    status === "REVOKED" ||
    status === "BOUNCED"
  );
}
