import Link from "next/link";
import { defaultLocale } from "@tge/i18n/constants";

/**
 * Root-level 404 — fires on locale-less URLs like `/` or `/foo`. The admin
 * root layout already provides <html>/<body>, so this page only needs to
 * render content. No next-intl context here (there is no locale yet).
 */
export default function RootNotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background: "#FAFAFA",
        color: "#0A0A0A",
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
    </div>
  );
}
