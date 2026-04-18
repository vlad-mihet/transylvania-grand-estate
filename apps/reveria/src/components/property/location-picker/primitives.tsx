"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { CountyWithCities } from "../location-picker-types";
import { fetchCountyCities } from "../use-location-search";

export function Checkbox({ checked }: { checked: boolean }) {
  return (
    <div
      className={`h-5 w-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
        checked ? "border-primary bg-primary" : "border-border"
      }`}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2 6l3 3 5-5"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}

export function MapSearchIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      className="text-muted-foreground shrink-0"
    >
      <path
        d="M10 2C7.24 2 5 4.24 5 7c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5zm0 7a2 2 0 110-4 2 2 0 010 4z"
        fill="currentColor"
        opacity="0.6"
      />
      <rect x="1" y="15" width="18" height="1.5" rx="0.75" fill="currentColor" opacity="0.3" />
      <rect x="3" y="17.5" width="14" height="1" rx="0.5" fill="currentColor" opacity="0.15" />
    </svg>
  );
}

interface CountyRowProps {
  county: CountyWithCities;
  onSelectCounty: (slug: string) => void;
  onSelectCity: (cityName: string, citySlug: string) => void;
}

/**
 * Collapsible county row used by the list view. Expands lazily to fetch its
 * cities via `fetchCountyCities` if they aren't already hydrated on the
 * incoming `county` prop.
 */
export function CountyRow({
  county,
  onSelectCounty,
  onSelectCity,
}: CountyRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [cities, setCities] = useState<Array<{ name: string; slug: string }>>(
    [],
  );
  const [loading, setLoading] = useState(false);

  const handleExpand = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (county.cities && county.cities.length > 0) {
      setCities(county.cities);
      return;
    }
    setLoading(true);
    const fetched = await fetchCountyCities(county.slug);
    setCities(fetched);
    setLoading(false);
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleExpand}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
      >
        <span className="text-sm font-medium text-foreground">
          {county.name}
        </span>
        <ChevronRight
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
        />
      </button>
      {expanded && (
        <div className="pl-5 ml-3 border-l border-border/60 mb-1">
          <button
            type="button"
            onClick={() => onSelectCounty(county.slug)}
            className="w-full text-left px-3 py-1.5 hover:bg-gray-50 rounded-lg text-xs text-primary font-medium cursor-pointer transition-colors"
          >
            Tot județul {county.name}
          </button>
          {loading && (
            <p className="text-xs text-muted-foreground px-3 py-1.5">...</p>
          )}
          {cities.map((city) => (
            <button
              key={city.slug}
              type="button"
              onClick={() => onSelectCity(city.name, city.slug)}
              className="w-full text-left px-3 py-1.5 hover:bg-gray-50 rounded-lg text-sm text-foreground cursor-pointer transition-colors"
            >
              {city.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
