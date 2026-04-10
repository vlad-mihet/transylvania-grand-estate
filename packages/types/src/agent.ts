import { LocalizedString } from "./property";

export interface Agent {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  photo?: string;
  bio: LocalizedString;
  active: boolean;
}
