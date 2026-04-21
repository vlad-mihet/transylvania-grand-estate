"use client";

import { Button } from "@tge/ui";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

/**
 * Segment-level error boundary. Catches render + effect errors inside the
 * `(dashboard)` tree without unmounting the root layout (so the sidebar +
 * header stay visible and the user can retry or navigate away).
 *
 * Next's error boundaries are Client Components and receive `reset` — calling
 * it re-renders the segment, which is enough to recover from transient
 * issues (React state corruption, stale cache). For hard failures we ship
 * the `digest` so ops can grep server logs.
 */
export default function SegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to browser console in dev; Sentry/Datadog hooks live here in prod.
    console.error("[admin:error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-5 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-card">
          <AlertTriangle className="h-5 w-5 text-[var(--color-danger)]" />
        </div>
        <div className="space-y-1.5">
          <p className="mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Unexpected error
          </p>
          <h1 className="text-xl font-semibold text-foreground">
            Something broke on this page
          </h1>
          <p className="text-sm text-muted-foreground">
            The error has been logged. Try again, and contact an administrator
            if it keeps happening.
          </p>
          {error.digest && (
            <p className="mono mt-2 text-[10px] text-muted-foreground/70">
              digest: {error.digest}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reset}>
            Try again
          </Button>
          <Button variant="outline" size="sm" onClick={() => (window.location.href = "/")}>
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}
