import { getTranslations } from "next-intl/server";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@tge/ui";
import { Property } from "@tge/types";

interface PropertyBuildingAccordionProps {
  property: Property;
}

export async function PropertyBuildingAccordion({
  property,
}: PropertyBuildingAccordionProps) {
  const t = await getTranslations("PropertyDetail");
  const tCommon = await getTranslations("Common.propertyTypes");

  const rows: { label: string; value: string }[] = [];

  if (property.specs.yearBuilt) {
    rows.push({
      label: t("building.yearBuilt"),
      value: String(property.specs.yearBuilt),
    });
  }
  rows.push({
    label: t("building.elevator"),
    value: property.hasElevator ? t("yes") : t("no"),
  });
  rows.push({
    label: t("building.buildingType"),
    value: tCommon(property.type),
  });
  if (property.specs.material) {
    rows.push({
      label: t("building.material"),
      value: t(`material.${property.specs.material}`),
    });
  }
  if (property.specs.windowType) {
    rows.push({
      label: t("building.windowType"),
      value: t(`windowType.${property.specs.windowType}`),
    });
  }

  if (rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Accordion type="single" collapsible>
        <AccordionItem value="building" className="border-none">
          <AccordionTrigger className="text-lg font-semibold px-5 py-4 hover:no-underline hover:bg-muted/40 cursor-pointer">
            {t("building.title")}
          </AccordionTrigger>
          <AccordionContent>
            <dl className="divide-y divide-border border-t border-border">
              {rows.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-1 sm:gap-4 px-5 py-3 odd:bg-muted/40"
                >
                  <dt className="text-sm text-muted-foreground">{row.label}:</dt>
                  <dd className="text-sm font-medium text-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
