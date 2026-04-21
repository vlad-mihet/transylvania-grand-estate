"use client";

import { useEffect } from "react";

/**
 * Root-layout error boundary. Takes over when the crash is upstream of the
 * `app/error.tsx` segment boundary (e.g. the root Providers fail to mount).
 * Renders its own `<html>` + `<body>` per Next's contract.
 *
 * Kept deliberately minimal — no i18n, no design tokens, no theme provider
 * in case any of those are the cause. Goal: always show the user something.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin:global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          background: "#FAFAFA",
          color: "#0A0A0A",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          margin: 0,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              margin: "0 0 0.5rem 0",
            }}
          >
            Admin crashed
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#71717A",
              margin: "0 0 1.25rem 0",
              lineHeight: 1.5,
            }}
          >
            The page could not load. Reload or contact an administrator if the
            problem continues.
          </p>
          {error.digest && (
            <p
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                fontSize: "0.6875rem",
                color: "#A1A1AA",
                margin: "0 0 1.25rem 0",
              }}
            >
              digest: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              appearance: "none",
              background: "#C47F5A",
              color: "#FFFFFF",
              border: 0,
              borderRadius: 6,
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
