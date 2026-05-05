"use client";

import dynamic from "next/dynamic";
import type { MapPin } from "@tge/types";
import type { MapBounds } from "./property-map";

const PropertyMap = dynamic(() => import("./property-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] rounded-xl border border-border bg-secondary/50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading map...</span>
      </div>
    </div>
  ),
});

interface PropertyMapWrapperProps {
  pins: MapPin[];
  center?: [number, number];
  zoom?: number;
  highlightedSlug?: string | null;
  onMarkerHover?: (slug: string | null) => void;
  onClusterClick?: (slugs: string[]) => void;
  onMoveEnd?: (bounds: MapBounds) => void;
  onViewList?: () => void;
  className?: string;
}

export function PropertyMapWrapper({
  pins,
  center,
  zoom,
  highlightedSlug,
  onMarkerHover,
  onClusterClick,
  onMoveEnd,
  onViewList,
  className,
}: PropertyMapWrapperProps) {
  return (
    <PropertyMap
      pins={pins}
      center={center}
      zoom={zoom}
      highlightedSlug={highlightedSlug}
      onMarkerHover={onMarkerHover}
      onClusterClick={onClusterClick}
      onMoveEnd={onMoveEnd}
      onViewList={onViewList}
      className={className}
    />
  );
}
