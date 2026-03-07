import type { Property, Developer, City, Testimonial } from "@tge/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function mapApiProperty(raw: any): Property {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    description: raw.description,
    shortDescription: raw.shortDescription,
    price: raw.price,
    currency: raw.currency ?? "EUR",
    type: raw.type,
    status: raw.status,
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
      landArea: raw.landArea,
      floors: raw.floors,
      yearBuilt: raw.yearBuilt,
      garage: raw.garage,
      pool: raw.pool,
    },
    features: raw.features ?? [],
    images: (raw.images ?? []).map((img: any) => ({
      src: img.src,
      alt: img.alt,
      isHero: img.isHero,
    })),
    featured: raw.featured,
    new: raw.isNew,
    developerId: raw.developerId,
    developerName: raw.developer?.name,
    createdAt: raw.createdAt,
  };
}

export function mapApiProperties(raw: any[]): Property[] {
  return raw.map(mapApiProperty);
}

export function mapApiDeveloper(raw: any): Developer {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    logo: raw.logo,
    description: raw.description,
    shortDescription: raw.shortDescription,
    city: raw.city,
    citySlug: raw.citySlug,
    website: raw.website,
    projectCount: raw.projectCount,
    featured: raw.featured,
    coverImage: raw.coverImage,
    tagline: raw.tagline,
  };
}

export function mapApiCity(raw: any): City {
  return {
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    image: raw.image,
    propertyCount: raw.propertyCount,
  };
}

export function mapApiTestimonial(raw: any): Testimonial {
  return {
    id: raw.id,
    clientName: raw.clientName,
    location: raw.location,
    propertyType: raw.propertyType,
    quote: raw.quote,
    rating: raw.rating,
  };
}
