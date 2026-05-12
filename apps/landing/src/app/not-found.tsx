import Link from "next/link";
import { defaultLocale } from "@tge/i18n/constants";

// Multi-locale 404 — fires only for paths that survive middleware AND fall
// outside `[locale]/`. Per-locale rendering lives in `[locale]/not-found.tsx`;
// this stack is for the unprefixed-route edge case so we don't surprise
// non-RO visitors with an English-only fallback.
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
    cta: "Mergi la Transylvania Grand Estate",
  },
  {
    locale: "en",
    title: "Page not found",
    description: "This page does not exist or was moved.",
    cta: "Go to Transylvania Grand Estate",
  },
  {
    locale: "fr",
    title: "Page introuvable",
    description: "Cette page n'existe pas ou a été déplacée.",
    cta: "Aller à Transylvania Grand Estate",
  },
  {
    locale: "de",
    title: "Seite nicht gefunden",
    description: "Diese Seite existiert nicht oder wurde verschoben.",
    cta: "Zu Transylvania Grand Estate",
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
          background: "#141418",
          color: "#F0EDE8",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <p
            aria-hidden="true"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "6rem",
              lineHeight: 1,
              color: "#C47F5A",
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
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "1.15rem",
                  fontWeight: 400,
                  margin: "0 0 0.25rem 0",
                }}
              >
                {m.title}
              </h1>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "rgba(240, 237, 232, 0.6)",
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
              background: "#C47F5A",
              color: "#141418",
              padding: "0.65rem 1.25rem",
              borderRadius: 6,
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
