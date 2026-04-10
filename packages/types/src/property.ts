export type Locale = "en" | "ro" | "fr" | "de";

export type LocalizedString = {
  en: string;
  ro: string;
  fr?: string;
  de?: string;
};

export type PropertyType =
  | "apartment"
  | "house"
  | "villa"
  | "terrain"
  | "penthouse"
  | "estate"
  | "chalet"
  | "mansion"
  | "palace";

export type PropertyStatus = "available" | "sold" | "reserved";

export interface PropertySpecs {
  bedrooms: number;
  bathrooms: number;
  area: number;
  landArea?: number;
  floors: number;
  yearBuilt: number;
  garage?: number;
  pool?: boolean;
}

export interface PropertyLocation {
  city: string;
  citySlug: string;
  neighborhood: string;
  address: LocalizedString;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface PropertyImage {
  src: string;
  alt: LocalizedString;
  isHero?: boolean;
}

export interface Property {
  id: string;
  slug: string;
  title: LocalizedString;
  description: LocalizedString;
  shortDescription: LocalizedString;
  price: number;
  currency: "EUR";
  type: PropertyType;
  status: PropertyStatus;
  location: PropertyLocation;
  specs: PropertySpecs;
  features: LocalizedString[];
  images: PropertyImage[];
  featured: boolean;
  new?: boolean;
  developerId?: string;
  developerName?: string;
  agentId?: string;
  agentName?: string;
  createdAt: string;
}
