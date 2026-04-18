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

export type PropertyTier = "luxury" | "affordable";

export type Furnishing = "unfurnished" | "semi_furnished" | "furnished" | "luxury";
export type ConstructionMaterial = "brick" | "concrete" | "bca" | "wood" | "stone" | "mixed";
export type PropertyCondition = "new_build" | "renovated" | "good" | "needs_renovation" | "under_construction";
export type SellerType = "private_seller" | "agency" | "developer";
export type HeatingType =
  | "central_gas"
  | "centralized"
  | "block_central"
  | "electric"
  | "heat_pump"
  | "solid_fuel"
  | "none";
export type OwnershipType = "personal" | "company" | "mixed";
export type WindowType = "pvc_double" | "pvc_triple" | "wood" | "aluminum" | "mixed";

export interface PropertySpecs {
  bedrooms: number;
  bathrooms: number;
  area: number;
  landArea?: number;
  floors: number;
  floor?: number;
  yearBuilt: number;
  garage?: number;
  pool?: boolean;
  furnishing?: Furnishing;
  material?: ConstructionMaterial;
  condition?: PropertyCondition;
  heating?: HeatingType;
  ownership?: OwnershipType;
  windowType?: WindowType;
  availabilityDate?: string;
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
  tier?: PropertyTier;
  location: PropertyLocation;
  specs: PropertySpecs;
  features: LocalizedString[];
  images: PropertyImage[];
  featured: boolean;
  new?: boolean;
  sellerType?: SellerType;
  hasBalcony?: boolean;
  hasTerrace?: boolean;
  hasParking?: boolean;
  hasGarage?: boolean;
  hasSeparateKitchen?: boolean;
  hasStorage?: boolean;
  hasElevator?: boolean;
  hasInteriorStaircase?: boolean;
  hasWashingMachine?: boolean;
  hasFridge?: boolean;
  hasStove?: boolean;
  hasOven?: boolean;
  hasAC?: boolean;
  hasBlinds?: boolean;
  hasArmoredDoors?: boolean;
  hasIntercom?: boolean;
  hasInternet?: boolean;
  hasCableTV?: boolean;
  pricePerSqm?: number;
  developerId?: string;
  developerName?: string;
  agentId?: string;
  agentName?: string;
  createdAt: string;
}
