import type { MetadataRoute } from "next";
import { SITE_URL, IS_CANONICAL_ORIGIN, absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  if (!IS_CANONICAL_ORIGIN) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
