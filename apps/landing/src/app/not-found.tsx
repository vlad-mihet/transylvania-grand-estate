import Link from "next/link";
import { defaultLocale } from "@tge/i18n/constants";

/**
 * Root-level 404. Fires when Next can't resolve a URL to any route — most
 * commonly a locale-less path like `/` or `/properties`. The [locale]/layout.tsx
 * is what supplies <html>/<body> in this app, so this page renders them itself
 * and keeps dependencies minimal (no next-intl context, no Providers).
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
          background: "#141418",
          color: "#F0EDE8",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <p
            aria-hidden="true"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "6rem",
              lineHeight: 1,
              color: "#C47F5A",
              margin: "0 0 0.5rem 0",
              userSelect: "none",
            }}
          >
            404
          </p>
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "1.75rem",
              fontWeight: 400,
              margin: "0 0 0.75rem 0",
            }}
          >
            Page not found
          </h1>
          <p
            style={{
              fontSize: "0.95rem",
              color: "rgba(240, 237, 232, 0.65)",
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
              background: "#C47F5A",
              color: "#141418",
              padding: "0.65rem 1.25rem",
              borderRadius: 6,
              fontSize: "0.9rem",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Go to Transylvania Grand Estate
          </Link>
        </div>
      </body>
    </html>
  );
}
