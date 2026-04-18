import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@tge/ui";
import { Property } from "@tge/types";

interface PropertyFacilitiesAccordionProps {
  property: Property;
}

interface Group {
  title: string;
  items: { key: string; label: string; enabled: boolean }[];
}

export async function PropertyFacilitiesAccordion({
  property,
}: PropertyFacilitiesAccordionProps) {
  const t = await getTranslations("PropertyDetail");

  const facilitiesItems = [
    { key: "balcony", label: t("facilities.balcony"), enabled: !!property.hasBalcony },
    { key: "terrace", label: t("facilities.terrace"), enabled: !!property.hasTerrace },
    { key: "parking", label: t("facilities.parking"), enabled: !!property.hasParking },
    { key: "garage", label: t("facilities.garage"), enabled: !!property.hasGarage },
    { key: "separateKitchen", label: t("facilities.separateKitchen"), enabled: !!property.hasSeparateKitchen },
    { key: "storage", label: t("facilities.storage"), enabled: !!property.hasStorage },
    { key: "washingMachine", label: t("facilities.washingMachine"), enabled: !!property.hasWashingMachine },
    { key: "fridge", label: t("facilities.fridge"), enabled: !!property.hasFridge },
    { key: "stove", label: t("facilities.stove"), enabled: !!property.hasStove },
    { key: "oven", label: t("facilities.oven"), enabled: !!property.hasOven },
    { key: "ac", label: t("facilities.ac"), enabled: !!property.hasAC },
    { key: "interiorStaircase", label: t("facilities.interiorStaircase"), enabled: !!property.hasInteriorStaircase },
  ];

  const securityItems = [
    { key: "blinds", label: t("facilities.blinds"), enabled: !!property.hasBlinds },
    { key: "armoredDoors", label: t("facilities.armoredDoors"), enabled: !!property.hasArmoredDoors },
    { key: "intercom", label: t("facilities.intercom"), enabled: !!property.hasIntercom },
  ];

  const mediaItems = [
    { key: "internet", label: t("facilities.internet"), enabled: !!property.hasInternet },
    { key: "cableTV", label: t("facilities.cableTV"), enabled: !!property.hasCableTV },
  ];

  const groups: Group[] = [
    { title: t("facilities.groupFacilities"), items: facilitiesItems.filter((i) => i.enabled) },
    { title: t("facilities.groupSecurity"), items: securityItems.filter((i) => i.enabled) },
    { title: t("facilities.groupMedia"), items: mediaItems.filter((i) => i.enabled) },
  ].filter((g) => g.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Accordion type="single" collapsible>
        <AccordionItem value="facilities" className="border-none">
          <AccordionTrigger className="text-lg font-semibold px-5 py-4 hover:no-underline hover:bg-muted/40 cursor-pointer">
            {t("facilities.title")}
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6 px-5 pt-5 pb-5 border-t border-border">
              {groups.map((group) => (
                <div key={group.title}>
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    {group.title}
                  </h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                    {group.items.map((item) => (
                      <li
                        key={item.key}
                        className="flex items-center gap-2 text-sm text-foreground"
                      >
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>{item.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
