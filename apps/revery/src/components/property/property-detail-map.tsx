"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { renderPropertyPin, renderAddressPopup } from "./leaflet-popup";
import { setupLeafletDefaults } from "./leaflet-setup";

setupLeafletDefaults();

interface PropertyDetailMapProps {
  lat: number;
  lng: number;
  address: string;
}

export default function PropertyDetailMap({
  lat,
  lng,
  address,
}: PropertyDetailMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 15,
      scrollWheelZoom: false,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const pinIcon = L.divIcon({
      className: "",
      html: renderPropertyPin(),
      iconSize: [36, 44],
      iconAnchor: [18, 44],
    });

    // Leaflet makes the marker keyboard-focusable (role="button"); without a
    // name axe flags a serious `aria-command-name` violation. `title`/`alt`
    // are applied to the marker element and give it an accessible name.
    L.marker([lat, lng], { icon: pinIcon, title: address, alt: address })
      .bindPopup(renderAddressPopup(address))
      .addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, address]);

  return (
    <div
      ref={containerRef}
      className="h-[360px] w-full rounded-xl overflow-hidden border border-border isolate"
    />
  );
}
