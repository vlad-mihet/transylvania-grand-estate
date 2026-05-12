import type { Metadata } from "next";
import { getBrand } from "@tge/branding";
import { locales, defaultLocale, type Locale } from "@tge/i18n";

function resolveOrigin(): { url: string; canonical: boolean } {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return { url: explicit.replace(/\/$/, ""), canonical: true };
  const prodAlias = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prodAlias)
    return {
      url: `https://${prodAlias.replace(/\/$/, "")}`,
      canonical: false,
    };
  const anyAlias = process.env.VERCEL_URL;
  if (anyAlias)
    return { url: `https://${anyAlias.replace(/\/$/, "")}`, canonical: false };
  return { url: "http://localhost:3053", canonical: false };
}

const origin = resolveOrigin();
export const SITE_URL = origin.url;
export const IS_CANONICAL_ORIGIN = origin.canonical;

export function absoluteUrl(pathname: string): string {
  if (/^https?:/i.test(pathname)) return pathname;
  const prefix = pathname.startsWith("/") ? "" : "/";
  return `${SITE_URL}${prefix}${pathname}`;
}

export function localizedPath(path: string, locale: Locale): string {
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
}

export function createMetadata(opts: CreateMetadataOptions): Metadata {
  const brand = getBrand();
  const url = localizedUrl(opts.path, opts.locale);
  const type = opts.type ?? "website";

  const image = opts.image
    ? /^https?:/i.test(opts.image)
      ? opts.image
      : absoluteUrl(opts.image)
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
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: [image],
    },
    robots:
      opts.noIndex || !IS_CANONICAL_ORIGIN
        ? { index: false, follow: false }
        : { index: true, follow: true },
  };
}
