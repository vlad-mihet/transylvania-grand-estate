/**
 * Role-to-capability map for the admin UI. Mirror of the server-side role
 * matrix in `apps/api/src/common/guards/roles.guard.ts` + upcoming
 * `ownership.guard.ts`. The server stays authoritative — this map only
 * decides which controls to render.
 *
 * When adding an action, keep the key namespaced as `<resource>.<verb>` so
 * `<Can action="property.delete">` reads as an assertion, not a flag.
 */

export const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR", "AGENT"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export type Action =
  // users
  | "users.manage"
  // audit log
  | "audit-log.read"
  | "audit-log.read-health"
  | "audit-log.export"
  // site config
  | "site-config.read"
  | "site-config.update"
  // properties
  | "property.read"
  | "property.create"
  | "property.update"
  | "property.delete"
  | "property.feature"
  // developers / agents / cities / counties / neighborhoods / testimonials
  | "developer.read"
  | "developer.create"
  | "developer.update"
  | "developer.delete"
  | "agent.read"
  | "agent.create"
  | "agent.update"
  | "agent.delete"
  | "agent.read-self"
  | "agent.update-self"
  | "city.read"
  | "city.create"
  | "city.update"
  | "city.delete"
  | "county.read"
  | "county.create"
  | "county.update"
  | "county.delete"
  | "neighborhood.read"
  | "neighborhood.create"
  | "neighborhood.update"
  | "neighborhood.delete"
  | "testimonial.read"
  | "testimonial.create"
  | "testimonial.update"
  | "testimonial.delete"
  // articles
  | "article.read"
  | "article.create"
  | "article.update"
  | "article.delete"
  | "article.publish"
  // finance
  | "bank-rate.read"
  | "bank-rate.create"
  | "bank-rate.update"
  | "bank-rate.delete"
  | "financial-indicator.read"
  | "financial-indicator.update"
  // inquiries
  | "inquiry.read"
  | "inquiry.update"
  | "inquiry.delete";

// Map of actions restricted to SUPER_ADMIN capability. Users-page + audit-log
// are kept here because they sit behind the SUPER_ADMIN role which reads
// `matrix["SUPER_ADMIN"] === "all"` — no explicit enumeration needed. This is
// just a type note for future editors. (No runtime effect.)

const matrix: Record<AdminRole, ReadonlySet<Action> | "all"> = {
  SUPER_ADMIN: "all",
  ADMIN: new Set<Action>([
    // Server scopes audit reads to non-security events for ADMIN.
    "audit-log.read",
    "site-config.read",
    "site-config.update",
    "property.read",
    "property.create",
    "property.update",
    "property.delete",
    "property.feature",
    "developer.read",
    "developer.create",
    "developer.update",
    "developer.delete",
    "agent.read",
    "agent.create",
    "agent.update",
    "agent.delete",
    "city.read",
    "city.create",
    "city.update",
    "city.delete",
    "county.read",
    "county.create",
    "county.update",
    "county.delete",
    "neighborhood.read",
    "neighborhood.create",
    "neighborhood.update",
    "neighborhood.delete",
    "testimonial.read",
    "testimonial.create",
    "testimonial.update",
    "testimonial.delete",
    "article.read",
    "article.create",
    "article.update",
    "article.delete",
    "article.publish",
    "bank-rate.read",
    "bank-rate.create",
    "bank-rate.update",
    "bank-rate.delete",
    "financial-indicator.read",
    "financial-indicator.update",
    "inquiry.read",
    "inquiry.update",
    "inquiry.delete",
  ]),
  EDITOR: new Set<Action>([
    // Server scopes audit reads to Article/Property/Testimonial only.
    "audit-log.read",
    "property.read",
    "developer.read",
    "agent.read",
    "city.read",
    "county.read",
    "neighborhood.read",
    "testimonial.read",
    "article.read",
    "article.create",
    "article.update",
    "article.delete",
    "article.publish",
    "bank-rate.read",
    "financial-indicator.read",
    "inquiry.read",
  ]),
  AGENT: new Set<Action>([
    // Server scopes audit reads to own actions + own properties only.
    "audit-log.read",
    "developer.read",
    "city.read",
    "county.read",
    "neighborhood.read",
    "agent.read-self",
    "agent.update-self",
    // ownership-gated actions — see `ownedActions` below
    "property.read",
    "property.update",
    "inquiry.read",
    "inquiry.update",
  ]),
};

/**
 * Actions the AGENT role may only perform on their own records. When the UI
 * calls `can("property.update", resource)`, resource.agentId is checked
 * against session.agentId before allowing.
 */
const ownedActions: ReadonlySet<Action> = new Set<Action>([
  "property.read",
  "property.update",
  "inquiry.read",
  "inquiry.update",
  "agent.read-self",
  "agent.update-self",
]);

export interface PermissionSubject {
  role?: string | null;
  agentId?: string | null;
}

export interface OwnershipResource {
  agentId?: string | null;
}

/**
 * Core check. Returns true if the subject may perform the action, optionally
 * against a specific resource (for ownership-gated verbs).
 */
export function can(
  subject: PermissionSubject | null | undefined,
  action: Action,
  resource?: OwnershipResource,
): boolean {
  if (!subject?.role) return false;
  const role = subject.role as AdminRole;
  const entry = matrix[role];
  if (!entry) return false;

  const allowed = entry === "all" || entry.has(action);
  if (!allowed) return false;

  // For AGENT, ownership-gated actions additionally require ownership match.
  if (role === "AGENT" && ownedActions.has(action)) {
    if (!subject.agentId) return false;
    if (resource && resource.agentId !== subject.agentId) return false;
  }

  return true;
}

export function isRole(subject: PermissionSubject | null | undefined, ...roles: AdminRole[]): boolean {
  if (!subject?.role) return false;
  return roles.includes(subject.role as AdminRole);
}
