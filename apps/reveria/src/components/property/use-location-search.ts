"use client";

import { useEffect, useRef, useState } from "react";
import { fetchApiSafe } from "@tge/api-client";
import type { NeighborhoodResult, LocationSearchResult } from "./location-picker-types";

// Minimum characters before we hit the API; shorter queries would return the
// entire universe.
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

export function useLocationSearch(query: string) {
  const [results, setResults] = useState<LocationSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (query.length < MIN_QUERY_LENGTH) {
        setResults(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const res = await fetchApiSafe<LocationSearchResult>(
        `/locations/search?q=${encodeURIComponent(query)}`,
      );
      setResults(res.ok ? res.data : null);
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return { results, setResults, loading };
}

export async function fetchCityNeighborhoods(
  citySlug: string,
): Promise<NeighborhoodResult[]> {
  const res = await fetchApiSafe<NeighborhoodResult[]>(
    `/cities/${citySlug}/neighborhoods`,
  );
  return res.ok ? res.data : [];
}

export async function fetchCountyCities(
  countySlug: string,
): Promise<Array<{ name: string; slug: string }>> {
  const res = await fetchApiSafe<Array<{ name: string; slug: string }>>(
    `/cities?county=${countySlug}`,
  );
  return res.ok ? res.data : [];
}
