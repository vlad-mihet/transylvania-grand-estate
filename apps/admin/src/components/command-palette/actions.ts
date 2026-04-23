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

export type CommandGroup = "navigate" | "create" | "finance" | "system";

export interface CommandAction {
  id: string;
  label: string;
  group: CommandGroup;
  icon: ComponentType<{ className?: string }>;
  href: string;
  /** Extra keywords fed to cmdk's fuzzy search. */
  keywords?: string[];
  /** Capability gate — action hidden unless the subject has this. */
  requires?: PermissionAction;
  /** Optional visible shortcut hint (e.g. "g p"). */
  shortcut?: string;
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
    label: "Dashboard",
    group: "navigate",
    icon: LayoutDashboard,
    href: "/",
    shortcut: "g d",
    keywords: ["home", "overview"],
  },
  {
    id: "nav.inquiries",
    label: "Inquiries",
    group: "navigate",
    icon: MessageSquareQuote,
    href: "/inquiries",
    shortcut: "g i",
    requires: "inquiry.read",
    keywords: ["leads", "contact", "triage"],
  },
  {
    id: "nav.properties",
    label: "Properties",
    group: "navigate",
    icon: Building2,
    href: "/properties",
    shortcut: "g p",
    requires: "property.read",
    keywords: ["listings", "homes"],
  },
  {
    id: "nav.developers",
    label: "Developers",
    group: "navigate",
    icon: HardHat,
    href: "/developers",
    requires: "developer.read",
  },
  {
    id: "nav.agents",
    label: "Agents",
    group: "navigate",
    icon: UserCircle,
    href: "/agents",
    requires: "agent.read",
    keywords: ["brokers", "realtors"],
  },
  {
    id: "nav.testimonials",
    label: "Testimonials",
    group: "navigate",
    icon: MessageSquareQuote,
    href: "/testimonials",
    requires: "testimonial.read",
  },
  {
    id: "nav.counties",
    label: "Counties",
    group: "navigate",
    icon: Map,
    href: "/counties",
    requires: "county.read",
    keywords: ["județ", "judete", "regions"],
  },
  {
    id: "nav.cities",
    label: "Cities",
    group: "navigate",
    icon: MapPin,
    href: "/cities",
    requires: "city.read",
  },
  {
    id: "nav.articles",
    label: "Articles",
    group: "navigate",
    icon: Newspaper,
    href: "/articles",
    shortcut: "g a",
    requires: "article.read",
    keywords: ["blog", "content"],
  },
  {
    id: "nav.academy-courses",
    label: "Academy Courses",
    group: "navigate",
    icon: GraduationCap,
    href: "/academy/courses",
    requires: "academy.course.read",
    keywords: ["academy", "courses", "lessons", "study", "education"],
  },
  {
    id: "nav.academy-students",
    label: "Academy Students",
    group: "navigate",
    icon: Users,
    href: "/academy/students",
    requires: "academy.user.manage",
    keywords: ["academy", "students", "learners", "enrollments"],
  },
  {
    id: "nav.academy-invitations",
    label: "Academy Invitations",
    group: "navigate",
    icon: Mail,
    href: "/academy/invitations",
    requires: "academy.user.manage",
    keywords: ["academy", "invitations", "invites"],
  },
  {
    id: "nav.bank-rates",
    label: "Bank Rates",
    group: "navigate",
    icon: Landmark,
    href: "/bank-rates",
    requires: "bank-rate.read",
    keywords: ["mortgage", "finance", "loans"],
  },
  {
    id: "nav.financial-indicators",
    label: "Financial Indicators",
    group: "navigate",
    icon: TrendingUp,
    href: "/financial-indicators",
    requires: "financial-indicator.read",
    keywords: ["eur", "ron", "ircc", "bnr"],
  },
  {
    id: "nav.settings",
    label: "Site Settings",
    group: "navigate",
    icon: Settings,
    href: "/settings",
    requires: "site-config.read",
    keywords: ["config", "site"],
  },
  {
    id: "nav.users",
    label: "Users",
    group: "navigate",
    icon: Users,
    href: "/users",
    shortcut: "g u",
    requires: "users.manage",
    keywords: ["admins", "accounts"],
  },
  {
    id: "nav.audit-logs",
    label: "Audit log",
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
    label: "My Listings",
    group: "navigate",
    icon: Building2,
    href: "/my-listings",
    requires: "agent.read-self",
    keywords: ["own", "mine", "portfolio"],
  },
  {
    id: "nav.my-inquiries",
    label: "My Inquiries",
    group: "navigate",
    icon: MessageSquareQuote,
    href: "/my-inquiries",
    requires: "agent.read-self",
    keywords: ["leads", "mine"],
  },
  {
    id: "nav.profile",
    label: "Profile",
    group: "navigate",
    icon: User,
    href: "/profile",
    requires: "agent.read-self",
    keywords: ["me", "account"],
  },

  // Create
  {
    id: "create.property",
    label: "Create property",
    group: "create",
    icon: Plus,
    href: "/properties/new",
    requires: "property.create",
    keywords: ["new", "add", "listing"],
  },
  {
    id: "create.developer",
    label: "Create developer",
    group: "create",
    icon: Plus,
    href: "/developers/new",
    requires: "developer.create",
  },
  {
    id: "create.agent",
    label: "Create agent",
    group: "create",
    icon: Plus,
    href: "/agents/new",
    requires: "agent.create",
  },
  {
    id: "create.city",
    label: "Create city",
    group: "create",
    icon: Plus,
    href: "/cities/new",
    requires: "city.create",
  },
  {
    id: "create.article",
    label: "Create article",
    group: "create",
    icon: FileText,
    href: "/articles/new",
    requires: "article.create",
    keywords: ["new", "post", "blog"],
  },
  {
    id: "create.testimonial",
    label: "Create testimonial",
    group: "create",
    icon: Plus,
    href: "/testimonials/new",
    requires: "testimonial.create",
  },
  {
    id: "create.bank-rate",
    label: "Create bank rate",
    group: "create",
    icon: Plus,
    href: "/bank-rates/new",
    requires: "bank-rate.create",
  },
  {
    id: "create.academy-course",
    label: "Create academy course",
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
    label: "Invite academy student",
    group: "create",
    icon: Plus,
    href: "/academy/students",
    requires: "academy.user.manage",
    keywords: ["invite", "academy", "student"],
  },
];
