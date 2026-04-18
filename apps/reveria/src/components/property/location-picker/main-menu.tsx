"use client";

import { useTranslations } from "next-intl";
import { ChevronRight, List, Search } from "lucide-react";
import type { LocationSelection } from "../location-picker-types";
import { MapSearchIcon } from "./primitives";

interface MainMenuProps {
  recentItems: LocationSelection[];
  onSelectRecent: (item: LocationSelection) => void;
  onSearchOnMap: () => void;
  onGoToSearch: () => void;
  onGoToList: () => void;
}

/**
 * Top-level menu shown when the picker is open with no active query: recents
 * list (if any) plus the three entry-point actions (search on map / by
 * address / choose from list). All branching state is owned by the
 * orchestrator and flows in as callbacks.
 */
export function LocationPickerMainMenu({
  recentItems,
  onSelectRecent,
  onSearchOnMap,
  onGoToSearch,
  onGoToList,
}: MainMenuProps) {
  const t = useTranslations("MapView");

  return (
    <>
      {recentItems.length > 0 && (
        <div className="px-5 pt-4 pb-2">
          <p className="text-xs font-bold text-foreground uppercase tracking-[0.08em] mb-2">
            {t("recentSelections")}
          </p>
          {recentItems.map((item, i) => (
            <button
              key={`${item.label}-${i}`}
              type="button"
              onClick={() => onSelectRecent(item)}
              className="w-full text-left py-2.5 hover:opacity-70 cursor-pointer transition-opacity"
            >
              <p className="text-[15px] font-semibold text-foreground leading-tight">
                {item.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.sublabel}
              </p>
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-border" />

      <div className="py-1">
        <button
          type="button"
          onClick={onSearchOnMap}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <MapSearchIcon />
            <span className="text-[15px] text-foreground">
              {t("searchOnMap")}
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="border-t border-border mx-5" />
        <button
          type="button"
          onClick={onGoToSearch}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <Search className="h-5 w-5 text-muted-foreground" />
            <span className="text-[15px] text-foreground">
              {t("searchByAddress")}
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="border-t border-border mx-5" />
        <button
          type="button"
          onClick={onGoToList}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <List className="h-5 w-5 text-muted-foreground" />
            <span className="text-[15px] text-foreground">
              {t("chooseFromList")}
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </>
  );
}
