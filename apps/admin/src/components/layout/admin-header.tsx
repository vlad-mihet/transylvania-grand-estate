"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useRouter } from "@/i18n/navigation";
import { LogOut, Menu, User } from "lucide-react";
import { Button } from "@tge/ui";
import { useSidebar } from "@/components/layout/sidebar-context";
import { useTranslations } from "next-intl";

export function AdminHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { toggle } = useSidebar();
  const t = useTranslations("Header");

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-copper/[0.08] bg-background/80 px-4 lg:px-6 backdrop-blur-md">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={toggle}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-3 lg:gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="hidden h-4 w-4 sm:block" />
          <span className="hidden sm:inline">{user?.name}</span>
          <span className="rounded-sm bg-copper/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-copper">
            {user?.role.replace("_", " ")}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="transition-all duration-300 hover:text-copper"
        >
          <LogOut className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{t("logout")}</span>
        </Button>
      </div>
    </header>
  );
}
