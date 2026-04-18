import type { Metadata } from "next";
import { getBrand } from "@tge/branding";
import { locales, defaultLocale, type Locale } from "@tge/i18n";
import { getPathname } from "@/i18n/navigation";

// Trimmed absolute origin. Falls back to localhost for dev when the env var is
// unset so routes like robots.ts still render instead of crashing the build.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export function absoluteUrl(pathname: string): string {
  if (/^https?:/i.test(pathname)) return pathname;
  const prefix = pathname.startsWith("/") ? "" : "/";
  return `${SITE_URL}${prefix}${pathname}`;
}

// Paths like "/instrumente/calculator-ipotecar" need the next-intl pathnames
// lookup so canonical + hreflang + sitemap URLs reflect the locale-specific
// public path (e.g. /en/tools/mortgage-calculator). Dynamic pages pass the
// interpolated slug string (e.g. "/properties/cluj-home-42"), which doesn't
// match a pathname key — for those we fall back to manual /<locale><path>
// construction. localePrefix is "always", so the prefix is unconditional.
const LOCALIZED_PREFIXES = ["/instrumente"] as const;

function isLocalizedPath(path: string): boolean {
  return LOCALIZED_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
}

export function localizedPath(path: string, locale: Locale): string {
  if (isLocalizedPath(path)) {
    // The pathnames map is keyed on the untranslated (Romanian file-system)
    // path; getPathname resolves it to the locale-specific URL and prepends
    // "/<locale>" because localePrefix is "always".
    return getPathname({ href: path as never, locale });
  }
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${clean}`;
}

export function localizedUrl(path: string, locale: Locale): string {
  return absoluteUrl(localizedPath(path, locale));
}

const OG_LOCALES: Record<Locale, string> = {
  en: "en_US",
  ro: "ro_RO",
  fr: "fr_FR",
  de: "de_DE",
};

export function buildAlternates(
  path: string,
  currentLocale: Locale,
): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = {};
  for (const loc of locales) {
    languages[loc] = localizedUrl(path, loc);
  }
  languages["x-default"] = localizedUrl(path, defaultLocale);
  return {
    canonical: localizedUrl(path, currentLocale),
    languages,
  };
}

export interface CreateMetadataOptions {
  title: string;
  description: string;
  path: string;
  locale: Locale;
  image?: string | null;
  type?: "website" | "article" | "profile";
  noIndex?: boolean;
  publishedTime?: string;
  authors?: string[];
}

export function createMetadata(opts: CreateMetadataOptions): Metadata {
  const brand = getBrand();
  const url = localizedUrl(opts.path, opts.locale);
  const type = opts.type ?? "website";

  // Next auto-applies the convention-based opengraph-image.tsx only when the
  // route has no `openGraph` block in its generated metadata — ours always
  // returns one (for title/description/url/siteName), so we explicitly point
  // og:image at the per-locale convention URL when no entity image is
  // provided. This keeps social shares populated on listing / content pages
  // while letting detail pages override with a property photo, article
  // cover, etc.
  const image = opts.image
    ? (/^https?:/i.test(opts.image) ? opts.image : absoluteUrl(opts.image))
    : absoluteUrl(`/${opts.locale}/opengraph-image`);

  return {
    title: opts.title,
    description: opts.description,
    alternates: buildAlternates(opts.path, opts.locale),
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      siteName: brand.name,
      type,
      locale: OG_LOCALES[opts.locale],
      alternateLocale: locales
        .filter((l) => l !== opts.locale)
        .map((l) => OG_LOCALES[l]),
      images: [{ url: image, width: 1200, height: 630, alt: opts.title }],
      ...(type === "article" && opts.publishedTime
        ? { publishedTime: opts.publishedTime }
        : {}),
      ...(type === "article" && opts.authors ? { authors: opts.authors } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: [image],
    },
    robots: opts.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}
