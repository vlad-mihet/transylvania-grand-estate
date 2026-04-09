"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@tge/i18n/navigation";
import { useScrollDirection } from "@tge/hooks";
import { Container } from "./container";
import { LanguageSwitcher } from "./language-switcher";
import { MobileNav } from "./mobile-nav";
import { MegaMenu, MegaMenuColumn, MegaMenuLink } from "./mega-menu";
import { AccentButton } from "@tge/ui";
import { InquiryTrigger } from "@/components/inquiry";
import { cn } from "@tge/utils";
import { ChevronDown, Phone, Mail } from "lucide-react";
import { DiamondSvg } from "./floating-diamond";

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

type MenuId = "forSale" | "newDevelopments" | "developers" | null;

interface HeaderProps {
  developers: { name: string; slug: string }[];
}

export function Header({ developers }: HeaderProps) {
  const t = useTranslations("Navigation");
  const tTypes = useTranslations("Common.propertyTypes");
  const pathname = usePathname();
  const { scrollDirection, scrollY } = useScrollDirection();
  const isScrolled = scrollY > 50;
  const isHidden = scrollDirection === "down" && scrollY > 150;
  const isHomepage = pathname === "/";
  const isDeveloperShowcase =
    pathname.startsWith("/developers/") && pathname !== "/developers";

  const [activeMenu, setActiveMenu] = useState<MenuId>(null);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const openMenu = useCallback(
    (menu: MenuId) => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
      setActiveMenu(menu);
    },
    [hoverTimeout]
  );

  const closeMenu = useCallback(() => {
    const timeout = setTimeout(() => setActiveMenu(null), 150);
    setHoverTimeout(timeout);
  }, []);

  const closeMenuImmediate = useCallback(() => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setActiveMenu(null);
  }, [hoverTimeout]);

  const showSolidBg = isScrolled || (!isHomepage && !isDeveloperShowcase);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 overflow-visible",
        isHidden ? "-translate-y-full" : "translate-y-0",
        showSolidBg
          ? "bg-background/95 backdrop-blur-md border-b border-copper/10 header-glow"
          : "after:absolute after:inset-0 after:h-[140%] after:bg-gradient-to-b after:from-black/60 after:via-black/30 after:to-transparent after:pointer-events-none after:-z-10"
      )}
    >
      {/* Top utility bar — desktop only, collapses on scroll */}
      <div
        className={cn(
          "hidden xl:block overflow-hidden transition-all duration-500 ease-in-out",
          isScrolled
            ? "h-0 opacity-0"
            : "h-8 opacity-100"
        )}
      >
        <Container className="max-w-screen-2xl">
          <div className="flex items-center justify-between h-8">
            {/* Left: contact info */}
            <div className="flex items-center gap-6">
              <a
                href="tel:+40264123456"
                className="flex items-center gap-1.5 text-[11px] text-cream-muted hover:text-copper tracking-[0.1em] uppercase transition-colors duration-500 ease-luxury"
              >
                <Phone className="h-3 w-3" />
                +40 264 123 456
              </a>
              <span className="w-px h-3 bg-copper/15" />
              <a
                href="mailto:contact@tge.ro"
                className="flex items-center gap-1.5 text-[11px] text-cream-muted hover:text-copper tracking-[0.1em] uppercase transition-colors duration-500 ease-luxury"
              >
                <Mail className="h-3 w-3" />
                contact@tge.ro
              </a>
            </div>

            {/* Right: language switcher */}
            <LanguageSwitcher variant="inline" />
          </div>
        </Container>
      </div>

      {/* Main navigation bar */}
      <Container className="max-w-screen-2xl">
        {/* Desktop nav — logo left, nav center, CTA right */}
        <div className="hidden xl:grid grid-cols-[1fr_auto_1fr] items-center h-20">
          {/* Left: logo */}
          <div className="flex items-center gap-3">
            <div id="header-diamond" className={cn("relative", isHomepage ? "opacity-0" : "opacity-70")}>
              <div className="absolute inset-0 -m-2 rounded-full animate-diamond-glow bg-amethyst/20 blur-md" />
              <DiamondSvg className="relative w-8 h-8" />
            </div>
            <Link href="/" className="flex items-center gap-4 group">
              <span className="font-serif xl:text-[22px] 2xl:text-[26px] font-medium text-cream tracking-[0.03em] leading-none whitespace-nowrap transition-colors duration-300">
                Transylvania
                <span className="text-copper logo-glow group-hover:text-copper-light">
                  {" "}Grand Estate
                </span>
              </span>
            </Link>
          </div>

          {/* Center: navigation */}
          <div className="flex items-center justify-center xl:gap-3 2xl:gap-8">
            <NavDropdown
              label={t("forSale")}
              isActive={activeMenu === "forSale"}
              onMouseEnter={() => openMenu("forSale")}
              onMouseLeave={closeMenu}
            />
            <NavDropdown
              label={t("newDevelopments")}
              isActive={activeMenu === "newDevelopments"}
              onMouseEnter={() => openMenu("newDevelopments")}
              onMouseLeave={closeMenu}
            />
            <NavDropdown
              label={t("developers")}
              isActive={activeMenu === "developers"}
              onMouseEnter={() => openMenu("developers")}
              onMouseLeave={closeMenu}
            />
          </div>

          {/* Right: CTA */}
          <div className="flex items-center justify-end">
            <InquiryTrigger context={{ type: "general" }}>
              <AccentButton
                accentVariant="solid"
                size="sm"
                className="text-xs h-9 px-5"
              >
                {t("scheduleViewing")}
              </AccentButton>
            </InquiryTrigger>
          </div>
        </div>

        {/* Mobile nav (<lg) — centered logo with hamburger */}
        <div className="flex xl:hidden items-center justify-between h-16">
          <MobileNav />
          <Link href="/" className="absolute left-1/2 -translate-x-1/2">
            <span className="font-serif text-lg sm:text-xl text-cream tracking-[0.03em] leading-none whitespace-nowrap">
              Transylvania
              <span className="text-copper"> Grand Estate</span>
            </span>
          </Link>
          {/* Spacer to balance hamburger for centering */}
          <div className="w-10" />
        </div>
      </Container>

      {/* Mega-menu panels */}
      <div
        onMouseEnter={() => activeMenu && openMenu(activeMenu)}
        onMouseLeave={closeMenu}
      >
        {/* For Sale mega-menu */}
        <MegaMenu isOpen={activeMenu === "forSale"} onClose={closeMenuImmediate}>
          <div className="grid grid-cols-3 gap-16">
            <MegaMenuColumn title={t("propertyTypes")}>
              {propertyTypes.map((type) => (
                <MegaMenuLink
                  key={type.slug}
                  href={`/properties?type=${type.slug}`}
                  onClick={closeMenuImmediate}
                >
                  {tTypes(type.key)}
                </MegaMenuLink>
              ))}
            </MegaMenuColumn>
            <MegaMenuColumn title={t("popularCities")}>
              {cities.map((city) => (
                <MegaMenuLink
                  key={city.slug}
                  href={`/cities/${city.slug}`}
                  onClick={closeMenuImmediate}
                >
                  {city.name}
                </MegaMenuLink>
              ))}
              <MegaMenuLink href="/cities" onClick={closeMenuImmediate}>
                {t("viewAllCities")}
              </MegaMenuLink>
            </MegaMenuColumn>
            <MegaMenuColumn title={t("featuredSection")}>
              <MegaMenuLink href="/properties" onClick={closeMenuImmediate}>
                {t("viewAllProperties")}
              </MegaMenuLink>
              <MegaMenuLink href="/properties?sort=newest" onClick={closeMenuImmediate}>
                {t("latestListings")}
              </MegaMenuLink>
              <MegaMenuLink href="/properties?sort=price-desc" onClick={closeMenuImmediate}>
                {t("mostPopular")}
              </MegaMenuLink>
            </MegaMenuColumn>
          </div>
        </MegaMenu>

        {/* New Developments mega-menu */}
        <MegaMenu isOpen={activeMenu === "newDevelopments"} onClose={closeMenuImmediate}>
          <div className="grid grid-cols-3 gap-16">
            <MegaMenuColumn title={t("propertyTypes")}>
              <MegaMenuLink href="/properties?type=apartment" onClick={closeMenuImmediate}>
                {tTypes("apartment")}
              </MegaMenuLink>
              <MegaMenuLink href="/properties?type=house" onClick={closeMenuImmediate}>
                {tTypes("house")}
              </MegaMenuLink>
            </MegaMenuColumn>
            <MegaMenuColumn title={t("popularCities")}>
              {cities.map((city) => (
                <MegaMenuLink
                  key={city.slug}
                  href={`/cities/${city.slug}`}
                  onClick={closeMenuImmediate}
                >
                  {city.name}
                </MegaMenuLink>
              ))}
              <MegaMenuLink href="/cities" onClick={closeMenuImmediate}>
                {t("viewAllCities")}
              </MegaMenuLink>
            </MegaMenuColumn>
            <MegaMenuColumn title={t("popularDevelopers")}>
              {developers.slice(0, 5).map((dev) => (
                <MegaMenuLink
                  key={dev.slug}
                  href={`/developers/${dev.slug}`}
                  onClick={closeMenuImmediate}
                >
                  {dev.name}
                </MegaMenuLink>
              ))}
              <MegaMenuLink href="/developers" onClick={closeMenuImmediate}>
                {t("viewAllDevelopers")}
              </MegaMenuLink>
            </MegaMenuColumn>
          </div>
        </MegaMenu>

        {/* Developers mega-menu */}
        <MegaMenu isOpen={activeMenu === "developers"} onClose={closeMenuImmediate}>
          <div className="grid grid-cols-2 gap-16">
            <MegaMenuColumn title={t("popularDevelopers")}>
              {developers.slice(0, 5).map((dev) => (
                <MegaMenuLink
                  key={dev.slug}
                  href={`/developers/${dev.slug}`}
                  onClick={closeMenuImmediate}
                >
                  {dev.name}
                </MegaMenuLink>
              ))}
              <MegaMenuLink href="/developers" onClick={closeMenuImmediate}>
                {t("viewAllDevelopers")}
              </MegaMenuLink>
            </MegaMenuColumn>
            <MegaMenuColumn title={t("byCity")}>
              {cities.map((city) => (
                <MegaMenuLink
                  key={city.slug}
                  href={`/developers?city=${city.slug}`}
                  onClick={closeMenuImmediate}
                >
                  {city.name}
                </MegaMenuLink>
              ))}
            </MegaMenuColumn>
          </div>
        </MegaMenu>
      </div>
    </header>
  );
}

/* Extracted nav dropdown button for DRY */
function NavDropdown({
  label,
  isActive,
  onMouseEnter,
  onMouseLeave,
}: {
  label: string;
  isActive: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <div className="relative" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <button
        className={cn(
          "nav-underline flex items-center gap-1 text-sm font-medium uppercase tracking-[0.06em] whitespace-nowrap cursor-pointer transition-colors duration-500 ease-luxury py-2",
          isActive ? "text-copper active" : "text-cream/60 hover:text-cream"
        )}
      >
        {label}
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform duration-500 ease-luxury ml-0.5",
            isActive && "rotate-180"
          )}
        />
      </button>
    </div>
  );
}
