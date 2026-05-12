"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Tracks whether CapsLock is active while a given input is focused. Returns
 * false when the input is blurred so a stuck-on indicator from a prior session
 * doesn't persist.
 *
 * We listen on both keydown and keyup because CapsLock can toggle mid-keystroke
 * — checking only one event gives a one-frame stale reading on the actual
 * toggle press.
 */
export function useCapsLock(ref: RefObject<HTMLInputElement | null>): boolean {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const read = (e: KeyboardEvent) => {
      // Defensive guard: in some React 19 + radix-ui interactions the
      // listener fires with a synthetic event that lacks `getModifierState`.
      // Skipping that case keeps the console clean; the next real keydown
      // updates the indicator correctly.
      if (typeof e.getModifierState !== "function") return;
      // getModifierState is supported in all evergreen browsers and is more
      // reliable than sniffing e.key === "CapsLock" (which only fires on the
      // actual CapsLock press, not while typing under it).
      setOn(e.getModifierState("CapsLock"));
    };

    const handleBlur = () => setOn(false);

    el.addEventListener("keydown", read);
    el.addEventListener("keyup", read);
    el.addEventListener("blur", handleBlur);
    return () => {
      el.removeEventListener("keydown", read);
      el.removeEventListener("keyup", read);
      el.removeEventListener("blur", handleBlur);
    };
  }, [ref]);

  return on;
}
