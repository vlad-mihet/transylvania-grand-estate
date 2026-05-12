import type { MetadataRoute } from "next";
import { locales, defaultLocale } from "@tge/i18n";
import { localizedUrl } from "@/lib/seo";

// Academy is gated behind authentication; only marketing surfaces (login,
// register, public course catalog) are indexed. Catalog entries themselves
// require a live student session to render, so we don't enumerate course
// slugs in the sitemap — that would dangle dead URLs for crawlers.
const STATIC_ROUTES = ["/", "/login", "/register", "/catalog"];

function languages(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const loc of locales) out[loc] = localizedUrl(path, loc);
  out["x-default"] = localizedUrl(path, defaultLocale);
  return out;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return STATIC_ROUTES.map((path) => ({
    url: localizedUrl(path, defaultLocale),
    lastModified: new Date(),
    alternates: { languages: languages(path) },
  }));
}
