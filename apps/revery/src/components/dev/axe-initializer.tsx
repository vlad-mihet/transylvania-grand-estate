"use client";

import { useEffect } from "react";
import * as React from "react";

// Logs WCAG violations for the currently-mounted tree to the browser console
// via @axe-core/react. Dead-code eliminated in production because the guard
// compiles to `"production" !== "development"` (Next replaces NODE_ENV at
// build time). The dynamic imports keep axe-core out of the client bundle
// outside of dev.
export function AxeInitializer() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    let cancelled = false;
    (async () => {
      try {
        const ReactDOM = await import("react-dom");
        const axe = (await import("@axe-core/react")).default;
        if (cancelled) return;
        // @axe-core/react patches React.createElement, which fails against
        // React 19's frozen ESM namespace ("Cannot set property createElement
        // of [object Module]"). Until the library ships a React-19-compatible
        // release, swallow the failure so the dev a11y checker degrades to a
        // no-op instead of throwing an uncaught exception into the dev overlay
        // (BUG-123). Dead-code eliminated in production by the NODE_ENV guard.
        axe(React, ReactDOM, 1000);
      } catch (err) {
        console.warn(
          "[a11y] @axe-core/react could not initialize (dev-only, likely React 19 module-freeze incompatibility); accessibility auto-checks are disabled.",
          err,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}

export default AxeInitializer;
