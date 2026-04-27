import { LocalizedString } from "./property";

/**
 * Public agent profile shape — what /agents and property.agent expose to
 * anonymous and AGENT-role callers. Email is intentionally absent: contact
 * happens via the inquiry form, which routes server-side via property.agentId.
 * Admin consumers should use the richer ApiAgent shape from `./api`.
 */
export interface Agent {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  phone: string;
  photo?: string;
  bio: LocalizedString;
  active: boolean;
}
