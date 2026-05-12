import type { AdminRole } from "@prisma/client";
import type { SearchEntityType } from "@tge/types/schemas/search";

/**
 * Client-side mirror of the API's `ROLE_ALLOWED` table — used to decide
 * which scope chips to render. The API is still authoritative (it re-applies
 * this filter to every search), so a divergence between the two only affects
 * what chips are *visible*, never what data the user can actually fetch.
 *
 * Keep in sync with `apps/api/src/search/search.service.ts:ROLE_ALLOWED`.
 */
export const ROLE_ENTITY_SCOPE: Record<AdminRole, readonly SearchEntityType[]> = {
  SUPER_ADMIN: [
    "property",
    "agent",
    "developer",
    "city",
    "county",
    "article",
    "inquiry",
    "testimonial",
    "bankRate",
    "user",
  ],
  ADMIN: [
    "property",
    "agent",
    "developer",
    "city",
    "county",
    "article",
    "inquiry",
    "testimonial",
    "bankRate",
    "user",
  ],
  EDITOR: [
    "property",
    "agent",
    "developer",
    "city",
    "county",
    "article",
    "inquiry",
    "testimonial",
    "bankRate",
  ],
  AGENT: ["property", "city", "developer", "inquiry"],
};
