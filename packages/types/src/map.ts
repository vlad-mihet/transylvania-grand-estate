import { PropertyType } from "./property";

export interface MapPin {
  id: string;
  slug: string;
  latitude: number;
  longitude: number;
  price: number;
  type: PropertyType;
  heroImageSrc?: string;
}
