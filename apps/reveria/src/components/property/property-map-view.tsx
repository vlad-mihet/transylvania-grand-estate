"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { MapPin, Property } from "@tge/types";
import { PropertyMapWrapper } from "@/components/property/property-map-wrapper";
import type { MapBounds } from "@/components/property/property-map";
import { MapPropertyCard } from "@/components/property/map-property-card";
import { MapListToggle } from "@/components/property/map-list-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tge/ui";
import type { SortOption } from "@/hooks/use-property-filter";

interface PropertyMapViewProps {
  properties: Property[];
  mapPins: MapPin[];
  sortValue: SortOption;
  onSortChange: (value: string) => void;
  onSwitchToList: () => void;
}

interface ViewportBounds {
  sw: [number, number];
  ne: [number, number];
}

export function PropertyMapView({
  properties,
  mapPins,
  sortValue,
  onSortChange,
  onSwitchToList,
}: PropertyMapViewProps) {
  const searchParams = useSearchParams();
  const t = useTranslations("PropertiesPage");
  const tFilter = useTranslations("PropertiesPage.filter");
  const tMap = useTranslations("MapView");

  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [clusterSlugs, setClusterSlugs] = useState<string[] | null>(null);
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds | null>(
    null,
  );

  // Debounce the React state update so a continuous pan doesn't thrash the
  // sidebar re-filter. URL replace still happens immediately for shareability.
  const BOUNDS_DEBOUNCE_MS = 150;
  const boundsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (boundsTimerRef.current) clearTimeout(boundsTimerRef.current);
    },
    [],
  );

  const handleMoveEnd = useCallback((bounds: MapBounds) => {
    const params = new URLSearchParams(window.location.search);
    params.set("lat", bounds.center[0].toFixed(4));
    params.set("lng", bounds.center[1].toFixed(4));
    params.set("zoom", bounds.zoom.toString());
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${params.toString()}`,
    );

    if (boundsTimerRef.current) clearTimeout(boundsTimerRef.current);
    boundsTimerRef.current = setTimeout(() => {
      setViewportBounds({ sw: bounds.sw, ne: bounds.ne });
      setClusterSlugs(null);
    }, BOUNDS_DEBOUNCE_MS);
  }, []);

  const urlLat = searchParams.get("lat");
  const urlLng = searchParams.get("lng");
  const urlZoom = searchParams.get("zoom");
  const mapCenter =
    urlLat && urlLng
      ? ([parseFloat(urlLat), parseFloat(urlLng)] as [number, number])
      : undefined;
  const mapZoom = urlZoom ? parseInt(urlZoom, 10) : undefined;

  // O(n) per viewport change is fine while we render ≤ a few hundred pins.
  // TODO: if pins scale past ~500, back this with an rbush spatial index so
  // bounds queries are O(log n) instead of filtering the full list on every
  // pan settle.
  const sidebarProperties = useMemo(() => {
    if (clusterSlugs) {
      const slugSet = new Set(clusterSlugs);
      return properties.filter((p) => slugSet.has(p.slug));
    }
    if (viewportBounds) {
      const { sw, ne } = viewportBounds;
      return properties.filter(
        (p) =>
          p.location.coordinates.lat >= sw[0] &&
          p.location.coordinates.lat <= ne[0] &&
          p.location.coordinates.lng >= sw[1] &&
          p.location.coordinates.lng <= ne[1],
      );
    }
    return properties;
  }, [properties, clusterSlugs, viewportBounds]);

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-160px)] md:h-[calc(100vh-220px)] min-h-[500px] gap-0">
      {/* sr-only live region so pan/filter result-count changes are announced
          to screen readers at every viewport (the visible counters below are
          viewport-specific and so would only announce on one break-point). */}
      <p role="status" aria-live="polite" className="sr-only">
        {t("filter.results", { count: sidebarProperties.length.toString() })}
      </p>
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background">
        <p className="text-xs text-muted-foreground tracking-wide">
          {t("filter.results", { count: sidebarProperties.length.toString() })}
        </p>
        <MapListToggle />
      </div>

      <div className="hidden md:flex md:w-[380px] lg:w-[400px] shrink-0 flex-col border-r border-border bg-background">
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {t("filter.results", {
                  count: sidebarProperties.length.toString(),
                })}
              </p>
              {clusterSlugs && (
                <button
                  type="button"
                  onClick={() => setClusterSlugs(null)}
                  className="text-xs text-primary font-medium hover:underline cursor-pointer"
                >
                  {tMap("showAll")}
                </button>
              )}
            </div>
            <Select value={sortValue} onValueChange={onSortChange}>
              <SelectTrigger className="border-border text-foreground w-[160px] h-8 rounded-lg text-xs">
                <SelectValue placeholder={tFilter("sort")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{tFilter("newest")}</SelectItem>
                <SelectItem value="price_asc">
                  {tFilter("priceLowHigh")}
                </SelectItem>
                <SelectItem value="price_desc">
                  {tFilter("priceHighLow")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {sidebarProperties.length > 0 ? (
            sidebarProperties.map((property) => (
              <MapPropertyCard
                key={property.id}
                property={property}
                isActive={hoveredSlug === property.slug}
                onHover={setHoveredSlug}
              />
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                {t("noResults.description")}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <PropertyMapWrapper
          pins={mapPins}
          center={mapCenter}
          zoom={mapZoom}
          highlightedSlug={hoveredSlug}
          onMarkerHover={setHoveredSlug}
          onClusterClick={setClusterSlugs}
          onMoveEnd={handleMoveEnd}
          onViewList={onSwitchToList}
          className="h-full [&>div]:!min-h-0 [&>div]:h-full [&>div]:!rounded-none [&>div]:!border-0"
        />
      </div>
    </div>
  );
}
