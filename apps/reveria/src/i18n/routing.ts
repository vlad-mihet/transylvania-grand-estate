import { defineRouting } from "next-intl/routing";
import { locales, defaultLocale } from "@tge/i18n";

// Reveria keeps the file-system paths in /instrumente/* (Romanian) but shows
// locale-appropriate URLs to visitors via next-intl pathnames. Every other
// route maps identity. When adding a new /app/[locale] route here, remember
// to also list it in this map — pathnames is authoritative for Link typing.
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: false,
  pathnames: {
    "/": "/",
    "/about": "/about",
    "/contact": "/contact",
    "/faq": "/faq",
    "/properties": "/properties",
    "/properties/[slug]": "/properties/[slug]",
    "/cities": "/cities",
    "/cities/[slug]": "/cities/[slug]",
    "/agents": "/agents",
    "/agents/[slug]": "/agents/[slug]",
    "/developers": "/developers",
    "/developers/[slug]": "/developers/[slug]",
    "/blog": "/blog",
    "/blog/[slug]": "/blog/[slug]",
    "/instrumente": {
      en: "/tools",
      ro: "/instrumente",
      fr: "/outils",
      de: "/werkzeuge",
    },
    "/instrumente/calculator-ipotecar": {
      en: "/tools/mortgage-calculator",
      ro: "/instrumente/calculator-ipotecar",
      fr: "/outils/calculateur-hypothecaire",
      de: "/werkzeuge/hypothekenrechner",
    },
    "/instrumente/costuri-achizitie": {
      en: "/tools/purchase-costs",
      ro: "/instrumente/costuri-achizitie",
      fr: "/outils/frais-d-achat",
      de: "/werkzeuge/kaufkosten",
    },
    "/instrumente/randament-inchiriere": {
      en: "/tools/rental-yield",
      ro: "/instrumente/randament-inchiriere",
      fr: "/outils/rendement-locatif",
      de: "/werkzeuge/mietrendite",
    },
    "/instrumente/capacitate-imprumut": {
      en: "/tools/borrowing-capacity",
      ro: "/instrumente/capacitate-imprumut",
      fr: "/outils/capacite-emprunt",
      de: "/werkzeuge/kreditkapazitaet",
    },
  },
});
