import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // `standalone` output lets the Docker build copy a self-contained
  // `server.js` + minimal node_modules into the runner stage.
  output: "standalone",
  env: {
    NEXT_PUBLIC_SITE_ID: "ACADEMY",
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "http", hostname: "localhost" },
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
