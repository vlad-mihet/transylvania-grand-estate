import type { MetadataRoute } from "next";
import { locales, defaultLocale } from "@tge/i18n";
import { fetchApi } from "@tge/api-client";
import type { ApiArticle, ApiCity, ApiDeveloper, ApiProperty } from "@tge/types";
import { localizedUrl } from "@/lib/seo";

const STATIC_ROUTES = [
  "/",
  "/properties",
  "/cities",
  "/developers",
  "/blog",
  "/about",
  "/contact",
  "/transylvania",
];

function languages(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const loc of locales) out[loc] = localizedUrl(path, loc);
  out["x-default"] = localizedUrl(path, defaultLocale);
  return out;
}

function entry(
  path: string,
  lastModified?: Date,
): MetadataRoute.Sitemap[number] {
  return {
    url: localizedUrl(path, defaultLocale),
    lastModified: lastModified ?? new Date(),
    alternates: { languages: languages(path) },
  };
}

async function safe<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch {
    return [];
  }
}

function parseDate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Parallel fetch; any single failure yields an empty list so the sitemap
  // still ships the static routes when the backend is flaky.
  const [properties, cities, developers, articles] = await Promise.all([
    safe<ApiProperty>(() =>
      fetchApi<ApiProperty[]>("/properties?limit=1000"),
    ),
    safe<ApiCity>(() => fetchApi<ApiCity[]>("/cities")),
    safe<ApiDeveloper>(() => fetchApi<ApiDeveloper[]>("/developers")),
    safe<ApiArticle>(() =>
      fetchApi<ApiArticle[]>("/articles?status=published&limit=1000"),
    ),
  ]);

  const out: MetadataRoute.Sitemap = [];
  for (const path of STATIC_ROUTES) out.push(entry(path));
  for (const p of properties) {
    out.push(entry(`/properties/${p.slug}`, parseDate(p.updatedAt)));
  }
  for (const c of cities) out.push(entry(`/cities/${c.slug}`));
  for (const d of developers) out.push(entry(`/developers/${d.slug}`));
  for (const art of articles) {
    out.push(entry(`/blog/${art.slug}`, parseDate(art.publishedAt)));
  }
  return out;
}
