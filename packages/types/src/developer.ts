import { LocalizedString } from "./property";

export interface Developer {
  id: string;
  slug: string;
  name: string;
  logo: string;
  description: LocalizedString;
  shortDescription: LocalizedString;
  city: string;
  citySlug: string;
  website?: string;
  projectCount: number;
  featured: boolean;
  coverImage?: string;
  tagline?: LocalizedString;
}
