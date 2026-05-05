"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useScrollDirection } from "@tge/hooks";
import { PropertyFilterPanel } from "./property-filter-panel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@tge/ui";
import { ScrollArea } from "@tge/ui";
import { Button } from "@tge/ui";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@tge/utils";
import type { County } from "@tge/types";

interface PropertyFilterProps {
  counties?: County[];
}

export function PropertyFilter({ counties = [] }: PropertyFilterProps) {
  const t = useTranslations("PropertiesPage.filter");
  const searchParams = useSearchParams();
  const { scrollDirection, scrollY } = useScrollDirection();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isHeaderHidden = scrollDirection === "down" && scrollY > 150;

  // Count active filters for mobile button badge
  const activeFilterCount = [
    searchParams.get("search"),
    searchParams.get("city") && searchParams.get("city") !== "all"
      ? searchParams.get("city")
      : null,
    searchParams.get("type") && searchParams.get("type") !== "all"
      ? searchParams.get("type")
      : null,
    searchParams.get("maxPrice") && searchParams.get("maxPrice") !== "all"
      ? searchParams.get("maxPrice")
      : null,
  ].filter(Boolean).length;

  return (
    <>
      {/* Desktop Sidebar (lg+) */}
      <aside
        className={cn(
          "hidden lg:block w-[320px] shrink-0 self-start sticky transition-all duration-300",
          isHeaderHidden ? "top-4" : "top-20 xl:top-24"
        )}
      >
        <div className="bg-card border border-border rounded-xl p-7 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <PropertyFilterPanel counties={counties} />
        </div>
      </aside>

      {/* Mobile Filter Button (< lg) */}
      <div className="lg:hidden mb-4">
        <Button
          variant="outline"
          onClick={() => setSheetOpen(true)}
          className="border-border text-foreground hover:bg-primary/10 hover:text-primary gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t("filterBy")}
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Mobile Filter Sheet (< lg) */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="left"
          className="bg-background border-border w-[340px] sm:w-[400px] p-0"
          showCloseButton
        >
          <SheetHeader className="px-7 pt-7 pb-5 border-b border-border">
            <SheetTitle className="font-bold text-foreground text-lg">
              {t("filterBy")}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Filter properties
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 px-7 py-7">
            <PropertyFilterPanel counties={counties} />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
