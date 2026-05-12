import Link from "next/link";
import { defaultLocale } from "@tge/locale";

/**
 * Root-level 404 — fires on URLs that don't match any route (rare with
 * `localePrefix: "as-needed"` since unprefixed paths resolve to the default
 * locale; common after Phase 2's flip to `"always"`). The root layout is a
 * provider-only passthrough, so this page renders its own `<html>` / `<body>`.
 * Keeps deps minimal: no next-intl context, no theme provider.
 */
export default function RootNotFound() {
  return (
    <html lang={defaultLocale}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "#FAFAFA",
          color: "#0A0A0A",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <p
            aria-hidden="true"
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "#71717A",
              margin: "0 0 0.75rem 0",
            }}
          >
            404
          </p>
          <h1
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              margin: "0 0 0.5rem 0",
            }}
          >
            Page not found
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#71717A",
              margin: "0 0 1.25rem 0",
              lineHeight: 1.5,
            }}
          >
            The page you are looking for doesn&apos;t exist.
          </p>
          <Link
            href={`/${defaultLocale}`}
            style={{
              display: "inline-block",
              background: "#C47F5A",
              color: "#FFFFFF",
              padding: "0.5rem 1rem",
              borderRadius: 6,
              fontSize: "0.875rem",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Go to admin
          </Link>
        </div>
      </body>
    </html>
  );
}
