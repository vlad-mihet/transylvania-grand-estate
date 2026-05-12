import type { AdminRole } from "@/lib/permissions";
import type { AdminUserStatus, InvitableRole } from "./constants";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  status: AdminUserStatus;
  disabledAt?: string | null;
  lastLoginAt?: string | null;
  lastSeenAt?: string | null;
  agentId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AgentSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  slug: string;
}

export interface CreateUserPayload {
  email: string;
  name: string;
  password: string;
  role: AdminRole;
  agentId: string;
}

export interface UpdateUserPayload {
  id: string;
  name?: string;
  role?: AdminRole;
  agentId?: string | null;
}

/**
 * Invite-by-email payload for the /users page. AGENT-role onboarding goes
 * through the agents/invite path; this shape is for SUPER_ADMIN/ADMIN/EDITOR.
 */
export interface InviteUserPayload {
  email: string;
  name: string;
  role: InvitableRole;
}

/**
 * Bulk-action payload mirroring the API DTO. `set-role` requires `role`;
 * the form validates that before submitting so the server doesn't have to
 * 400 on a partial payload.
 */
export interface BulkActionPayload {
  ids: string[];
  action: "suspend" | "reactivate" | "delete" | "set-role";
  role?: AdminRole;
}

/**
 * Activity payload from GET /auth/users/:id/activity. Drives the peek
 * sheet's three tabs (identity, activity, invitation).
 */
export interface UserActivity {
  user: AdminUser;
  identities: Array<{
    id: string;
    provider: string;
    email: string;
    createdAt: string;
  }>;
  pendingInvitation: PendingInvitationSummary | null;
  recentAudit: Array<{
    id: string;
    action: string;
    resource: string;
    resourceId: string;
    createdAt: string;
    brand: string | null;
    method: string | null;
    url: string | null;
  }>;
}

export interface PendingInvitationSummary {
  id: string;
  email: string;
  role: AdminRole;
  status: string;
  expiresAt: string;
  emailSentAt: string | null;
  emailAttempts: number;
  bouncedAt: string | null;
  bounceReason: string | null;
  createdAt: string;
}
