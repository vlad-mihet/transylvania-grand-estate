import { LocalizedString } from "./property";

export interface NavItem {
  label: LocalizedString;
  href: string;
}

export interface SocialLink {
  platform: "instagram" | "facebook" | "linkedin" | "youtube";
  url: string;
}

export interface Office {
  city: string;
  address: LocalizedString;
  phone: string;
  email: string;
  hours: LocalizedString;
}

export interface SiteConfig {
  name: string;
  tagline: LocalizedString;
  description: LocalizedString;
  contact: {
    phone: string;
    email: string;
    whatsapp?: string;
  };
  socialLinks: SocialLink[];
  offices: Office[];
}
