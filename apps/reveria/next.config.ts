import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SITE_ID: "REVERIA",
  },
  images: {
    formats: ["image/avif", "image/webp"],
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
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
export default withNextIntl(nextConfig);
