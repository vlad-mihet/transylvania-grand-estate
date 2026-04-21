import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_SITE_ID: "ADMIN",
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
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
    "@tge/api-client",
  ],
  // Security headers applied to every non-static response. Tight defaults
  // except for the CSP script-src \u2014 Next.js hydration relies on an inline
  // script; nonce-based CSP is a future hardening pass. For v1, blocking
  // everything but our own API + Google (for OAuth redirects) is already a
  // big win over defaults, which include none of these.
  async headers() {
    const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "")
      .replace(/\/api\/v1\/?$/, "")
      .replace(/\/$/, "");
    const connectSrc = ["'self'", apiOrigin].filter(Boolean).join(" ");
    const csp = [
      "default-src 'self'",
      // Next.js injects inline scripts for hydration; tightening to nonces
      // is the planned follow-up. unsafe-eval kept out.
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      // Uploaded images from the API + Unsplash (used for stock imagery).
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      `connect-src ${connectSrc} https://accounts.google.com`,
      // Let the Google consent screen iframe itself back during OAuth.
      "frame-src https://accounts.google.com",
      // Prevent clickjacking.
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://accounts.google.com",
      // Block dangerous APIs by default.
      "object-src 'none'",
      // Only upgrade to HTTPS automatically; required for the admin deploy.
      "upgrade-insecure-requests",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // HSTS: force HTTPS for a year, include subdomains, preload-eligible.
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          // Locks down modern browser capabilities we never use. Explicit
          // allowlist of ().
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Legacy header superseded by frame-ancestors in CSP but kept for
          // older clients and WAFs that inspect it specifically.
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
export default withNextIntl(nextConfig);
