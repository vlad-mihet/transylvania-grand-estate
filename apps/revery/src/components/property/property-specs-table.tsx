import { getTranslations } from "next-intl/server";
import { Locale, Property } from "@tge/types";
import { formatArea } from "@tge/utils";

interface PropertySpecsTableProps {
  property: Property;
  locale: Locale;
}

interface Row {
  label: string;
  value: React.ReactNode;
}

function formatDate(iso: string | undefined, locale: Locale): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(
      locale === "ro" ? "ro-RO" : locale === "fr" ? "fr-FR" : locale === "de" ? "de-DE" : "en-US",
      { year: "numeric", month: "long", day: "numeric" },
    );
  } catch {
    return null;
  }
}

export async function PropertySpecsTable({
  property,
  locale,
}: PropertySpecsTableProps) {
  const t = await getTranslations("PropertyDetail");
  const tCommon = await getTranslations("Common.propertyTypes");

  const specs = property.specs;
  const isTerrain = property.type === "terrain";

  const rows: Row[] = [];

  if (specs.area > 0) {
    rows.push({ label: t("table.usefulArea"), value: formatArea(specs.area, locale) });
  }
  if (isTerrain && specs.landArea) {
    rows.push({ label: t("specs.landArea"), value: formatArea(specs.landArea, locale) });
  }
  if (!isTerrain && specs.bedrooms > 0) {
    rows.push({ label: t("table.rooms"), value: specs.bedrooms });
  }
  rows.push({ label: t("table.type"), value: tCommon(property.type) });
  if (specs.furnishing) {
    rows.push({
      label: t("table.comfort"),
      value: t(`furnishing.${specs.furnishing}`),
    });
  }
  if (!isTerrain && specs.floor !== undefined && specs.floor !== null) {
    rows.push({
      label: t("table.floor"),
      value:
        specs.floors > 0
          ? t("table.floorOf", { floor: specs.floor, total: specs.floors })
          : String(specs.floor),
    });
  }
  if (specs.condition) {
    rows.push({
      label: t("table.condition"),
      value: t(`condition.${specs.condition}`),
    });
  }
  if (specs.ownership) {
    rows.push({
      label: t("table.ownership"),
      value: t(`ownership.${specs.ownership}`),
    });
  }
  if (specs.heating) {
    rows.push({
      label: t("table.heating"),
      value: t(`heating.${specs.heating}`),
    });
  }
  const availabilityFormatted = formatDate(specs.availabilityDate, locale);
  if (availabilityFormatted) {
    rows.push({ label: t("table.availableFrom"), value: availabilityFormatted });
  }
  if (property.sellerType) {
    rows.push({
      label: t("table.sellerType"),
      value: t(`sellerType.${property.sellerType}`),
    });
  }

  const extras: string[] = [];
  if (property.hasBalcony) extras.push(t("facilities.balcony"));
  if (property.hasTerrace) extras.push(t("facilities.terrace"));
  if (property.hasInteriorStaircase)
    extras.push(t("facilities.interiorStaircase"));
  if (property.hasSeparateKitchen)
    extras.push(t("facilities.separateKitchen"));
  if (property.hasStorage) extras.push(t("facilities.storage"));

  if (extras.length) {
    rows.push({
      label: t("table.extraInfo"),
      value: (
        <div className="flex flex-wrap gap-2">
          {extras.map((e) => (
            <span
              key={e}
              className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {e}
            </span>
          ))}
        </div>
      ),
    });
  }

  const tableTitle = t(`table.title.${property.type}`);

  return (
    <section>
      <h2 className="text-2xl font-bold text-foreground mb-4">{tableTitle}</h2>
      <dl className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
        {rows.map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-1 md:grid-cols-[180px_1fr] lg:grid-cols-[220px_1fr] gap-1 md:gap-4 px-4 py-2.5 odd:bg-muted/40"
          >
            <dt className="text-sm text-muted-foreground">{row.label}:</dt>
            <dd className="text-sm font-medium text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
