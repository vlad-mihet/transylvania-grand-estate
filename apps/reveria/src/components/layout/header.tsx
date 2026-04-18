"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Container } from "./container";
import { LanguageSwitcher } from "./language-switcher";
import { MobileNav } from "./mobile-nav";
import { Button } from "@tge/ui";
import { InquiryTrigger } from "@tge/ui";
import { cn } from "@tge/utils";

const navLinks = [
  { key: "properties", href: "/properties" },
  { key: "cities", href: "/cities" },
  { key: "developers", href: "/developers" },
  { key: "blog", href: "/blog" },
  { key: "tools", href: "/instrumente" },
  { key: "about", href: "/about" },
  { key: "contact", href: "/contact" },
] as const;

export function Header() {
  const t = useTranslations("Navigation");
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <Container>
        {/* Desktop */}
        <div className="hidden lg:flex items-center justify-between h-16">
          <Link href="/" className="shrink-0">
            <span className="text-xl font-bold tracking-tight text-foreground">
              Rever<span className="text-primary">ia</span>
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
              Rever<span className="text-primary">ia</span>
            </span>
          </Link>
          <div className="w-10" />
        </div>
      </Container>
    </header>
  );
}
