// Filter-related constants shared between the horizontal filter bar, the
// sidebar panel, and the `usePropertyFilter` hook. Previously each file kept
// its own copy of these arrays; the drift between them was starting to show
// up as inconsistent dropdowns. Single source of truth now.

import type { ReadonlyURLSearchParams } from "next/navigation";
import type { LocationSelection } from "./location-picker-types";

export const PROPERTY_TYPES = [
  "apartment",
  "house",
  "villa",
  "terrain",
  "penthouse",
  "estate",
  "chalet",
  "mansion",
  "palace",
] as const;

export type PropertyTypeKey = (typeof PROPERTY_TYPES)[number];

// Cities available in Reveria. Must be kept in sync with the city slugs
// seeded on the API side (apps/api/prisma/seed.ts).
export const CITY_SLUGS = [
  "cluj-napoca",
  "oradea",
  "timisoara",
  "brasov",
  "sibiu",
] as const;

// Display labels for city slugs. Uses proper Romanian diacritics — this is
// the Reveria brand requirement.
export const CITY_LABELS: Record<string, string> = {
  "cluj-napoca": "Cluj-Napoca",
  oradea: "Oradea",
  timisoara: "Timișoara",
  brasov: "Brașov",
  sibiu: "Sibiu",
};

/**
 * Rebuild an initial `LocationSelection[]` from URL search params, so both
 * the horizontal filter bar and the sidebar panel hydrate the picker the
 * same way on first render.
 */
export function locationSelectionsFromSearchParams(
  searchParams: URLSearchParams | ReadonlyURLSearchParams,
): LocationSelection[] {
  const city = searchParams.get("city");
  if (city) {
    return [
      {
        label: CITY_LABELS[city] || city,
        sublabel: "oraș",
        type: "city",
        slug: city,
        param: "city",
      },
    ];
  }
  const county = searchParams.get("county");
  if (county) {
    return [
      {
        label: county,
        sublabel: "județ",
        type: "county",
        slug: county,
        param: "county",
      },
    ];
  }
  return [];
}
