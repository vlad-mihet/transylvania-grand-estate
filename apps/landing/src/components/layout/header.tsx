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
import { InquiryTrigger } from "@tge/ui";
import { cn } from "@tge/utils";
import { ChevronDown, Phone, Mail } from "lucide-react";
import { DiamondSvg } from "./floating-diamond";
import { CONTACT_PHONE } from "@/lib/contact";

const propertyTypes = [
  { key: "apartment", slug: "apartment" },
  { key: "house", slug: "house" },
  { key: "villa", slug: "villa" },
  { key: "terrain", slug: "terrain" },
  { key: "penthouse", slug: "penthouse" },
  { key: "estate", slug: "estate" },
  { key: "chalet", slug: "chalet" },
] as const;

type MenuId = "forSale" | "newDevelopments" | "developers" | null;

const CITIES_PER_COLUMN = 6;

function chunk<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

interface HeaderProps {
  developers: { name: string; slug: string }[];
  // Curated featured-cities list (from `/cities?featured=true`). The header
  // mirrors what the homepage's CityShowcase renders so the nav and the page
  // never drift. Empty fallback keeps the nav usable when the API is down.
  cities: { name: string; slug: string }[];
}

export function Header({ developers, cities }: HeaderProps) {
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

  const cityColumns = chunk(cities, CITIES_PER_COLUMN);

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
      // pt-[var(--header-safe-top)] gives the utility bar an 8px breathing
      // gutter from the viewport edge (8pt-grid baseline) and auto-extends
      // past the notch on iOS PWA. Token defined in theme.css.
      className={cn(
        "fixed top-0 left-0 right-0 z-50 pt-[var(--header-safe-top)] transition-all duration-500 overflow-visible",
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
                href={`tel:${CONTACT_PHONE.tel}`}
                className="flex items-center gap-1.5 text-[11px] text-cream-muted hover:text-copper tracking-[0.1em] uppercase transition-colors duration-500 ease-luxury"
              >
                <Phone className="h-3 w-3" />
                {CONTACT_PHONE.display}
              </a>
              <span className="w-px h-3 bg-copper/15" />
              <a
                href="mailto:contact@transylvaniagrandestate.ro"
                className="flex items-center gap-1.5 text-[11px] text-cream-muted hover:text-copper tracking-[0.1em] uppercase transition-colors duration-500 ease-luxury"
              >
                <Mail className="h-3 w-3" />
                contact@transylvaniagrandestate.ro
              </a>
            </div>

            {/* Right: language switcher */}
            <LanguageSwitcher />
          </div>
        </Container>
      </div>

      {/* Main navigation bar */}
      <Container className="max-w-screen-2xl">
        {/* Desktop nav — logo left, nav center, CTA right */}
        <div className="hidden xl:grid grid-cols-[1fr_auto_1fr] items-center h-20">
          {/* Left: logo */}
          <div className="flex items-center gap-3">
            <div id="header-diamond" className="relative opacity-70">
              <div className="absolute inset-0 -m-2 rounded-full animate-diamond-glow bg-amethyst/20 blur-md" />
              <DiamondSvg className="relative block w-8 h-8" />
            </div>
            <Link href="/" className="flex items-center gap-4 group">
              <span className="font-serif xl:text-[17px] 2xl:text-[20px] font-medium text-cream tracking-[0.03em] leading-none whitespace-nowrap transition-colors duration-300">
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
              <AccentButton size="sm" className="h-9 px-6">
                {t("scheduleViewing")}
              </AccentButton>
            </InquiryTrigger>
          </div>
        </div>

        {/* Mobile nav (<lg) — centered logo with hamburger */}
        <div className="flex xl:hidden items-center justify-between h-16">
          <MobileNav cities={cities} />
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
          <div className="grid grid-cols-[1fr_2fr_1fr] gap-16">
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
              <CityGrid
                columns={cityColumns}
                hrefFor={(c) => `/cities/${c.slug}`}
                onClick={closeMenuImmediate}
              />
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
          <div className="grid grid-cols-[1fr_2fr_1fr] gap-16">
            <MegaMenuColumn title={t("propertyTypes")}>
              <MegaMenuLink href="/properties?type=apartment" onClick={closeMenuImmediate}>
                {tTypes("apartment")}
              </MegaMenuLink>
              <MegaMenuLink href="/properties?type=house" onClick={closeMenuImmediate}>
                {tTypes("house")}
              </MegaMenuLink>
            </MegaMenuColumn>
            <MegaMenuColumn title={t("popularCities")}>
              <CityGrid
                columns={cityColumns}
                hrefFor={(c) => `/cities/${c.slug}`}
                onClick={closeMenuImmediate}
              />
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
          <div className="grid grid-cols-[1fr_2fr] gap-16">
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
              <CityGrid
                columns={cityColumns}
                hrefFor={(c) => `/developers?city=${c.slug}`}
                onClick={closeMenuImmediate}
              />
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
          "nav-underline flex items-center gap-1 text-[12px] font-medium uppercase tracking-[0.08em] whitespace-nowrap cursor-pointer transition-colors duration-500 ease-luxury py-2",
          isActive ? "text-copper active" : "text-cream/60 hover:text-cream"
        )}
      >
        {label}
        <ChevronDown
          className={cn(
            "h-2.5 w-2.5 transition-transform duration-500 ease-luxury ml-0.5",
            isActive && "rotate-180"
          )}
        />
      </button>
    </div>
  );
}

/* Renders an array-of-arrays of cities as side-by-side sub-columns inside a
   MegaMenuColumn. Caller decides chunk size (CITIES_PER_COLUMN) and the
   per-city href via `hrefFor`. */
function CityGrid({
  columns,
  hrefFor,
  onClick,
}: {
  columns: { name: string; slug: string }[][];
  hrefFor: (city: { name: string; slug: string }) => string;
  onClick?: () => void;
}) {
  if (columns.length === 0) return null;
  return (
    <div
      className="grid gap-x-12 gap-y-3"
      style={{
        gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
      }}
    >
      {columns.map((col, i) => (
        // mega-menu-items class re-anchors the staggered fade-in (defined in
        // packages/tailwind-config/src/theme.css) for the cities inside this
        // sub-column. The shared rule targets direct children only, so without
        // this each city would skip the entrance animation that the rest of
        // the menu items receive.
        <div key={i} className="mega-menu-items flex flex-col gap-2.5">
          {col.map((city) => (
            <MegaMenuLink
              key={city.slug}
              href={hrefFor(city)}
              onClick={onClick}
            >
              {city.name}
            </MegaMenuLink>
          ))}
        </div>
      ))}
    </div>
  );
}
