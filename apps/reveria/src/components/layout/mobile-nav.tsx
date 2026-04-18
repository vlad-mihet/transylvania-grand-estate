"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@tge/i18n/navigation";
import { Sheet, SheetContent, SheetTrigger } from "@tge/ui";
import { Button } from "@tge/ui";
import { InquiryTrigger } from "@tge/ui";
import { LanguageSwitcher } from "./language-switcher";
import { Menu, X } from "lucide-react";
import { cn } from "@tge/utils";

const navLinks = [
  { key: "properties", href: "/properties" },
  { key: "cities", href: "/cities" },
  { key: "developers", href: "/developers" },
  { key: "agents", href: "/agents" },
  { key: "blog", href: "/blog" },
  { key: "tools", href: "/instrumente" },
  { key: "about", href: "/about" },
  { key: "contact", href: "/contact" },
] as const;

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("Navigation");
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="bg-background border-r border-border w-full sm:w-80 p-0">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-5 border-b border-border">
            <span className="text-xl font-bold tracking-tight">
              Rever<span className="text-primary">ia</span>
            </span>
            <button
              onClick={() => setOpen(false)}
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
            </div>
          </nav>

          <div className="px-6 py-6 border-t border-border space-y-4">
            <LanguageSwitcher variant="inline" />
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
