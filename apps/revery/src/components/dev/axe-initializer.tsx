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
      const ReactDOM = await import("react-dom");
      const axe = (await import("@axe-core/react")).default;
      if (cancelled) return;
      axe(React, ReactDOM, 1000);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}

export default AxeInitializer;
