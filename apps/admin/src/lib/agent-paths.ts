/**
 * Paths an AGENT may visit. Anything else bounces to /403. Single source of
 * truth — consumed by `<AuthGuard>` (gates browser navigation) and the
 * command palette (hides nav items the AGENT can't reach so they don't dead-
 * end on /403).
 *
 * The trailing slash on `/properties/` and `/inquiries/` is deliberate — it
 * permits detail (`/properties/abc`) and edit (`/properties/abc/edit`) deep
 * links while leaving the bare list pages (admin's perspective) blocked.
 * AGENT users go through `/my-listings` and `/my-inquiries` for lists.
 * Ownership is enforced server-side via OwnershipGuard on the API, and
 * `<Can>` wrappers gate mutate controls inside the detail/edit views.
 */
export const AGENT_ALLOWED_PREFIXES = [
  "/",
  "/my-listings",
  "/my-inquiries",
  "/profile",
  "/properties/",
  "/inquiries/",
  "/audit-logs",
] as const;

export function isPathAllowedForAgent(pathname: string): boolean {
  if (pathname === "/") return true;
  return AGENT_ALLOWED_PREFIXES.some(
    (prefix) => prefix !== "/" && pathname.startsWith(prefix),
  );
}
