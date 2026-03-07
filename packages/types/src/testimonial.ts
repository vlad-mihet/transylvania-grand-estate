import { LocalizedString } from "./property";

export interface Testimonial {
  id: string;
  clientName: string;
  location: string;
  propertyType: string;
  quote: LocalizedString;
  rating: number;
}
