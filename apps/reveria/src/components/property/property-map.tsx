"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import L from "leaflet";
import "leaflet.markercluster";
import type { MapPin, Locale } from "@tge/types";
import { formatPrice } from "@tge/utils";
import { renderPropertyPopup } from "./leaflet-popup";
import { setupLeafletDefaults } from "./leaflet-setup";

/** Compact price for map markers: 850000 → "850k €", 1200000 → "1.2M €" */
function compactPrice(price: number): string {
  if (price >= 1_000_000) {
    const m = price / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M €`;
  }
  if (price >= 1_000) {
    const k = price / 1_000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(0)}k €`;
  }
  return `${price} €`;
}

setupLeafletDefaults();

const DEFAULT_CENTER: [number, number] = [45.94, 24.97];
const DEFAULT_ZOOM = 7;

export interface MapBounds {
  center: [number, number];
  zoom: number;
  sw: [number, number];
  ne: [number, number];
}

interface PropertyMapProps {
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

/**
 * Narrow the marker-cluster `clusterclick` event. The augmented
 * `L.MarkerCluster` type comes from `@types/leaflet.markercluster`; the
 * event's `layer` is that cluster, but the stock `LeafletEvent` type
 * doesn't expose it — hence the targeted cast here instead of `any`.
 */
interface ClusterClickEvent extends L.LeafletEvent {
  layer: L.MarkerCluster;
}

export default function PropertyMap({
  pins,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  highlightedSlug,
  onMarkerHover,
  onClusterClick,
  onMoveEnd,
  onViewList,
  className,
}: PropertyMapProps) {
  // ─── Imperative state: Leaflet owns the map, so we hold instances in refs.
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const markerToSlugRef = useRef<WeakMap<L.Marker, string>>(new WeakMap());

  // ─── Interaction guards: keep user pans from fighting programmatic flyTo.
  const moveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userInteractedRef = useRef(false);
  const initialCenterRef = useRef(center);

  // ─── Latest-ref pattern for callbacks + props the init effect needs at its
  // FIRST run but not on every change. This lets the map-init effect stay
  // stable (no re-init on prop change) without stale closures — no
  // `react-hooks/exhaustive-deps` suppressions required.
  const onMoveEndRef = useRef(onMoveEnd);
  const onMarkerHoverRef = useRef(onMarkerHover);
  const onClusterClickRef = useRef(onClusterClick);
  const centerRef = useRef(center);
  const initialZoomRef = useRef(zoom);
  useEffect(() => {
    onMoveEndRef.current = onMoveEnd;
    onMarkerHoverRef.current = onMarkerHover;
    onClusterClickRef.current = onClusterClick;
    centerRef.current = center;
  });

  const locale = useLocale() as Locale;
  const tTypes = useTranslations("Common.propertyTypes");
  const tMap = useTranslations("MapView");

  // ─── Init map once on mount. Uses refs / initial values only so deps are []
  // without needing to suppress exhaustive-deps.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter = initialCenterRef.current;
    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: initialZoomRef.current,
      zoomControl: false,
      scrollWheelZoom: true,
    });

    L.control.zoom({ position: "topright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    map.on("dragstart", () => {
      userInteractedRef.current = true;
    });
    map.on("zoomstart", () => {
      userInteractedRef.current = true;
    });

    map.on("moveend", () => {
      if (moveDebounceRef.current) clearTimeout(moveDebounceRef.current);
      moveDebounceRef.current = setTimeout(() => {
        const c = map.getCenter();
        const b = map.getBounds();
        onMoveEndRef.current?.({
          center: [c.lat, c.lng],
          zoom: map.getZoom(),
          sw: [b.getSouth(), b.getWest()],
          ne: [b.getNorth(), b.getEast()],
        });
      }, 400);
    });

    return () => {
      if (moveDebounceRef.current) clearTimeout(moveDebounceRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ─── Fly to new center only on genuine programmatic navigation (e.g. an
  // address selection), not on URL feedback from our own moveend handler.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;
    const prev = initialCenterRef.current;
    if (userInteractedRef.current) return;
    if (center[0] === DEFAULT_CENTER[0] && center[1] === DEFAULT_CENTER[1]) return;
    if (
      prev &&
      Math.abs(prev[0] - center[0]) < 0.001 &&
      Math.abs(prev[1] - center[1]) < 0.001
    ) {
      return;
    }
    initialCenterRef.current = center;
    map.flyTo(center, zoom ?? 14, { duration: 1.2 });
  }, [center, zoom]);

  // ─── Rebuild markers when pins or i18n changes. Callback props come via
  // refs so they don't trigger a full rebuild; `center` likewise — the
  // auto-fit only cares about its first value and the default sentinel.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
    }
    markersRef.current.clear();
    markerToSlugRef.current = new WeakMap();

    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 60,
      zoomToBoundsOnClick: false,
      spiderfyOnMaxZoom: false,
      iconCreateFunction: (clusterObj) => {
        const count = clusterObj.getChildCount();
        let dim = 36;
        if (count >= 100) dim = 48;
        else if (count >= 10) dim = 40;

        return L.divIcon({
          html: `<div style="
            width:${dim}px;height:${dim}px;
            display:flex;align-items:center;justify-content:center;
            background:var(--background, #fff);color:var(--foreground, #111827);
            border-radius:50%;font-size:13px;font-weight:600;
            box-shadow:0 2px 8px rgba(0,0,0,0.18);
            border:1px solid var(--border, #e5e7eb);
          ">${count}</div>`,
          className: "",
          iconSize: L.point(dim, dim),
        });
      },
    });

    const markers = pins.map((pin) => {
      const marker = L.marker([pin.latitude, pin.longitude], {
        icon: L.divIcon({
          html: `<div class="map-price-pill">${compactPrice(pin.price)}</div>`,
          className: "map-price-icon",
          iconSize: undefined,
          iconAnchor: [0, 14],
        }),
      });

      marker.on("mouseover", () => onMarkerHoverRef.current?.(pin.slug));
      marker.on("mouseout", () => onMarkerHoverRef.current?.(null));

      const typeName = (() => {
        try {
          return tTypes(pin.type);
        } catch {
          return pin.type;
        }
      })();

      marker.bindPopup(
        renderPropertyPopup({
          slug: pin.slug,
          priceLabel: formatPrice(pin.price, locale),
          typeLabel: typeName,
          heroImageSrc: pin.heroImageSrc,
          detailHref: `/${locale}/properties/${pin.slug}`,
          detailLabel: tMap("viewDetails"),
        }),
        { maxWidth: 240, className: "property-popup" },
      );

      markersRef.current.set(pin.slug, marker);
      markerToSlugRef.current.set(marker, pin.slug);
      return marker;
    });

    cluster.addLayers(markers);
    map.addLayer(cluster);
    clusterRef.current = cluster;

    cluster.on("clusterclick", (e: L.LeafletEvent) => {
      const clusterLayer = (e as ClusterClickEvent).layer;
      const childMarkers = clusterLayer.getAllChildMarkers();
      const slugs = childMarkers
        .map((m) => markerToSlugRef.current.get(m))
        .filter((s): s is string => !!s);
      onClusterClickRef.current?.(slugs);
    });

    // Only auto-fit when no explicit center is provided (e.g. address
    // selection). Read via ref so a later center change doesn't re-fit.
    const currentCenter = centerRef.current;
    const atDefault =
      !currentCenter ||
      (currentCenter[0] === DEFAULT_CENTER[0] &&
        currentCenter[1] === DEFAULT_CENTER[1]);
    if (pins.length > 0 && atDefault) {
      const bounds = L.latLngBounds(
        pins.map((p) => [p.latitude, p.longitude] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [pins, locale, tTypes, tMap]);

  // ─── Highlight marker on card hover
  useEffect(() => {
    if (!highlightedSlug) return;
    const marker = markersRef.current.get(highlightedSlug);
    if (!marker) return;
    const el = marker.getElement();
    if (!el) return;
    el.classList.add("map-marker-active");
    return () => el.classList.remove("map-marker-active");
  }, [highlightedSlug]);

  return (
    <div className={`relative ${className ?? ""}`}>
      <div
        ref={containerRef}
        className="w-full h-full min-h-[500px] rounded-xl overflow-hidden border border-border"
        style={{ zIndex: 0 }}
      />

      {onViewList && (
        <button
          type="button"
          onClick={onViewList}
          className="absolute top-3 left-3 z-[1000] flex items-center gap-2 bg-white border border-border rounded-lg px-3.5 py-2 text-sm font-medium text-foreground shadow-md hover:shadow-lg transition-shadow cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <rect x="1" y="2" width="14" height="2" rx="0.5" fill="currentColor" />
            <rect x="1" y="7" width="14" height="2" rx="0.5" fill="currentColor" />
            <rect x="1" y="12" width="14" height="2" rx="0.5" fill="currentColor" />
          </svg>
          {tMap("listView")}
        </button>
      )}
    </div>
  );
}
