"use client";

import { useEffect, type ComponentType } from "react";
import {
  ArrowLeft,
  BookOpen,
  Gauge,
  GraduationCap,
  Mail,
  Users,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@tge/ui";
import { cn } from "@tge/utils";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useSidebar } from "@/components/layout/sidebar-context";
import { usePermissions } from "@/components/auth/auth-provider";
import type { Action } from "@/lib/permissions";

interface WorkspaceNavItem {
  href: string;
  labelKey: "tabs.overview" | "tabs.courses" | "tabs.students" | "tabs.invitations";
  icon: ComponentType<{ className?: string }>;
  /** Exact-match pathname (avoids `/academy` matching `/academy/courses`). */
  exact?: boolean;
  requires: Action;
}

const NAV: WorkspaceNavItem[] = [
  {
    href: "/academy",
    labelKey: "tabs.overview",
    icon: Gauge,
    exact: true,
    requires: "academy.user.manage",
  },
  {
    href: "/academy/courses",
    labelKey: "tabs.courses",
    icon: BookOpen,
    requires: "academy.course.read",
  },
  {
    href: "/academy/students",
    labelKey: "tabs.students",
    icon: Users,
    requires: "academy.user.manage",
  },
  {
    href: "/academy/invitations",
    labelKey: "tabs.invitations",
    icon: Mail,
    requires: "academy.user.manage",
  },
];

/**
 * Academy workspace sidebar — replaces the main admin sidebar while the user
 * is in `/academy/**`. Dark studio aesthetic with a "Back to admin" link at
 * the top, the Academy brand block, and Academy-only nav. Reuses the existing
 * `useSidebar()` context so the mobile slide-over still works.
 */
function WorkspaceSidebarContent() {
  const t = useTranslations("AcademyShell");
  const pathname = usePathname();
  const { can } = usePermissions();

  const visibleNav = NAV.filter((item) => can(item.requires));

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800/80 px-4 py-3">
        <Link
          href="/"
          className="group flex items-center gap-2 text-[12px] font-medium text-zinc-400 transition-colors hover:text-zinc-100"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          {t("backToAdmin")}
        </Link>
      </div>

      <div className="border-b border-zinc-800/80 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-copper/15 text-copper">
            <GraduationCap className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="mono text-[10px] font-semibold uppercase tracking-[0.16em] text-copper">
              {t("eyebrow")}
            </p>
            <p className="truncate text-sm font-semibold text-zinc-50">
              {t("title")}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <p className="mono px-2 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          {t("workspaceLabel")}
        </p>
        <div className="flex flex-col gap-0.5">
          {visibleNav.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href as Parameters<typeof Link>[0]["href"]}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-[13px] font-medium transition-colors",
                  isActive
                    ? "bg-copper/10 text-copper"
                    : "text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-50",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-copper" : "text-zinc-500 group-hover:text-zinc-300",
                  )}
                />
                <span className="flex-1 truncate">{t(item.labelKey)}</span>
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute inset-y-1 left-0 w-0.5 rounded-r-sm bg-copper"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-zinc-800/80 px-4 py-3">
        <p className="mono text-[9px] uppercase tracking-[0.12em] text-zinc-600">
          {t("studioFooter")}
        </p>
      </div>
    </div>
  );
}

export function AcademyWorkspaceSidebar() {
  const { isOpen, close } = useSidebar();
  const pathname = usePathname();
  const t = useTranslations("AcademyShell");

  // Close the mobile sheet on every navigation, same as AdminSidebar.
  useEffect(() => {
    close();
  }, [pathname, close]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-zinc-800/80 bg-zinc-950 lg:flex">
        <WorkspaceSidebarContent />
      </aside>

      <Sheet open={isOpen} onOpenChange={close}>
        <SheetContent
          side="left"
          className="w-60 border-zinc-800/80 bg-zinc-950 p-0 text-zinc-100 [&>button]:hidden"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">{t("navigation")}</SheetTitle>
          <WorkspaceSidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
