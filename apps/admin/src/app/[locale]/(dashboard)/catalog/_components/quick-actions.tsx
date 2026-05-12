"use client";

import { useTranslations } from "next-intl";
import { Button } from "@tge/ui";
import { Plus } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Can } from "@/components/shared/can";

/**
 * Quick-action cluster rendered in the Catalog home PageHeader. Each
 * button is permission-gated independently so EDITORs without create
 * rights see a slimmer set.
 */
export function CatalogQuickActions() {
  const t = useTranslations("Catalog.home.actions");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Can action="property.create">
        <Button asChild size="sm">
          <Link href="/properties/new">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t("newProperty")}
          </Link>
        </Button>
      </Can>
      <Can action="developer.create">
        <Button asChild size="sm" variant="outline">
          <Link href="/developers/new">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t("newDeveloper")}
          </Link>
        </Button>
      </Can>
      <Can action="testimonial.create">
        <Button asChild size="sm" variant="outline">
          <Link href="/testimonials/new">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t("newTestimonial")}
          </Link>
        </Button>
      </Can>
    </div>
  );
}
