import { SiteConfig } from "@/types/common";

export const siteConfig: SiteConfig = {
  name: "Transylvania Grand Estate",
  tagline: {
    en: "Romania's Premier Luxury Real Estate Consultancy",
    ro: "Consultanta Imobiliara de Lux Premier din Romania",
  },
  description: {
    en: "Discover exceptional luxury properties across Romania's most prestigious addresses. Villas, mansions, and estates from €1M+.",
    ro: "Descoperiti proprietati de lux exceptionale in cele mai prestigioase adrese din Romania. Vile, conace si domenii de la €1M+.",
  },
  contact: {
    phone: "+40 264 123 456",
    email: "contact@tge.ro",
    whatsapp: "+40 745 123 456",
  },
  socialLinks: [
    { platform: "instagram", url: "https://instagram.com/tge" },
    { platform: "facebook", url: "https://facebook.com/tge" },
    { platform: "linkedin", url: "https://linkedin.com/company/tge" },
    { platform: "youtube", url: "https://youtube.com/@tge" },
  ],
  offices: [
    {
      city: "Cluj-Napoca",
      address: {
        en: "21 Eroilor Boulevard, Cluj-Napoca 400129, Cluj County",
        ro: "Bulevardul Eroilor 21, Cluj-Napoca 400129, Judetul Cluj",
      },
      phone: "+40 264 123 456",
      email: "cluj@tge.ro",
      hours: {
        en: "Mon-Fri: 9:00 - 18:00 | Sat: 10:00 - 14:00",
        ro: "Lun-Vin: 9:00 - 18:00 | Sam: 10:00 - 14:00",
      },
    },
    {
      city: "Brasov",
      address: {
        en: "15 Republicii Street, Brasov 500030, Brasov County",
        ro: "Strada Republicii 15, Brasov 500030, Judetul Brasov",
      },
      phone: "+40 268 123 456",
      email: "brasov@tge.ro",
      hours: {
        en: "Mon-Fri: 9:00 - 18:00 | Sat: 10:00 - 14:00",
        ro: "Lun-Vin: 9:00 - 18:00 | Sam: 10:00 - 14:00",
      },
    },
    {
      city: "Timisoara",
      address: {
        en: "8 Victoriei Square, Timisoara 300006, Timis County",
        ro: "Piata Victoriei 8, Timisoara 300006, Judetul Timis",
      },
      phone: "+40 256 123 456",
      email: "timisoara@tge.ro",
      hours: {
        en: "Mon-Fri: 9:00 - 18:00 | Sat: 10:00 - 14:00",
        ro: "Lun-Vin: 9:00 - 18:00 | Sam: 10:00 - 14:00",
      },
    },
  ],
};
