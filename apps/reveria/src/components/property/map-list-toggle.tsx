"use client";

import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@tge/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { LayoutGrid, Map } from "lucide-react";

export function MapListToggle() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("MapView");

  const currentView = searchParams.get("view") || "list";

  const setView = useCallback(
    (view: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (view === "list") {
        params.delete("view");
      } else {
        params.set("view", view);
      }
      const query = params.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`);
    },
    [searchParams, router, pathname]
  );

  return (
    <div className="flex items-center bg-secondary rounded-lg p-0.5">
      <button
        type="button"
        onClick={() => setView("list")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
          currentView === "list"
            ? "bg-white text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        {t("listView")}
      </button>
      <button
        type="button"
        onClick={() => setView("map")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
          currentView === "map"
            ? "bg-white text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Map className="h-3.5 w-3.5" />
        {t("mapView")}
      </button>
    </div>
  );
}
