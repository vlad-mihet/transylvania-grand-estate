"use client";

import { useEffect } from "react";
import {
  LayoutDashboard,
  Building2,
  HardHat,
  MapPin,
  MessageSquareQuote,
  Settings,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@tge/ui";
import { useSidebar } from "@/components/layout/sidebar-context";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

function SidebarContent() {
  const pathname = usePathname();
  const t = useTranslations("Sidebar");

  const navItems = [
    { href: "/" as const, label: t("dashboard"), icon: LayoutDashboard },
    { href: "/properties" as const, label: t("properties"), icon: Building2 },
    { href: "/developers" as const, label: t("developers"), icon: HardHat },
    { href: "/cities" as const, label: t("cities"), icon: MapPin },
    { href: "/testimonials" as const, label: t("testimonials"), icon: MessageSquareQuote },
    { href: "/settings" as const, label: t("settings"), icon: Settings },
  ];

  return (
    <>
      <div className="flex h-16 items-center gap-3 px-6 border-b border-copper/15">
        <Building2 className="h-5 w-5 text-copper" />
        <div className="flex flex-col">
          <span className="font-serif text-base font-semibold tracking-[0.03em] text-cream">
            Transylvania
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-copper/70 font-medium -mt-0.5">
            Grand Estate
          </span>
        </div>
      </div>
      <p className="px-6 pt-6 pb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/30">
        {t("management")}
      </p>
      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-300 ${
                isActive
                  ? "bg-copper/10 text-copper before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[2px] before:rounded-full before:bg-copper"
                  : "text-sidebar-foreground/60 hover:bg-white/5 hover:text-sidebar-foreground/90"
              }`}
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-6 py-4 border-t border-copper/10">
        <p className="text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/25">
          {t("version")}
        </p>
      </div>
    </>
  );
}

export function AdminSidebar() {
  const { isOpen, close } = useSidebar();
  const pathname = usePathname();
  const t = useTranslations("Sidebar");

  // Close mobile nav on route change
  useEffect(() => {
    close();
  }, [pathname, close]);

  return (
    <>
      {/* Desktop: fixed sidebar, hidden on mobile */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile: Sheet drawer */}
      <Sheet open={isOpen} onOpenChange={close}>
        <SheetContent
          side="left"
          className="w-64 p-0 bg-sidebar text-sidebar-foreground border-copper/10 [&>button]:hidden"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">{t("navigation")}</SheetTitle>
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
