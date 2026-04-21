"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useRouter } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import {
  ChevronRight,
  KeyRound,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Sun,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@tge/ui";
import { useSidebar } from "@/components/layout/sidebar-context";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { ChangePasswordDialog } from "@/components/auth/change-password-dialog";
import { GlobalSearch } from "@/components/global-search/global-search";

export function AdminHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { toggle } = useSidebar();
  const t = useTranslations("Header");
  const tc = useTranslations("Common");
  const pathname = usePathname();

  const crumbs = useMemo(() => buildBreadcrumb(pathname), [pathname]);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [passwordOpen, setPasswordOpen] = useState(false);

  // next-themes resolves the theme client-side only; guard against SSR flicker.
  // `setMounted(true)` inside a one-shot effect is the library-recommended
  // hydration pattern (there's no external subscription to model here).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR hydration guard
    setMounted(true);
  }, []);
  const themeIcon = !mounted ? (
    <Sun className="h-3.5 w-3.5" />
  ) : resolvedTheme === "dark" ? (
    <Moon className="h-3.5 w-3.5" />
  ) : (
    <Sun className="h-3.5 w-3.5" />
  );

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-20 grid h-12 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 lg:hidden"
          onClick={toggle}
          aria-label={t("menu")}
        >
          <Menu className="h-4 w-4" />
        </Button>
        <nav className="hidden min-w-0 items-center gap-1.5 text-xs text-muted-foreground md:flex">
          {crumbs.map((crumb, idx) => (
            <div key={idx} className="flex items-center gap-1.5 min-w-0">
              {idx > 0 && (
                <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
              )}
              <span
                className={
                  idx === crumbs.length - 1
                    ? "truncate font-medium text-foreground"
                    : "truncate"
                }
              >
                {crumb}
              </span>
            </div>
          ))}
        </nav>
      </div>

      <div className="flex justify-center">
        <GlobalSearch />
      </div>

      <div className="flex items-center justify-end gap-2">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md border border-transparent px-2 py-1 text-sm transition-colors hover:border-border hover:bg-muted">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-copper/10 text-[11px] font-semibold uppercase text-copper">
                  {initialsFrom(user.name)}
                </div>
                <span className="mono hidden text-[11px] font-semibold uppercase tracking-[0.06em] text-copper sm:inline">
                  {user.role.replace(/_/g, " ")}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{user.name}</span>
                <span className="text-xs text-muted-foreground">
                  {user.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2">
                  {themeIcon}
                  {t("theme")}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={mounted ? (theme ?? "system") : "system"}
                    onValueChange={(value) => setTheme(value)}
                  >
                    <DropdownMenuRadioItem value="light" className="gap-2">
                      <Sun className="h-3.5 w-3.5" />
                      {t("themeLight")}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark" className="gap-2">
                      <Moon className="h-3.5 w-3.5" />
                      {t("themeDark")}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system" className="gap-2">
                      <Monitor className="h-3.5 w-3.5" />
                      {t("themeSystem")}
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
                <KeyRound className="mr-2 h-3.5 w-3.5" />
                {t("changePassword")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-3.5 w-3.5" />
                {t("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {!user && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            title={tc("loading")}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
      <ChangePasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
      />
    </header>
  );
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "·";
}

function buildBreadcrumb(pathname: string): string[] {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return ["Dashboard"];
  return parts.map((segment) =>
    segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
  );
}
