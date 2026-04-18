import type {
  Property,
  Developer,
  City,
  County,
  MapPin,
  Testimonial,
  Article,
  ApiProperty,
  ApiDeveloper,
  ApiCity,
  ApiCounty,
  ApiMapPin,
  ApiTestimonial,
  ApiArticle,
} from "@tge/types";

export function mapApiProperty(raw: ApiProperty): Property {
  const denom = raw.type === "terrain" ? raw.landArea : raw.area;
  const pricePerSqm =
    denom && denom > 0 ? Math.round(raw.price / denom) : undefined;

  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    description: raw.description,
    shortDescription: raw.shortDescription,
    price: raw.price,
    currency: (raw.currency ?? "EUR") as "EUR",
    type: raw.type,
    status: raw.status,
    tier: raw.tier,
    location: {
      city: raw.city,
      citySlug: raw.citySlug,
      neighborhood: raw.neighborhood,
      address: raw.address,
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
    features: raw.features ?? [],
    images: (raw.images ?? []).map((img) => ({
      src: img.src,
      alt: img.alt,
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

export function mapApiProperties(raw: ApiProperty[]): Property[] {
  return raw.map(mapApiProperty);
}

export function mapApiDeveloper(raw: ApiDeveloper): Developer {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    logo: raw.logo,
    description: raw.description,
    shortDescription: raw.shortDescription,
    city: raw.city,
    citySlug: raw.citySlug,
    website: raw.website ?? undefined,
    projectCount: raw.projectCount,
    featured: raw.featured,
    coverImage: raw.coverImage ?? undefined,
    tagline: raw.tagline ?? undefined,
  };
}

export function mapApiCity(raw: ApiCity): City {
  return {
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
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

export function mapApiArticle(raw: ApiArticle): Article {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    excerpt: raw.excerpt,
    content: raw.content,
    coverImage: raw.coverImage,
    category: raw.category,
    tags: raw.tags ?? [],
    publishedAt: raw.publishedAt,
    authorName: raw.authorName,
    authorAvatar: raw.authorAvatar ?? undefined,
    readTimeMinutes: raw.readTimeMinutes ?? 5,
  };
}

export function mapApiArticles(raw: ApiArticle[]): Article[] {
  return raw.map(mapApiArticle);
}

export function mapApiTestimonial(raw: ApiTestimonial): Testimonial {
  return {
    id: raw.id,
    clientName: raw.clientName,
    location: raw.location,
    propertyType: raw.propertyType,
    quote: raw.quote,
    rating: raw.rating,
  };
}
