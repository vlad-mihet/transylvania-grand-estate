/**
 * UI-layer view-model that lets the People Home page render a single feed
 * across three distinct underlying pools without leaking their schemas. The
 * Phase 2 schema fusion will replace this with a real Person table; the
 * adapter signatures here are designed to survive that change.
 */
import type { ApiAgent } from "@tge/types";

export type PersonSource = "team" | "agent" | "student";

export type PersonStatus =
  | "active"
  | "inactive"
  | "invited"
  | "suspended"
  | "no-login";

export interface PersonRow {
  /** Source-prefixed so two rows for the same email never collide. */
  id: `team:${string}` | `agent:${string}` | `student:${string}`;
  source: PersonSource;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  /** AdminUser.role | "AGENT" | enrollment count — purely cosmetic. */
  roleOrTag: string | null;
  status: PersonStatus;
  /** ISO timestamp of last meaningful activity. */
  lastActiveAt: string | null;
  /** Deep link to the canonical detail surface. */
  href: string;
  /** Other pool emails matching this row, populated only by the overlap card. */
  linkedEmails?: string[];
}

interface AdminUserLike {
  id: string;
  email: string;
  name: string;
  role: string;
  status?: string | null;
  disabledAt?: string | null;
  lastLoginAt?: string | null;
  lastSeenAt?: string | null;
}

export function fromAdminUser(u: AdminUserLike): PersonRow {
  const suspended = u.status === "SUSPENDED" || !!u.disabledAt;
  return {
    id: `team:${u.id}`,
    source: "team",
    displayName: u.name?.trim() || u.email,
    email: u.email,
    avatarUrl: null,
    roleOrTag: u.role,
    status: suspended ? "suspended" : "active",
    lastActiveAt: u.lastSeenAt ?? u.lastLoginAt ?? null,
    href: "/people/team",
  };
}

export function fromAgent(a: ApiAgent): PersonRow {
  const linked = !!a.adminUserId;
  const pendingInvite = a.invitation?.status === "PENDING";
  let status: PersonStatus;
  if (!a.active) status = "inactive";
  else if (linked) status = "active";
  else if (pendingInvite) status = "invited";
  else status = "no-login";

  return {
    id: `agent:${a.id}`,
    source: "agent",
    displayName: `${a.firstName} ${a.lastName}`.trim() || a.email,
    email: a.email,
    avatarUrl: a.photo ?? null,
    roleOrTag: "AGENT",
    status,
    lastActiveAt: a.updatedAt ?? null,
    href: `/people/agents/${a.id}`,
  };
}

interface AcademyUserLike {
  id: string;
  email: string;
  name: string;
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  suspendedAt?: string | null;
  _count?: { enrollments?: number };
}

export function fromAcademyUser(u: AcademyUserLike): PersonRow {
  let status: PersonStatus;
  if (u.suspendedAt) status = "suspended";
  else if (!u.lastLoginAt && !u.emailVerifiedAt) status = "invited";
  else status = "active";

  const enrollments = u._count?.enrollments ?? 0;
  return {
    id: `student:${u.id}`,
    source: "student",
    displayName: u.name?.trim() || u.email,
    email: u.email,
    avatarUrl: null,
    roleOrTag: enrollments > 0 ? `${enrollments} enrolled` : null,
    status,
    lastActiveAt: u.lastLoginAt ?? null,
    href: `/academy/students/${u.id}`,
  };
}

/**
 * Builds the linkedEmails sidebar for an overlap row by intersecting an
 * email against the other two pools' email sets. Lowercase comparison —
 * mixed-case email is allowed at signup but is the same identity. Used by
 * the overlap callout; not by the per-pool list pages.
 */
export function annotateOverlap(
  row: PersonRow,
  pools: { team: Set<string>; agent: Set<string>; student: Set<string> },
): PersonRow {
  const key = row.email.toLowerCase();
  const linked: string[] = [];
  if (row.source !== "team" && pools.team.has(key)) linked.push("team");
  if (row.source !== "agent" && pools.agent.has(key)) linked.push("agent");
  if (row.source !== "student" && pools.student.has(key))
    linked.push("student");
  return linked.length === 0 ? row : { ...row, linkedEmails: linked };
}
