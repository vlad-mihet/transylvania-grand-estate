import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SITE_ID: "TGE_LUXURY",
  },
  images: {
    formats: ["image/avif", "image/webp"],
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: process.env.API_HOSTNAME || "localhost",
      },
    ],
  },
  transpilePackages: [
    "@tge/ui",
    "@tge/utils",
    "@tge/hooks",
    "@tge/types",
    "@tge/i18n",
    "@tge/branding",
    "@tge/api-client",
  ],
  // Proxy `/uploads/<path>` to the API origin so locally-stored images
  // (STORAGE_TYPE=local) load same-origin. In production R2 returns
  // absolute URLs and this rule never matches.
  async rewrites() {
    const apiOrigin = (process.env.API_URL ?? "http://localhost:4000/api/v1")
      .replace(/\/api\/v1\/?$/, "")
      .replace(/\/$/, "");
    return [
      { source: "/uploads/:path*", destination: `${apiOrigin}/uploads/:path*` },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
export default withNextIntl(nextConfig);
