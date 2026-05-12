import type {
  Property,
  Developer,
  City,
  County,
  MapPin,
  Testimonial,
  Article,
  LocalizedString,
  ApiProperty,
  ApiDeveloper,
  ApiCity,
  ApiCounty,
  ApiMapPin,
  ApiTestimonial,
  ApiArticle,
  ApiPropertyCollapsed,
  ApiDeveloperCollapsed,
  ApiCityCollapsed,
  ApiArticleCollapsed,
  ApiTestimonialCollapsed,
} from "@tge/types";

/**
 * Coerce a wire value that may be either expanded (`LocalizedString`) or
 * collapsed (plain `string` after `@LocaleScope('public')` opts in) back to
 * `LocalizedString` so downstream frontend code (which uses `localize()`
 * from `@tge/utils`) doesn't need to know which wire shape arrived.
 *
 * For collapsed values we duplicate the served string across all locale
 * slots — `localize()` will pick the current locale and render correctly.
 * The "every slot identical" trick is intentional: collapsed responses
 * have already been resolved against the requested locale server-side,
 * so the frontend's `localize()` picks the right text regardless of which
 * key it reaches for. PR 4b ships the resource collapses; this helper is
 * the seam that hides the migration from page code.
 */
function asLocalized(
  value: LocalizedString | string | null | undefined,
): LocalizedString {
  if (value === null || value === undefined) {
    return { ro: "", en: "" };
  }
  if (typeof value === "string") {
    return { ro: value, en: value, fr: value, de: value };
  }
  return value;
}

function asLocalizedNullable(
  value: LocalizedString | string | null | undefined,
): LocalizedString | null {
  if (value === null || value === undefined) return null;
  return asLocalized(value);
}

function asLocalizedArray(
  value: LocalizedString[] | string[] | null | undefined,
): LocalizedString[] {
  if (!value) return [];
  return value.map((item) =>
    typeof item === "string" ? asLocalized(item) : item,
  );
}

export function mapApiProperty(raw: ApiProperty | ApiPropertyCollapsed): Property {
  const denom = raw.type === "terrain" ? raw.landArea : raw.area;
  const pricePerSqm =
    denom && denom > 0 ? Math.round(raw.price / denom) : undefined;

  return {
    id: raw.id,
    slug: raw.slug,
    title: asLocalized(raw.title),
    description: asLocalized(raw.description),
    shortDescription: asLocalized(raw.shortDescription),
    price: raw.price,
    currency: (raw.currency ?? "EUR") as "EUR",
    type: raw.type,
    status: raw.status,
    tier: raw.tier,
    location: {
      city: raw.city,
      citySlug: raw.citySlug,
      neighborhood: raw.neighborhood,
      address: asLocalized(raw.address),
      coordinates: { lat: raw.latitude, lng: raw.longitude },
    },
    specs: {
      bedrooms: raw.bedrooms,
      bathrooms: raw.bathrooms,
      area: raw.area,
      landArea: raw.landArea ?? undefined,
      floors: raw.floors,
      floor: raw.floor ?? undefined,
      yearBuilt: raw.yearBuilt,
      garage: raw.garage ?? undefined,
      pool: raw.pool ?? undefined,
      furnishing: raw.furnishing ?? undefined,
      material: raw.material ?? undefined,
      condition: raw.condition ?? undefined,
      heating: raw.heating ?? undefined,
      ownership: raw.ownership ?? undefined,
      windowType: raw.windowType ?? undefined,
      availabilityDate: raw.availabilityDate ?? undefined,
    },
    features: asLocalizedArray(raw.features),
    images: (raw.images ?? []).map((img) => ({
      src: img.src,
      alt: asLocalized(img.alt),
      isHero: img.isHero,
    })),
    featured: raw.featured ?? false,
    new: raw.isNew,
    sellerType: raw.sellerType ?? undefined,
    hasBalcony: raw.hasBalcony,
    hasTerrace: raw.hasTerrace,
    hasParking: raw.hasParking,
    hasGarage: raw.hasGarage,
    hasSeparateKitchen: raw.hasSeparateKitchen,
    hasStorage: raw.hasStorage,
    hasElevator: raw.hasElevator,
    hasInteriorStaircase: raw.hasInteriorStaircase,
    hasWashingMachine: raw.hasWashingMachine,
    hasFridge: raw.hasFridge,
    hasStove: raw.hasStove,
    hasOven: raw.hasOven,
    hasAC: raw.hasAC,
    hasBlinds: raw.hasBlinds,
    hasArmoredDoors: raw.hasArmoredDoors,
    hasIntercom: raw.hasIntercom,
    hasInternet: raw.hasInternet,
    hasCableTV: raw.hasCableTV,
    pricePerSqm,
    developerId: raw.developerId ?? undefined,
    developerName: raw.developer?.name,
    agentId: raw.agentId ?? undefined,
    agentName: raw.agent ? `${raw.agent.firstName} ${raw.agent.lastName}` : undefined,
    createdAt: raw.createdAt,
  };
}

