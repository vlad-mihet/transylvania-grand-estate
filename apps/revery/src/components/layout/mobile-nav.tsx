"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@tge/ui";
import { Button } from "@tge/ui";
import { InquiryTrigger } from "@tge/ui";
import { LanguageSwitcher } from "./language-switcher";
import { Menu, X } from "lucide-react";
import { cn } from "@tge/utils";

// Internal site routes only — the academy link below is external (different
// origin) and the Contact entry stays out of the array so the external link
// renders cleanly between the two groups. Keep `as const` so next-intl's
// Link accepts the literal-route hrefs.
const navLinks = [
  { key: "properties", href: "/properties" },
  { key: "cities", href: "/cities" },
  { key: "developers", href: "/developers" },
  { key: "agents", href: "/agents" },
  { key: "blog", href: "/blog" },
  { key: "tools", href: "/instrumente" },
  { key: "about", href: "/about" },
] as const;

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const locale = useLocale();
  const academyHref = `${process.env.NEXT_PUBLIC_ACADEMY_URL ?? "http://localhost:3053"}/${locale}/catalog`;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label={t("openMenu")}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="bg-background border-r border-border w-full sm:w-80 p-0">
        <SheetTitle className="sr-only">{t("menuTitle")}</SheetTitle>
        <SheetDescription className="sr-only">{t("menuDescription")}</SheetDescription>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-5 border-b border-border">
            <Image
              src="/logo.png"
              alt="Adorys"
              width={220}
              height={120}
              className="h-9 w-auto"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("closeMenu")}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 overflow-y-auto">
            <div className="flex flex-col gap-1">
              {navLinks.map(({ key, href }) => {
                const isActive = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={key}
                    href={href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "px-3 py-3 text-base font-medium rounded-lg transition-colors",
                      isActive
                        ? "text-primary bg-accent"
                        : "text-foreground hover:bg-muted"
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
                onClick={() => setOpen(false)}
                className={cn(
                  "px-3 py-3 text-base font-medium rounded-lg transition-colors",
                  "text-foreground hover:bg-muted"
                )}
              >
                {t("courses")}
              </a>
              <Link
                href="/contact"
                onClick={() => setOpen(false)}
                aria-current={
                  pathname === "/contact" || pathname.startsWith("/contact/")
                    ? "page"
                    : undefined
                }
                className={cn(
                  "px-3 py-3 text-base font-medium rounded-lg transition-colors",
                  pathname === "/contact" || pathname.startsWith("/contact/")
                    ? "text-primary bg-accent"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {t("contact")}
              </Link>
            </div>
          </nav>

          <div className="px-6 py-6 border-t border-border space-y-4">
            <LanguageSwitcher />
            <InquiryTrigger context={{ type: "general" }} onClick={() => setOpen(false)}>
              <Button className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90">
                {t("scheduleViewing")}
              </Button>
            </InquiryTrigger>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
