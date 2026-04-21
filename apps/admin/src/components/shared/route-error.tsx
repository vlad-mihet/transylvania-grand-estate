"use client";

import { useEffect } from "react";
import { Button } from "@tge/ui";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  /**
   * Short heading — typically the resource name, e.g. "Agents".
   * Defaults to the generic Common.errorTitle copy.
   */
  resource?: string;
}

/**
 * Segment-scoped error boundary body. Used by each resource's `error.tsx`
 * so a single bad row or mutation doesn't blank out the whole admin shell —
 * the sidebar + header keep rendering; only the content area falls back to
 * this card.
 */
export function RouteError({ error, reset, resource }: RouteErrorProps) {
  const tc = useTranslations("Common");

  useEffect(() => {
    console.error("[admin:route-error]", resource ?? "(unknown)", error);
  }, [error, resource]);

  return (
    <div className="flex flex-1 items-center justify-center py-14">
      <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-md border border-dashed border-[color-mix(in_srgb,var(--color-danger)_25%,var(--border))] bg-[var(--color-danger-bg)]/40 px-6 py-10 text-center">
        <AlertTriangle className="h-6 w-6 text-[var(--color-danger)]" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {resource ? `${resource} — ${tc("errorTitle")}` : tc("errorTitle")}
          </p>
          <p className="text-sm text-muted-foreground">
            {tc("errorDescription")}
          </p>
        </div>
        {error.digest && (
          <p className="mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground/80">
            digest: {error.digest}
          </p>
        )}
        <Button variant="outline" size="sm" onClick={reset}>
          {tc("retry")}
        </Button>
      </div>
    </div>
  );
}
