import { LocalizedString } from "./property";

export interface City {
  name: string;
  slug: string;
  description: LocalizedString;
  image: string;
  /**
   * Per-brand hero overrides seeded into CityBrand.image. Absent brand keys
   * fall back to `image`. Only applied to brands the city is tagged with.
   */
  brandImages?: Partial<Record<"tge" | "revery", string>>;
  propertyCount: number;
  latitude?: number;
  longitude?: number;
  countySlug?: string;
}
