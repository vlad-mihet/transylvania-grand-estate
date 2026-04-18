"use client";

import { useCallback, useState } from "react";
import type { LocationSelection } from "../location-picker-types";

const RECENT_KEY = "reveria_recent_locations";
const MAX_RECENT = 5;

function read(): LocationSelection[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function write(items: LocationSelection[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
}

/**
 * Tracks the last `MAX_RECENT` unique location selections in localStorage so
 * the picker's "Recent" list survives navigation. Returns the current list
 * plus an `add(item)` function that dedupes by (slug, type, label).
 *
 * `read()` guards against SSR by returning [] when `window` is undefined, so
 * the lazy initializer is safe on the server.
 */
export function useLocationRecent() {
  const [items, setItems] = useState<LocationSelection[]>(() => read());

  const add = useCallback((item: LocationSelection) => {
    const deduped = read().filter(
      (r) =>
        !(r.slug === item.slug && r.type === item.type && r.label === item.label),
    );
    const next = [item, ...deduped].slice(0, MAX_RECENT);
    write(next);
    setItems(next);
  }, []);

  return { items, add };
}
