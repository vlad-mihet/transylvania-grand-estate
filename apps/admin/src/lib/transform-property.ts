import type { ApiProperty } from "@tge/types";
import { PropertyFormValues } from "./validations/property";

export function toPropertyPayload(data: PropertyFormValues) {
  const { latitude, longitude, ...rest } = data;
  return {
    ...rest,
    coordinates: {
      lat: latitude ?? 0,
      lng: longitude ?? 0,
    },
  };
}

type Localized = { en: string; ro: string; fr?: string; de?: string };

// Normalize a localized value to all four locales so it merges cleanly over the
// form's `{ en, ro, fr, de }` defaults. Passing a partial (e.g. `{ en, ro }`)
// would shallow-overwrite the whole object and leave fr/de `undefined`, which
// makes the localized editor's inputs uncontrolled and reports a false "dirty".
function toLocalized(value: Partial<Localized> | null | undefined): Localized {
  return {
    en: value?.en ?? "",
    ro: value?.ro ?? "",
    fr: value?.fr ?? "",
    de: value?.de ?? "",
  };
}

/**
 * Hydrate the property form from a fetched `ApiProperty`. Mirrors
 * `toPropertyPayload` (the outbound transform) and must map EVERY field the
 * form registers — omitting one (as the old inline whitelist did with `tier`,
 * the amenity flags, and the classification enums) makes the form fall back to
 * its defaults and silently overwrite that data on save.
 */
export function toFormValues(property: ApiProperty): Partial<PropertyFormValues> {
  return {
    title: toLocalized(property.title),
    description: toLocalized(property.description),
    shortDescription: toLocalized(property.shortDescription),
    address: toLocalized(property.address),
    slug: property.slug,
    price: property.price,
    currency: property.currency,
    type: property.type,
    status: property.status,
    // The bug this transform fixes: tier drives which brand/site the listing
    // publishes to. Without it the form showed "Luxury" for every listing and
    // saving would flip an affordable listing to luxury.
    tier: property.tier,
    city: property.city,
    citySlug: property.citySlug,
    neighborhood: property.neighborhood ?? "",
    latitude: property.latitude ?? undefined,
    longitude: property.longitude ?? undefined,
    bedrooms: property.bedrooms ?? 0,
    bathrooms: property.bathrooms ?? 0,
    area: property.area ?? 0,
    floors: property.floors ?? 0,
    yearBuilt: property.yearBuilt ?? 0,
    floor: property.floor ?? undefined,
    // Optional-nullable numbers: the form's inputs use `setValueAs → null`, so
    // baseline `null` (not `undefined`) to avoid a false dirty on load.
    landArea: property.landArea ?? null,
    garage: property.garage ?? null,
    pool: property.pool ?? false,
    // Classification enums — optional; `undefined` renders the "—" (none) option.
    furnishing: property.furnishing ?? undefined,
    material: property.material ?? undefined,
    condition: property.condition ?? undefined,
    sellerType: property.sellerType ?? undefined,
    heating: property.heating ?? undefined,
    ownership: property.ownership ?? undefined,
    windowType: property.windowType ?? undefined,
    // 18 amenity flags — hydrate each so a toggle round-trips instead of being
    // wiped back to `false` on save.
    hasBalcony: property.hasBalcony ?? false,
    hasTerrace: property.hasTerrace ?? false,
    hasParking: property.hasParking ?? false,
    hasGarage: property.hasGarage ?? false,
    hasSeparateKitchen: property.hasSeparateKitchen ?? false,
    hasStorage: property.hasStorage ?? false,
    hasElevator: property.hasElevator ?? false,
    hasInteriorStaircase: property.hasInteriorStaircase ?? false,
    hasWashingMachine: property.hasWashingMachine ?? false,
    hasFridge: property.hasFridge ?? false,
    hasStove: property.hasStove ?? false,
    hasOven: property.hasOven ?? false,
    hasAC: property.hasAC ?? false,
    hasBlinds: property.hasBlinds ?? false,
    hasArmoredDoors: property.hasArmoredDoors ?? false,
    hasIntercom: property.hasIntercom ?? false,
    hasInternet: property.hasInternet ?? false,
    hasCableTV: property.hasCableTV ?? false,
    features: (property.features ?? []).map((f) => toLocalized(f)),
    featured: property.featured ?? false,
    isNew: property.isNew ?? false,
    developerId: property.developerId ?? null,
    agentId: property.agentId ?? null,
  };
}
