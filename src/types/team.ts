import { LocalizedString } from "./property";

export interface TeamMember {
  id: string;
  name: string;
  role: LocalizedString;
  bio: LocalizedString;
  image: string;
  socialLinks?: {
    linkedin?: string;
    email?: string;
  };
}

export interface Testimonial {
  id: string;
  clientName: string;
  location: string;
  propertyType: string;
  quote: LocalizedString;
  rating: number;
}
