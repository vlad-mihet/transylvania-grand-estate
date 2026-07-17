"use client";

import { useEffect, useRef } from "react";

/**
 * Warns before losing unsaved changes. Covers three exit paths while `dirty`:
 *
 *   1. Tab close / full reload → native `beforeunload` prompt.
 *   2. In-app `<Link>`/`<a>` navigation → capture-phase click interceptor
 *      that `confirm()`s before letting the App Router navigate (App Router
 *      has no `router.events`/blocking API, so we intercept the click itself).
 *   3. Browser back/forward → `popstate` guard that restores the URL if the
 *      user cancels.
 *
 * `message` is the confirm text for the in-app cases; the native
 * `beforeunload` prompt ignores it (browsers show a fixed string).
 */
export function useUnsavedChangesWarning(dirty: boolean, message?: string) {
  // Keep the latest dirty/message in refs so the listeners (registered once)
  // always read current values without re-subscribing on every keystroke.
  const dirtyRef = useRef(dirty);
  const messageRef = useRef(message);
  useEffect(() => {
    dirtyRef.current = dirty;
    messageRef.current = message;
  });

  useEffect(() => {
    const prompt = () =>
      messageRef.current ??
      "You have unsaved changes. Leave this page and discard them?";

    // 1. Tab close / full reload.
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = prompt();
      return e.returnValue;
    };

    // 2. In-app link clicks. Capture phase so we can cancel before Next's
    //    <Link> handler runs. Only guards left-click, same-tab, same-origin
    //    navigations to a different path — modified clicks, new tabs, external
    //    links, downloads, and pure hash changes fall through untouched.
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (
        !href ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Same path (only a hash/query tweak to the current page) → not a leave.
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }
      if (!window.confirm(prompt())) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // 3. Back/forward. The navigation has already happened when popstate
    //    fires, so on cancel we push the previous URL back to undo it.
    let lastUrl = window.location.href;
    const onPopState = () => {
      if (!dirtyRef.current) {
        lastUrl = window.location.href;
        return;
      }
      if (!window.confirm(prompt())) {
        history.pushState(null, "", lastUrl);
      } else {
        lastUrl = window.location.href;
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);
}
