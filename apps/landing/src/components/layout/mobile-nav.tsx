"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@tge/i18n/navigation";
import { Sheet, SheetContent, SheetTrigger } from "@tge/ui";
import { Button } from "@tge/ui";
import { AccentButton } from "@tge/ui";
import { InquiryTrigger } from "@tge/ui";
import { LanguageSwitcher } from "./language-switcher";
import { Menu, X, ChevronDown, Phone, Mail } from "lucide-react";
import { cn } from "@tge/utils";

const propertyTypes = [
  { key: "apartment", slug: "apartment" },
  { key: "house", slug: "house" },
  { key: "villa", slug: "villa" },
  { key: "terrain", slug: "terrain" },
  { key: "penthouse", slug: "penthouse" },
  { key: "estate", slug: "estate" },
  { key: "chalet", slug: "chalet" },
] as const;

const cities = [
  { name: "Cluj-Napoca", slug: "cluj-napoca" },
  { name: "Oradea", slug: "oradea" },
  { name: "Timișoara", slug: "timisoara" },
  { name: "Brașov", slug: "brasov" },
  { name: "Sibiu", slug: "sibiu" },
] as const;

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const t = useTranslations("Navigation");
  const tTypes = useTranslations("Common.propertyTypes");
  const pathname = usePathname();

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-cream hover:text-copper hover:bg-transparent"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="bg-background border-l-0 w-full sm:w-full p-0"
      >
        <div className="flex flex-col h-full">
          {/* Header with logo and close */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-copper/10">
            <span className="font-serif text-xl text-cream tracking-[0.03em]">
              Transylvania
              <span className="text-copper"> Grand Estate</span>
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-cream/60 hover:text-cream transition-colors p-1 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation items */}
          <nav className="flex-1 px-6 py-8 overflow-y-auto">
            <div className="flex flex-col">
              {/* For Sale — expandable */}
              <div className="border-b border-copper/5">
                <button
                  onClick={() => toggleSection("forSale")}
                  className={cn(
                    "flex items-center justify-between w-full text-2xl font-serif py-4 transition-colors cursor-pointer",
                    expandedSection === "forSale"
                      ? "text-copper"
                      : "text-cream/80 hover:text-copper"
                  )}
                >
                  {t("forSale")}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-300",
                      expandedSection === "forSale" && "rotate-180"
                    )}
                  />
                </button>
                {expandedSection === "forSale" && (
                  <div className="ml-4 pl-4 border-l border-copper/10 mb-4 flex flex-col gap-1">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-copper/70 mt-2 mb-2 font-serif">
                      {t("propertyTypes")}
                    </p>
                    {propertyTypes.map((type) => (
                      <Link
                        key={type.slug}
                        href={`/properties?type=${type.slug}`}
                        onClick={() => setOpen(false)}
                        className="text-sm text-cream/60 hover:text-cream py-1.5 transition-colors"
                      >
                        {tTypes(type.key)}
                      </Link>
                    ))}
                    <p className="text-[11px] uppercase tracking-[0.2em] text-copper/70 mt-4 mb-2 font-serif">
                      {t("popularCities")}
                    </p>
                    {cities.map((city) => (
                      <Link
                        key={city.slug}
                        href={`/cities/${city.slug}`}
                        onClick={() => setOpen(false)}
                        className="text-sm text-cream/60 hover:text-cream py-1.5 transition-colors"
                      >
                        {city.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* New Developments — expandable */}
              <div className="border-b border-copper/5">
                <button
                  onClick={() => toggleSection("newDevelopments")}
                  className={cn(
                    "flex items-center justify-between w-full text-2xl font-serif py-4 transition-colors cursor-pointer",
                    expandedSection === "newDevelopments"
                      ? "text-copper"
                      : "text-cream/80 hover:text-copper"
                  )}
                >
                  {t("newDevelopments")}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-300",
                      expandedSection === "newDevelopments" && "rotate-180"
                    )}
                  />
                </button>
                {expandedSection === "newDevelopments" && (
                  <div className="ml-4 pl-4 border-l border-copper/10 mb-4 flex flex-col gap-1">
                    <Link
                      href="/properties?type=apartment"
                      onClick={() => setOpen(false)}
                      className="text-sm text-cream/60 hover:text-cream py-1.5 transition-colors"
                    >
                      {tTypes("apartment")}
                    </Link>
                    <Link
                      href="/properties?type=house"
                      onClick={() => setOpen(false)}
                      className="text-sm text-cream/60 hover:text-cream py-1.5 transition-colors"
                    >
                      {tTypes("house")}
                    </Link>
                  </div>
                )}
              </div>

              {/* Cities link */}
              <Link
                href="/cities"
                onClick={() => setOpen(false)}
                className={cn(
                  "text-2xl font-serif py-4 border-b border-copper/5 transition-colors",
                  pathname === "/cities" || pathname.startsWith("/cities/")
                    ? "text-copper"
                    : "text-cream/80 hover:text-copper"
                )}
              >
                {t("cities")}
              </Link>

              {/* Developers link */}
              <Link
                href="/developers"
                onClick={() => setOpen(false)}
                className={cn(
                  "text-2xl font-serif py-4 border-b border-copper/5 transition-colors",
                  pathname === "/developers"
                    ? "text-copper"
                    : "text-cream/80 hover:text-copper"
                )}
              >
                {t("developers")}
              </Link>

              {/* About */}
              <Link
                href="/about"
                onClick={() => setOpen(false)}
                className={cn(
                  "text-2xl font-serif py-4 border-b border-copper/5 transition-colors",
                  pathname === "/about"
                    ? "text-copper"
                    : "text-cream/80 hover:text-copper"
                )}
              >
                {t("about")}
              </Link>

              {/* Contact */}
              <Link
                href="/contact"
                onClick={() => setOpen(false)}
                className={cn(
                  "text-2xl font-serif py-4 border-b border-copper/5 transition-colors",
                  pathname === "/contact"
                    ? "text-copper"
                    : "text-cream/80 hover:text-copper"
                )}
              >
                {t("contact")}
              </Link>
            </div>
          </nav>

          {/* Bottom section */}
          <div className="px-6 py-6 border-t border-copper/10 space-y-5">
            {/* Language switcher */}
            <LanguageSwitcher variant="inline" />

            {/* Contact info */}
            <div className="flex flex-col gap-2 text-sm text-cream-muted/70">
              <a
                href="tel:+40264123456"
                className="flex items-center gap-2 hover:text-copper transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
                +40 264 123 456
              </a>
              <a
                href="mailto:contact@tge.ro"
                className="flex items-center gap-2 hover:text-copper transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />
                contact@tge.ro
              </a>
            </div>

            {/* Full-width CTA */}
            <InquiryTrigger
              context={{ type: "general" }}
              onClick={() => setOpen(false)}
            >
              <AccentButton
                accentVariant="solid"
                className="w-full h-12 text-sm"
              >
                {t("scheduleViewing")}
              </AccentButton>
            </InquiryTrigger>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
