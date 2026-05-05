"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Container } from "./container";
import { LanguageSwitcher } from "./language-switcher";
import { MobileNav } from "./mobile-nav";
import { Button } from "@tge/ui";
import { InquiryTrigger } from "@tge/ui";
import { cn } from "@tge/utils";

// Internal site routes only — the academy link below is external (different
// origin) and the Contact entry stays out of the array so the external link
// renders cleanly between the two groups. Keep `as const` so next-intl's
// Link accepts the literal-route hrefs.
const navLinks = [
  { key: "properties", href: "/properties" },
  { key: "cities", href: "/cities" },
  { key: "developers", href: "/developers" },
  { key: "blog", href: "/blog" },
  { key: "tools", href: "/instrumente" },
  { key: "about", href: "/about" },
] as const;

export function Header() {
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const locale = useLocale();
  // Mirrors the footer's academy link (same env var + path) so both
  // entrypoints land on the same locale-aware catalog page.
  const academyHref = `${process.env.NEXT_PUBLIC_ACADEMY_URL ?? "http://localhost:3053"}/${locale}/catalog`;

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <Container>
        {/* Desktop */}
        <div className="hidden lg:flex items-center justify-between h-16">
          <Link href="/" className="shrink-0">
            <span className="text-xl font-bold tracking-tight text-foreground">
              Rever<span className="text-primary">y</span>
            </span>
          </Link>

          <nav aria-label={t("menuTitle")} className="flex items-center gap-1">
            {navLinks.map(({ key, href }) => {
              const isActive = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={key}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "text-primary bg-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {t(key)}
                </Link>
              );
            })}
            <a
              href={academyHref}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {t("courses")}
            </a>
            <Link
              href="/contact"
              aria-current={
                pathname === "/contact" || pathname.startsWith("/contact/")
                  ? "page"
                  : undefined
              }
              className={cn(
                "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                pathname === "/contact" || pathname.startsWith("/contact/")
                  ? "text-primary bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {t("contact")}
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <InquiryTrigger context={{ type: "general" }}>
              <Button variant="outline" size="sm" className="text-xs font-medium">
                {t("scheduleViewing")}
              </Button>
            </InquiryTrigger>
          </div>
        </div>

        {/* Mobile */}
        <div className="flex lg:hidden items-center justify-between h-14">
          <MobileNav />
          <Link href="/" className="absolute left-1/2 -translate-x-1/2">
            <span className="text-lg font-bold tracking-tight text-foreground">
              Rever<span className="text-primary">y</span>
            </span>
          </Link>
          <div className="w-10" />
        </div>
      </Container>
    </header>
  );
}
