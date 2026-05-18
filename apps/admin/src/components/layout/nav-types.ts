import type { ComponentType } from "react";
import type { Action } from "@/lib/permissions";

export interface NavItem {
  href: string;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
  /** Optional permission gate — nav item hidden unless the user has this. */
  requires?: Action;
  /** Show item if the user has any of these. Use instead of `requires` when
   * a single page legitimately serves multiple permission audiences (e.g.
   * combined Invitations page for team + academy admins). */
  requiresAny?: Action[];
  /** Shows a numeric badge (e.g. unread inquiries). */
  badge?: number;
}

export interface NavGroup {
  labelKey: string;
  /** Optional canonical home for this group. When set, the group label is
   * rendered as a link to this href. */
  home?: string;
  items: NavItem[];
}
