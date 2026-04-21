import { LocalizedString, PropertyType, PropertyStatus, PropertyTier, Furnishing, ConstructionMaterial, PropertyCondition, SellerType, HeatingType, OwnershipType, WindowType } from "./property";

// Raw shapes the NestJS API returns (before mapping into the frontend
// Property / City / Developer / etc. types). These mirror the Prisma models
// with date values serialized to ISO strings.

export interface ApiPropertyImage {
  id: string;
  src: string;
  alt: LocalizedString;
  isHero?: boolean;
  sortOrder?: number;
}

export interface ApiAgentSummary {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  photo?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface ApiDeveloperSummary {
  id: string;
  slug: string;
  name: string;
  logo?: string | null;
}

export interface ApiProperty {
  id: string;
  slug: string;
  title: LocalizedString;
  description: LocalizedString;
  shortDescription: LocalizedString;
  price: number;
  currency: string;
  type: PropertyType;
  status: PropertyStatus;
  tier?: PropertyTier;

  city: string;
  citySlug: string;
  countySlug?: string | null;
  neighborhood: string;
  address: LocalizedString;
  latitude: number;
  longitude: number;

  bedrooms: number;
  bathrooms: number;
  area: number;
  landArea?: number | null;
  floors: number;
  floor?: number | null;
  yearBuilt: number;
  garage?: number | null;
  pool?: boolean | null;

  furnishing?: Furnishing | null;
  material?: ConstructionMaterial | null;
  condition?: PropertyCondition | null;
  sellerType?: SellerType | null;
  heating?: HeatingType | null;
  ownership?: OwnershipType | null;
  windowType?: WindowType | null;
  availabilityDate?: string | null;

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

  features?: LocalizedString[] | null;
  featured?: boolean;
  isNew?: boolean;

  developerId?: string | null;
  developer?: ApiDeveloperSummary | null;
  agentId?: string | null;
  agent?: ApiAgentSummary | null;

  images?: ApiPropertyImage[];

  createdAt: string;
  updatedAt: string;
}

export interface ApiCounty {
  id: string;
  name: string;
  slug: string;
  code: string;
  latitude: number;
  longitude: number;
  propertyCount: number;
}

export interface ApiCity {
  id?: string;
  name: string;
  slug: string;
  description: LocalizedString;
  image: string;
  propertyCount: number;
  latitude?: number | null;
  longitude?: number | null;
  countyId?: string | null;
  countySlug?: string | null;
  county?: Pick<ApiCounty, "id" | "name" | "slug" | "code"> | null;
}

export interface ApiDeveloper {
  id: string;
  slug: string;
  name: string;
  logo: string;
  description: LocalizedString;
  shortDescription: LocalizedString;
  city: string;
  citySlug: string;
  website?: string | null;
  projectCount: number;
  featured: boolean;
  coverImage?: string | null;
  tagline?: LocalizedString | null;
  properties?: ApiProperty[];
}

export type ApiInvitationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "EXPIRED"
  | "REVOKED"
  | "BOUNCED";

/**
 * Compact invitation summary attached to an Agent row by the list endpoint.
 * Lets the admin UI render the "Pending invite / Expired / No login" pill
 * without a second round-trip. Never exposes the token \u2014 that only lives
 * in the invitee's email.
 */
export interface ApiAgentInvitationSummary {
  id: string;
  status: ApiInvitationStatus;
  expiresAt: string;
  emailSentAt?: string | null;
}

export interface ApiAgent {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  photo?: string | null;
  bio: LocalizedString;
  active: boolean;
  /** Present on admin list responses when the agent has been invited. */
  invitation?: ApiAgentInvitationSummary | null;
  /**
   * Populated when this agent has a linked AdminUser login. `null` for
   * public-profile-only agents. Only surfaced by admin endpoints.
   */
  adminUserId?: string | null;
  properties?: ApiProperty[];
}

export interface ApiMapPin {
  id: string;
  slug: string;
  latitude: number;
  longitude: number;
  price: number;
  type: PropertyType;
  heroImageSrc?: string | null;
}

export interface ApiArticle {
  id: string;
  slug: string;
  title: LocalizedString;
  excerpt: LocalizedString;
  content: LocalizedString;
  coverImage: string;
  category: string;
  tags?: string[] | null;
  publishedAt: string;
  authorName: string;
  authorAvatar?: string | null;
  readTimeMinutes?: number | null;
  status?: string;
}

export interface ApiTestimonial {
  id: string;
  clientName: string;
  location: string;
  propertyType: string;
  quote: LocalizedString;
  rating: number;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
