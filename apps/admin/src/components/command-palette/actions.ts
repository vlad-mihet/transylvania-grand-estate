import type { ComponentType } from "react";
import {
  Building2,
  FileText,
  GraduationCap,
  HardHat,
  Landmark,
  LayoutDashboard,
  Mail,
  Map,
  MapPin,
  MessageSquareQuote,
  Newspaper,
  Plus,
  Settings,
  Shield,
  TrendingUp,
  User,
  UserCircle,
  Users,
} from "lucide-react";
import type { Action as PermissionAction } from "@/lib/permissions";

export type CommandGroup =
  | "context"
  | "navigate"
  | "create"
  | "finance"
  | "system";

export interface CommandAction {
  /** Stable id — also the i18n key under `CommandPalette.actions.<id>` unless `label` is provided. */
  id: string;
  group: CommandGroup;
  icon: ComponentType<{ className?: string }>;
  href: string;
  /**
   * Inline label that takes precedence over the i18n lookup. Used by
   * dynamic, data-driven entries (e.g. course lessons) where the label
   * comes from the database rather than translation files.
   */
  label?: string;
  /** Extra keywords fed to cmdk's fuzzy search. */
  keywords?: string[];
  /** Capability gate — action hidden unless the subject has this. */
  requires?: PermissionAction;
}

/**
 * Flat registry of palette actions. Kept as a single source so the nav,
 * shortcut map, and palette all read from one truth. Hand-edited on purpose
 * — auto-generating from `NAV_GROUPS` would bring its types along and
 * constrain the palette to nav-only.
 */
export const COMMAND_ACTIONS: CommandAction[] = [
  // Navigate
  {
    id: "nav.dashboard",
    group: "navigate",
    icon: LayoutDashboard,
    href: "/",
    keywords: ["home", "overview"],
  },
  {
    id: "nav.inquiries",
    group: "navigate",
    icon: MessageSquareQuote,
    href: "/inquiries",
    requires: "inquiry.read",
    keywords: ["leads", "contact", "triage"],
  },
  {
    id: "nav.properties",
    group: "navigate",
    icon: Building2,
    href: "/properties",
    requires: "property.read",
    keywords: ["listings", "homes"],
  },
  {
    id: "nav.developers",
    group: "navigate",
    icon: HardHat,
    href: "/developers",
    requires: "developer.read",
  },
  {
    id: "nav.agents",
    group: "navigate",
    icon: UserCircle,
    href: "/people/agents",
    requires: "agent.read",
    keywords: ["brokers", "realtors", "people"],
  },
  {
    id: "nav.testimonials",
    group: "navigate",
    icon: MessageSquareQuote,
    href: "/testimonials",
    requires: "testimonial.read",
  },
  {
    id: "nav.counties",
    group: "navigate",
    icon: Map,
    href: "/counties",
    requires: "county.read",
    keywords: ["județ", "judete", "regions"],
  },
  {
    id: "nav.cities",
    group: "navigate",
    icon: MapPin,
    href: "/cities",
    requires: "city.read",
  },
  {
    id: "nav.articles",
    group: "navigate",
    icon: Newspaper,
    href: "/articles",
    requires: "article.read",
    keywords: ["blog", "content"],
  },
  {
    id: "nav.academy-courses",
    group: "navigate",
    icon: GraduationCap,
    href: "/academy/courses",
    requires: "academy.course.read",
    keywords: ["academy", "courses", "lessons", "study", "education"],
  },
  {
    id: "nav.academy-students",
    group: "navigate",
    icon: Users,
    href: "/academy/students",
    requires: "academy.user.manage",
    keywords: ["academy", "students", "learners", "enrollments", "people"],
  },
  {
    id: "nav.academy-invitations",
    group: "navigate",
    icon: Mail,
    href: "/academy/invitations",
    requires: "academy.user.manage",
    keywords: ["academy", "invitations", "invites", "people"],
  },
  {
    id: "nav.bank-rates",
    group: "navigate",
    icon: Landmark,
    href: "/bank-rates",
    requires: "bank-rate.read",
    keywords: ["mortgage", "finance", "loans"],
  },
  {
    id: "nav.financial-indicators",
    group: "navigate",
    icon: TrendingUp,
    href: "/financial-indicators",
    requires: "financial-indicator.read",
    keywords: ["eur", "ron", "ircc", "bnr"],
  },
  {
    id: "nav.settings",
    group: "navigate",
    icon: Settings,
    href: "/settings",
    requires: "site-config.read",
    keywords: ["config", "site"],
  },
  {
    id: "nav.users",
    group: "navigate",
    icon: Users,
    href: "/people/team",
    requires: "users.manage",
    keywords: ["admins", "accounts", "team", "people"],
  },
  {
    id: "nav.audit-logs",
    group: "navigate",
    icon: Shield,
    href: "/audit-logs",
    requires: "audit-log.read",
    keywords: ["history", "activity", "audit", "trail"],
  },

  // Agent-only routes — capability-gated to `agent.read-self` so ADMIN+ roles
  // don't see them in the palette (they don't have personal listings).
  {
    id: "nav.my-listings",
    group: "navigate",
    icon: Building2,
    href: "/my-listings",
    requires: "agent.read-self",
    keywords: ["own", "mine", "portfolio"],
  },
  {
    id: "nav.my-inquiries",
    group: "navigate",
    icon: MessageSquareQuote,
    href: "/my-inquiries",
    requires: "agent.read-self",
    keywords: ["leads", "mine"],
  },
  {
    id: "nav.profile",
    group: "navigate",
    icon: User,
    href: "/profile",
    requires: "agent.read-self",
    keywords: ["me", "account"],
  },

  // Create
  {
    id: "create.property",
    group: "create",
    icon: Plus,
    href: "/properties/new",
    requires: "property.create",
    keywords: ["new", "add", "listing"],
  },
  {
    id: "create.developer",
    group: "create",
    icon: Plus,
    href: "/developers/new",
    requires: "developer.create",
  },
  {
    id: "create.agent",
    group: "create",
    icon: Plus,
    href: "/people/agents/new",
    requires: "agent.create",
  },
  {
    id: "create.city",
    group: "create",
    icon: Plus,
    href: "/cities/new",
    requires: "city.create",
  },
  {
    id: "create.article",
    group: "create",
    icon: FileText,
    href: "/articles/new",
    requires: "article.create",
    keywords: ["new", "post", "blog"],
  },
  {
    id: "create.testimonial",
    group: "create",
    icon: Plus,
    href: "/testimonials/new",
    requires: "testimonial.create",
  },
  {
    id: "create.bank-rate",
    group: "create",
    icon: Plus,
    href: "/bank-rates/new",
    requires: "bank-rate.create",
  },
  {
    id: "create.academy-course",
    group: "create",
    icon: Plus,
    href: "/academy/courses/new",
    requires: "academy.course.create",
    keywords: ["new", "academy", "course", "lesson"],
  },
  {
    id: "create.academy-invitation",
    // Invitation creation lives inside the Students page (dialog), so the
    // palette shortcut routes there — dropping the admin directly into the
    // surface where the invite CTA is one click away.
    group: "create",
    icon: Plus,
    href: "/academy/students",
    requires: "academy.user.manage",
    keywords: ["invite", "academy", "student", "people"],
  },
];
