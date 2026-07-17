"use client";

import { useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Input } from "@tge/ui";
import { apiClient } from "@/lib/api-client";
import type { PropertyFormValues } from "@/lib/validations/property";

/**
 * Address autocomplete that fills the property's latitude/longitude. The public
 * `/locations/search` endpoint geocodes via Photon and returns `addresses[]`
 * with coordinates; picking one writes lat/lng into the form so a non-technical
 * agent never has to hand-type coordinates. The raw lat/lng inputs remain below
 * as a manual fallback + a readout of the chosen point.
 *
 * Coordinates only — city/brand selection stays with the existing city picker
 * (a Photon city string may not map to a known City row, and brand visibility
 * depends on that link).
 */
interface AddressResult {
  name: string;
  sublabel: string;
  type: string;
  latitude: number;
  longitude: number;
  city?: string;
  county?: string;
}

interface LocationSearchResponse {
  addresses: AddressResult[];
}

export function AddressGeocodeField() {
  const t = useTranslations("PropertyForm");
  const form = useFormContext<PropertyFormValues>();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AddressResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced search. Photon needs >=3 chars to be useful.
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiClient<LocationSearchResponse>(
          `/locations/search?q=${encodeURIComponent(query)}`,
        );
        setResults(res.addresses ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  // Close the dropdown on an outside click.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const pick = (r: AddressResult) => {
    form.setValue("latitude", r.latitude, { shouldDirty: true });
    form.setValue("longitude", r.longitude, { shouldDirty: true });
    setQuery(r.sublabel ? `${r.name}, ${r.sublabel}` : r.name);
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      <Input
        placeholder={t("geocodeSearchPlaceholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        autoComplete="off"
      />
      {open && (loading || results.length > 0) && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover shadow-md">
          {loading && (
            <p className="px-3 py-2 text-xs text-muted-foreground">{t("geocodeSearching")}</p>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.latitude}-${r.longitude}-${i}`}
              type="button"
              onClick={() => pick(r)}
              className="block w-full px-3 py-2 text-left text-xs hover:bg-accent"
            >
              <span className="font-medium">{r.name}</span>
              {r.sublabel ? (
                <span className="text-muted-foreground"> — {r.sublabel}</span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
