import Link from "next/link";
import { defaultLocale } from "@tge/i18n/constants";

/**
 * Root-level 404. Fires when Next can't resolve a URL to any route — most
 * commonly a locale-less path like `/` or `/blog`. The [locale]/layout.tsx
 * is what supplies <html>/<body> in this app, so this page must render them
 * itself and keep dependencies minimal (no next-intl context, no Providers).
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
          background: "#ffffff",
          color: "#0A0A0A",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <p
            aria-hidden="true"
            style={{
              fontSize: "5.5rem",
              lineHeight: 1,
              fontWeight: 700,
              color: "#7C3AED",
              margin: "0 0 0.5rem 0",
              userSelect: "none",
            }}
          >
            404
          </p>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              margin: "0 0 0.75rem 0",
            }}
          >
            Page not found
          </h1>
          <p
            style={{
              fontSize: "0.95rem",
              color: "#525252",
              margin: "0 0 1.75rem 0",
              lineHeight: 1.6,
            }}
          >
            This page does not exist or was moved.
          </p>
          <Link
            href={`/${defaultLocale}`}
            style={{
              display: "inline-block",
              background: "#7C3AED",
              color: "#ffffff",
              padding: "0.65rem 1.25rem",
              borderRadius: 8,
              fontSize: "0.9rem",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Go to Reveria
          </Link>
        </div>
      </body>
    </html>
  );
}
