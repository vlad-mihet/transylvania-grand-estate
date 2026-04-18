"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { MapPin, Property } from "@tge/types";
import { usePropertyFilter } from "@/hooks/use-property-filter";
import { PropertyListView } from "./property-list-view";

// Map view is hefty (Leaflet + cluster plugin). Only loaded when the user
// toggles into map mode so the default list route keeps its bundle lean.
const PropertyMapView = dynamic(
  () => import("./property-map-view").then((m) => m.PropertyMapView),
  { ssr: false },
);

interface PropertyListingContentProps {
  properties: Property[];
  mapPins: MapPin[];
  cta?: {
    title: string;
    subtitle: string;
    buttonText: string;
    buttonHref?: string;
  };
}

export function PropertyListingContent({
  properties,
  mapPins,
  cta,
}: PropertyListingContentProps) {
  const searchParams = useSearchParams();
  const {
    filtered,
    sortValue,
    activeFilters,
    updateParam,
    removeFilter,
    switchToList,
  } = usePropertyFilter(properties);

  const isMapView = searchParams.get("view") === "map";
  const onSortChange = (value: string) => updateParam("sort", value);

  if (isMapView) {
    return (
      <PropertyMapView
        properties={filtered}
        mapPins={mapPins}
        sortValue={sortValue}
        onSortChange={onSortChange}
        onSwitchToList={switchToList}
      />
    );
  }

  return (
    <PropertyListView
      properties={filtered}
      sortValue={sortValue}
      onSortChange={onSortChange}
      activeFilters={activeFilters}
      onRemoveFilter={removeFilter}
      cta={cta}
    />
  );
}
