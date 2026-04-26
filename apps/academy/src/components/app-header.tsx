"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LogOut, Menu, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@tge/ui";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { NavProgress } from "./nav-progress";
import { useSession } from "@/hooks/use-session";
import { useLogout } from "@/hooks/mutations";

/**
 * Authenticated chrome. Left side is brand + primary nav (Dashboard,
 * Catalog) with active-state coloring driven by `usePathname`. Right side
 * is locale switcher + a user-menu dropdown — avatar with initials opens
 * a popover carrying name/email, Account link, and Logout.
 *
 * Below `sm`, everything secondary collapses into a Sheet drawer triggered
 * by a hamburger; the Sheet carries the same primary-nav links, the user
 * identity block, the locale switcher, and a prominent logout affordance
 * so every auth action is one tap away on phones.
 *
 * `navPending` drives the top progress bar — pages doing in-flight
 * `useTransition` work (lesson prev/next, mark-complete) pass their
 * pending flag so the bar flashes during the swap.
 */
export function AppHeader({ navPending = false }: { navPending?: boolean }) {
  const t = useTranslations("Academy");
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();
  const logout = useLogout();
  const [open, setOpen] = useState(false);

  const isDashboard = pathname === "/";
  const isCatalog =
    pathname === "/catalog" || pathname.startsWith("/courses");

  async function onLogout() {
    await logout.mutateAsync();
    router.replace("/login");
  }

  const profile = session.profile;
  const displayName = profile?.name?.trim() || profile?.email?.split("@")[0] || "";
  const initials = getInitials(displayName);

  return (
    <header className="sticky top-0 z-10 border-b border-[color:var(--color-border)] bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="relative">
        <NavProgress pending={navPending} />
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-6">
          {/* Left: brand + primary nav (desktop) */}
          <div className="flex items-center gap-7">
            <Link
              href="/"
              className="text-sm font-semibold tracking-wide text-[color:var(--color-primary)]"
            >
              {t("appName")}
            </Link>
            <nav
              aria-label="Primary"
              className="hidden items-center gap-1 sm:flex"
            >
              <NavItem href="/" active={isDashboard}>
                {t("dashboard.navLink")}
              </NavItem>
              <NavItem href="/catalog" active={isCatalog}>
                {t("catalog.navLink")}
              </NavItem>
            </nav>
          </div>

          {/* Right: locale + user menu (desktop) */}
          <div className="hidden items-center gap-3 sm:flex">
            <LocaleSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={t("nav.userMenuAria")}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white text-[11px] font-semibold text-[color:var(--color-primary)] transition hover:border-[color:var(--color-primary)]/40 hover:bg-[color:var(--color-primary)]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] ${
                    session.isLoading ? "animate-pulse" : ""
                  }`}
                >
                  {initials || <User className="h-4 w-4" aria-hidden="true" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {profile ? (
                  <>
                    <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
                      <span className="text-sm font-medium text-foreground">
                        {displayName}
                      </span>
                      <span className="truncate text-xs font-normal text-[color:var(--color-muted-foreground)]">
                        {profile.email}
                      </span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                  </>
                ) : null}
                <DropdownMenuItem asChild>
                  <Link href="/account" className="cursor-pointer">
                    <User className="h-4 w-4" aria-hidden="true" />
                    {t("account.title")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={logout.isPending}
                  onSelect={(e) => {
                    e.preventDefault();
                    void onLogout();
                  }}
                  className="cursor-pointer"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  {t("account.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile nav trigger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label={t("nav.openMenu")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[color:var(--color-border)] bg-white sm:hidden"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-6">
              <SheetHeader className="mb-6 p-0 text-left">
                <SheetTitle>{t("appName")}</SheetTitle>
                {profile ? (
                  <SheetDescription className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">
                      {displayName}
                    </span>
                    <span className="truncate text-xs text-[color:var(--color-muted-foreground)]">
                      {profile.email}
                    </span>
                  </SheetDescription>
                ) : (
                  <SheetDescription>{t("nav.menuDescription")}</SheetDescription>
                )}
              </SheetHeader>
              <nav className="flex flex-col gap-1 text-sm">
                <SheetClose asChild>
                  <Link
                    href="/"
                    className="rounded-md px-3 py-2 hover:bg-[color:var(--color-muted)]"
                  >
                    {t("dashboard.navLink")}
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/catalog"
                    className="rounded-md px-3 py-2 hover:bg-[color:var(--color-muted)]"
                  >
                    {t("catalog.navLink")}
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/account"
                    className="rounded-md px-3 py-2 hover:bg-[color:var(--color-muted)]"
                  >
                    {t("account.title")}
                  </Link>
                </SheetClose>
              </nav>
              <div className="mt-6 border-t border-[color:var(--color-border)] pt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                  {t("nav.languageLabel")}
                </p>
                <LocaleSwitcher />
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  void onLogout();
                }}
                disabled={logout.isPending}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {t("account.logout")}
              </button>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function NavItem({
  href,
  active,
  children,
}: {
  href: "/" | "/catalog";
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex h-8 items-center rounded-md px-3 text-sm font-medium transition ${
        active
          ? "bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]"
          : "text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)] hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

function getInitials(source: string): string {
  const s = source?.trim();
  if (!s) return "";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return ((parts[0]![0] ?? "") + (parts[parts.length - 1]![0] ?? "")).toUpperCase();
  }
  return s.slice(0, 2).toUpperCase();
}
