import Link from "next/link";
import { defaultLocale } from "@tge/i18n/constants";

// Multi-locale 404 — this page fires when Next can't resolve a route at all,
// after middleware. In practice the [locale]/not-found.tsx handles most
// misses (and renders in the user's locale). This top-level fallback only
// hits truly unmatched paths (static-asset misses, middleware excludes), so
// we stack four locales side-by-side rather than guessing — same shape
// Wikipedia uses on its global error pages.
const MESSAGES: Array<{
  locale: string;
  title: string;
  description: string;
  cta: string;
}> = [
  {
    locale: "ro",
    title: "Pagină negăsită",
    description: "Această pagină nu există sau a fost mutată.",
    cta: "Mergi la Academy",
  },
  {
    locale: "en",
    title: "Page not found",
    description: "This page does not exist or was moved.",
    cta: "Go to Academy",
  },
  {
    locale: "fr",
    title: "Page introuvable",
    description: "Cette page n'existe pas ou a été déplacée.",
    cta: "Aller à Academy",
  },
  {
    locale: "de",
    title: "Seite nicht gefunden",
    description: "Diese Seite existiert nicht oder wurde verschoben.",
    cta: "Zu Academy",
  },
];

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
          color: "#0a0a0a",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <p
            aria-hidden="true"
            style={{
              fontSize: "5.5rem",
              lineHeight: 1,
              fontWeight: 700,
              color: "#5b21b6",
              margin: "0 0 1rem 0",
              userSelect: "none",
            }}
          >
            404
          </p>
          {MESSAGES.map((m) => (
            <div
              key={m.locale}
              lang={m.locale}
              style={{ margin: "0 0 1rem 0" }}
            >
              <h1
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 600,
                  margin: "0 0 0.25rem 0",
                }}
              >
                {m.title}
              </h1>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "#525252",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {m.description}
              </p>
            </div>
          ))}
          <Link
            href={`/${defaultLocale}`}
            style={{
              display: "inline-block",
              marginTop: "0.75rem",
              background: "#5b21b6",
              color: "#ffffff",
              padding: "0.65rem 1.25rem",
              borderRadius: 8,
              fontSize: "0.9rem",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            {MESSAGES[0]!.cta}
          </Link>
        </div>
      </body>
    </html>
  );
}
