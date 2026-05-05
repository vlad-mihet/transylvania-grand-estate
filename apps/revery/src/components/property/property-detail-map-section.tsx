"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";

const PropertyDetailMap = dynamic(() => import("./property-detail-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[360px] w-full bg-muted animate-pulse" />
  ),
});

interface PropertyDetailMapSectionProps {
  lat: number;
  lng: number;
  address: string;
}

export function PropertyDetailMapSection({
  lat,
  lng,
  address,
}: PropertyDetailMapSectionProps) {
  const t = useTranslations("PropertyDetail");

  return (
    <section>
      <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        {t("map.title")}
      </h2>
      <div className="rounded-xl border border-border overflow-hidden">
        <PropertyDetailMap lat={lat} lng={lng} address={address} />
      </div>
    </section>
  );
}
