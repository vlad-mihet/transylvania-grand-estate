"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Thin top progress bar rendered inside `AppHeader`. Signals in-flight
 * navigation on otherwise-silent transitions (mark-lesson-complete → next
 * lesson, clicking prev/next, etc.). Uses `pathname` + `useLinkStatus`-
 * alternative: a small local state that flips while the pathname is
 * changing (via a React useTransition in the caller), plus a fallback
 * timer that auto-clears if the state never resolves.
 *
 * This is not a full nprogress replacement — it's a lightweight hint.
 */
export function NavProgress({ pending }: { pending: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only the pending=true branch schedules work; when pending is false the
    // render gate below hides the bar, so no synchronous setState is needed in
    // the effect body (react-hooks). Cleanup resets `visible` on pending change.
    if (!pending) return;
    // Debounce so instant transitions don't flash the bar.
    const show = setTimeout(() => setVisible(true), 100);
    // Safety net: clear after 8s even if pending is stuck on.
    const hide = setTimeout(() => setVisible(false), 8_000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
      setVisible(false);
    };
  }, [pending]);

  // Gate on `pending` too, so a false→true→false flip within the debounce
  // window can never leave a stale bar showing.
  const showBar = pending && visible;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden"
    >
      <div
        className={`h-full bg-[color:var(--color-primary)] transition-all duration-300 ${
          showBar ? "w-2/3 opacity-100" : "w-0 opacity-0"
        }`}
      />
    </div>
  );
}

/**
 * Auto-hide helper: tracks pathname changes and keeps the bar visible
 * briefly on route change, useful when the caller doesn't have a
 * `useTransition` state to wire.
 */
export function NavProgressOnRouteChange() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  // Flip `pending` true on a route change during render (React's "storing prior
  // props" pattern), then let the effect below schedule the auto-clear timer —
  // keeps a synchronous setState out of the effect body (react-hooks).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setPending(true);
  }

  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setPending(false), 400);
    return () => clearTimeout(t);
  }, [pending]);

  return <NavProgress pending={pending} />;
}
