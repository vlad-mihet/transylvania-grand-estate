"use client";

import { useEffect } from "react";

/**
 * Registers a `beforeunload` listener while `dirty` is true so the browser
 * prompts before the user closes the tab or navigates externally. Does NOT
 * intercept in-app client-side navigation — for that you'd need
 * `next/navigation`-level interception, which in App Router still requires
 * a custom `router.push` wrapper. For now, guarding against the common
 * footgun (tab close / full reload) is a solid 80/20.
 *
 * `message` is ignored by modern browsers (they show a fixed generic prompt)
 * but the parameter is preserved for future cross-browser support.
 */
export function useUnsavedChangesWarning(dirty: boolean, message?: string) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Some browsers still honour this string; modern Chrome/Firefox show a
      // canned message regardless.
      const text = message ?? "You have unsaved changes.";
      e.returnValue = text;
      return text;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, message]);
}