export function mapApiProperties(
  raw: (ApiProperty | ApiPropertyCollapsed)[],
): Property[] {
  return raw.map(mapApiProperty);
}

export function mapApiDeveloper(
  raw: ApiDeveloper | ApiDeveloperCollapsed,
): Developer {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    logo: raw.logo,
    description: asLocalized(raw.description),
    shortDescription: asLocalized(raw.shortDescription),
    city: raw.city,
    citySlug: raw.citySlug,
    website: raw.website ?? undefined,
    projectCount: raw.projectCount,
    featured: raw.featured,
    coverImage: raw.coverImage ?? undefined,
    tagline: asLocalizedNullable(raw.tagline) ?? undefined,
  };
}

export function mapApiCity(raw: ApiCity | ApiCityCollapsed): City {
  return {
    name: raw.name,
    slug: raw.slug,
    description: asLocalized(raw.description),
    image: raw.image,
    propertyCount: raw.propertyCount,
    latitude: raw.latitude ?? undefined,
    longitude: raw.longitude ?? undefined,
    countySlug: raw.county?.slug ?? raw.countySlug ?? undefined,
  };
}

export function mapApiCounty(raw: ApiCounty): County {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    code: raw.code,
    latitude: raw.latitude,
    longitude: raw.longitude,
    propertyCount: raw.propertyCount,
  };
}

export function mapApiCounties(raw: ApiCounty[]): County[] {
  return raw.map(mapApiCounty);
}

export function mapApiMapPin(raw: ApiMapPin): MapPin {
  return {
    id: raw.id,
    slug: raw.slug,
    latitude: raw.latitude,
    longitude: raw.longitude,
    price: raw.price,
    type: raw.type,
    heroImageSrc: raw.heroImageSrc ?? undefined,
  };
}

export function mapApiMapPins(raw: ApiMapPin[]): MapPin[] {
  return raw.map(mapApiMapPin);
}

export function mapApiArticle(raw: ApiArticle | ApiArticleCollapsed): Article {
  return {
    id: raw.id,
    slug: raw.slug,
    title: asLocalized(raw.title),
    excerpt: asLocalized(raw.excerpt),
    content: asLocalized(raw.content),
    coverImage: raw.coverImage,
    category: raw.category,
    tags: raw.tags ?? [],
    publishedAt: raw.publishedAt,
    authorName: raw.authorName,
    authorAvatar: raw.authorAvatar ?? undefined,
    readTimeMinutes: raw.readTimeMinutes ?? 5,
  };
}

export function mapApiArticles(
  raw: (ApiArticle | ApiArticleCollapsed)[],
): Article[] {
  return raw.map(mapApiArticle);
}

export function mapApiTestimonial(
  raw: ApiTestimonial | ApiTestimonialCollapsed,
): Testimonial {
  return {
    id: raw.id,
    clientName: raw.clientName,
    location: raw.location,
    propertyType: raw.propertyType,
    quote: asLocalized(raw.quote),
    rating: raw.rating,
  };
}
