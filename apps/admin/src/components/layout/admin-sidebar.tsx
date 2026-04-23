"use client";

import { useEffect, type ComponentType } from "react";
import {
  Building2,
  ChevronRight,
  Gauge,
  GraduationCap,
  HardHat,
  Landmark,
  LayoutDashboard,
  Mail,
  Map,
  MapPin,
  MessageSquareQuote,
  Newspaper,
  Settings,
  Shield,
  TrendingUp,
  UserCircle,
  Users,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@tge/ui";
import { useSidebar } from "@/components/layout/sidebar-context";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { usePermissions } from "@/components/auth/auth-provider";
import type { Action } from "@/lib/permissions";
import { useUnreadInquiries } from "@/hooks/use-unread-inquiries";
import { cn } from "@tge/utils";

interface NavItem {
  href: string;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
  /** Optional permission gate — nav item hidden unless the user has this. */
  requires?: Action;
  /** Shows a numeric badge (e.g. unread inquiries). Placeholder for Phase 3. */
  badge?: number;
}

interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: "overview",
    items: [
      { href: "/", labelKey: "dashboard", icon: LayoutDashboard },
      {
        href: "/inquiries",
        labelKey: "inquiries",
        icon: MessageSquareQuote,
        requires: "inquiry.read",
      },
    ],
  },
  {
    labelKey: "catalog",
    items: [
      {
        href: "/properties",
        labelKey: "properties",
        icon: Building2,
        requires: "property.read",
      },
      {
        href: "/developers",
        labelKey: "developers",
        icon: HardHat,
        requires: "developer.read",
      },
      {
        href: "/agents",
        labelKey: "agents",
        icon: UserCircle,
        requires: "agent.read",
      },
      {
        href: "/testimonials",
        labelKey: "testimonials",
        icon: MessageSquareQuote,
        requires: "testimonial.read",
      },
    ],
  },
  {
    labelKey: "locations",
    items: [
      {
        href: "/counties",
        labelKey: "counties",
        icon: Map,
        requires: "county.read",
      },
      {
        href: "/cities",
        labelKey: "cities",
        icon: MapPin,
        requires: "city.read",
      },
      // Neighborhoods nav item deferred — API currently only supports nested
      // reads via `/cities/:slug/neighborhoods` with no standalone CRUD. When
      // neighborhood write endpoints land, add a dedicated /neighborhoods route.
    ],
  },
  {
    labelKey: "content",
    items: [
      {
        href: "/articles",
        labelKey: "articles",
        icon: Newspaper,
        requires: "article.read",
      },
      {
        href: "/academy/courses",
        labelKey: "academyCourses",
        icon: GraduationCap,
        requires: "academy.course.read",
      },
      {
        href: "/academy/students",
        labelKey: "academyStudents",
        icon: Users,
        requires: "academy.user.manage",
      },
      {
        href: "/academy/invitations",
        labelKey: "academyInvitations",
        icon: Mail,
        requires: "academy.user.manage",
      },
    ],
  },
  {
    labelKey: "finance",
    items: [
      {
        href: "/bank-rates",
        labelKey: "bankRates",
        icon: Landmark,
        requires: "bank-rate.read",
      },
      {
        href: "/financial-indicators",
        labelKey: "financialIndicators",
        icon: TrendingUp,
        requires: "financial-indicator.read",
      },
    ],
  },
  {
    labelKey: "settings",
    items: [
      {
        href: "/settings",
        labelKey: "settings",
        icon: Settings,
        requires: "site-config.read",
      },
      {
        href: "/users",
        labelKey: "users",
        icon: Users,
        requires: "users.manage",
      },
      {
        href: "/invitations",
        labelKey: "invitations",
        icon: Mail,
        requires: "users.manage",
      },
      {
        href: "/audit-logs",
        labelKey: "auditLogs",
        icon: Shield,
        requires: "audit-log.read",
      },
    ],
  },
];

/**
 * Narrower AGENT shell — hides the broader catalog / locations / content /
 * finance / settings groups and exposes only the agent's self-scoped surfaces.
 */
const AGENT_NAV_GROUPS: NavGroup[] = [
  {
    labelKey: "overview",
    items: [
      { href: "/", labelKey: "dashboard", icon: LayoutDashboard },
      {
        href: "/my-inquiries",
        labelKey: "myInquiries",
        icon: MessageSquareQuote,
      },
    ],
  },
  {
    labelKey: "catalog",
    items: [
      { href: "/my-listings", labelKey: "myListings", icon: Building2 },
    ],
  },
  {
    labelKey: "settings",
    items: [{ href: "/profile", labelKey: "profile", icon: UserCircle }],
  },
];

function SiteContextChip() {
  const t = useTranslations("Sidebar");
  return (
    <div className="flex items-center gap-2 rounded-sm bg-muted px-2 py-1 text-[11px]">
      <Shield className="h-3 w-3 text-copper" />
      <span className="mono uppercase tracking-[0.06em] text-muted-foreground">
        {t("allSites")}
      </span>
    </div>
  );
}

function SidebarContent() {
  const pathname = usePathname();
  const t = useTranslations("Sidebar");
  const { role, can } = usePermissions();
  const unreadInquiries = useUnreadInquiries();

  const navConfig = role === "AGENT" ? AGENT_NAV_GROUPS : NAV_GROUPS;
  const badgeHref = role === "AGENT" ? "/my-inquiries" : "/inquiries";

  const visibleGroups = navConfig
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => !item.requires || can(item.requires))
        .map((item) =>
          item.href === badgeHref && unreadInquiries > 0
            ? { ...item, badge: unreadInquiries }
            : item,
        ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-copper/10 text-copper">
            <Building2 className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-sm font-semibold text-sidebar-foreground truncate">
              TGE
            </span>
            <span className="mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-sidebar-muted)]">
              Admin
            </span>
          </div>
        </Link>
      </div>

      <div className="border-b border-border px-4 py-3">
        <SiteContextChip />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {visibleGroups.map((group) => (
          <div key={group.labelKey} className="mb-4">
            <p className="mono px-2 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-sidebar-muted)]">
              {t(group.labelKey as Parameters<typeof t>[0])}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    href={item.href as Parameters<typeof Link>[0]["href"]}
                    key={item.href}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-[13px] font-medium transition-colors",
                      isActive
                        ? "bg-[color-mix(in_srgb,var(--color-copper)_10%,transparent)] text-copper"
                        : "text-sidebar-foreground/80 hover:bg-muted hover:text-sidebar-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isActive ? "text-copper" : "text-[var(--color-sidebar-muted)]",
                      )}
                    />
                    <span className="flex-1 truncate">
                      {t(item.labelKey as Parameters<typeof t>[0])}
                    </span>
                    {typeof item.badge === "number" && item.badge > 0 && (
                      <span className="mono rounded-sm bg-copper/10 px-1.5 text-[10px] font-semibold text-copper">
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <ChevronRight className="h-3 w-3 shrink-0 text-copper/60" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <Gauge className="h-3 w-3" />
          <span className="mono uppercase tracking-[0.06em]">
            {t("version")}
          </span>
        </Link>
      </div>
    </>
  );
}

export function AdminSidebar() {
  const { isOpen, close } = useSidebar();
  const pathname = usePathname();
  const t = useTranslations("Sidebar");

  useEffect(() => {
    close();
  }, [pathname, close]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-sidebar text-sidebar-foreground lg:flex">
        <SidebarContent />
      </aside>

      <Sheet open={isOpen} onOpenChange={close}>
        <SheetContent
          side="left"
          className="w-60 border-border bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">{t("navigation")}</SheetTitle>
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
