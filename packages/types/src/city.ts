import { LocalizedString } from "./property";

export interface City {
  name: string;
  slug: string;
  description: LocalizedString;
  image: string;
  propertyCount: number;
}
