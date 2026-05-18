"use client";

import { useEffect, useState } from "react";
import { Check, CircleAlert, Loader2, Pencil } from "lucide-react";
import type { AutosaveState } from "./use-autosave";

interface SaveStatusIndicatorProps {
  state: AutosaveState;
}

/**
 * Header indicator showing autosave progress. States:
 *   idle   → nothing rendered (the form is clean and there's nothing to say).
 *   dirty  → "Unsaved changes" — the debounce timer is running.
 *   saving → spinner + "Saving…".
 *   saved  → check + relative timestamp; updates every 15s as time advances.
 *   error  → red icon + message + retry hint via title attr.
 */
export function SaveStatusIndicator({ state }: SaveStatusIndicatorProps) {
  const [, forceTick] = useState(0);

  // Tick the "Saved Xs ago" label on a coarse interval. Re-renders cost
  // ~nothing on this branch (the whole indicator is a few spans).
  useEffect(() => {
    if (state.kind !== "saved") return;
    const interval = setInterval(() => forceTick((t) => t + 1), 15_000);
    return () => clearInterval(interval);
  }, [state.kind]);

  if (state.kind === "idle") return null;

  if (state.kind === "dirty") {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Pencil className="h-3 w-3" />
        Unsaved
      </span>
    );
  }

  if (state.kind === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving…
      </span>
    );
  }

  if (state.kind === "error") {
    return (
      <span
        className="inline-flex items-center gap-1 text-destructive"
        title={state.message}
      >
        <CircleAlert className="h-3 w-3" />
        Save failed
      </span>
    );
  }

  const ago = formatRelative(state.at);
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Check className="h-3 w-3 text-success" />
      Saved {ago}
    </span>
  );
}

function formatRelative(at: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - at) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
