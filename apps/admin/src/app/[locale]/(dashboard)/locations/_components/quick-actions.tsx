"use client";

import { useTranslations } from "next-intl";
import { Button } from "@tge/ui";
import { Plus, Sparkles } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Can } from "@/components/shared/can";

/**
 * Quick-action cluster for the Locations home. "New county" intentionally
 * absent — the counties page today only edits the fixed RO set; no
 * `/counties/new` route exists. Add later if a county-create form ships.
 */
export function LocationsQuickActions() {
  const t = useTranslations("Locations.home.actions");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Can action="city.create">
        <Button asChild size="sm">
          <Link href="/cities/new">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t("newCity")}
          </Link>
        </Button>
      </Can>
      <Can action="site-config.update">
        <Button asChild size="sm" variant="outline">
          <Link href="/brand-visibility">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            {t("editBrandVisibility")}
          </Link>
        </Button>
      </Can>
    </div>
  );
}
