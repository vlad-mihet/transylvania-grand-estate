import { Developer } from "@tge/types";

export const developers: Developer[] = [
  {
    id: "dev-001",
    slug: "studium-green",
    name: "Studium Green",
    logo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=400&q=80",
    description: {
      en: "Studium Green is Cluj-Napoca's leading sustainable luxury developer, known for integrating green building practices with high-end residential design. Their projects feature energy-efficient construction, smart home systems, and generous green spaces, setting new standards for eco-conscious luxury living in Transylvania.",
      ro: "Studium Green este cel mai important dezvoltator de lux sustenabil din Cluj-Napoca, cunoscut pentru integrarea practicilor de constructii verzi cu designul rezidential de inalta clasa. Proiectele lor prezinta constructii eficiente energetic, sisteme smart home si spatii verzi generoase.",
    },
    shortDescription: {
      en: "Cluj-Napoca's leading sustainable luxury developer with smart, energy-efficient homes.",
      ro: "Cel mai important dezvoltator de lux sustenabil din Cluj-Napoca cu locuinte smart si eficiente energetic.",
    },
    city: "Cluj-Napoca",
    citySlug: "cluj-napoca",
    website: "https://studiumgreen.ro",
    projectCount: 8,
    featured: true,
  },
  {
    id: "dev-002",
    slug: "maurer-imobiliare",
    name: "Maurer Imobiliare",
    logo: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=80",
    description: {
      en: "Maurer Imobiliare is one of Romania's most established residential developers, with over 15 years of experience delivering premium housing communities across Transylvania. Known for their attention to detail and commitment to quality materials, Maurer has delivered over 3,000 homes in Brasov, Sibiu, and Cluj-Napoca.",
      ro: "Maurer Imobiliare este unul dintre cei mai consacrati dezvoltatori rezidentiali din Romania, cu peste 15 ani de experienta in livrarea comunitatilor rezidentiale premium din Transilvania. Cunoscuti pentru atentia la detalii si angajamentul fata de materialele de calitate, Maurer a livrat peste 3.000 de locuinte in Brasov, Sibiu si Cluj-Napoca.",
    },
    shortDescription: {
      en: "Established developer with 15+ years and 3,000+ homes delivered across Transylvania.",
      ro: "Dezvoltator consacrat cu peste 15 ani si peste 3.000 de locuinte livrate in Transilvania.",
    },
    city: "Brasov",
    citySlug: "brasov",
    website: "https://maurerimobiliare.ro",
    projectCount: 12,
    featured: true,
  },
  {
    id: "dev-003",
    slug: "west-residential",
    name: "West Residential",
    logo: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80",
    description: {
      en: "West Residential specializes in boutique residential developments in Timisoara, creating intimate communities with a focus on architectural excellence and premium amenities. Each project is limited to a small number of units, ensuring exclusivity and personalized attention to every detail.",
      ro: "West Residential se specializeaza in dezvoltari rezidentiale boutique in Timisoara, creand comunitati intime cu accent pe excelenta arhitecturala si facilitati premium. Fiecare proiect este limitat la un numar mic de unitati, asigurand exclusivitate si atentie personalizata la fiecare detaliu.",
    },
    shortDescription: {
      en: "Boutique developer creating exclusive, intimate residential communities in Timisoara.",
      ro: "Dezvoltator boutique care creeaza comunitati rezidentiale exclusive si intime in Timisoara.",
    },
    city: "Timisoara",
    citySlug: "timisoara",
    website: "https://westresidential.ro",
    projectCount: 5,
    featured: true,
  },
  {
    id: "dev-004",
    slug: "impact-developer",
    name: "Impact Developer & Contractor",
    logo: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=80",
    description: {
      en: "Impact Developer & Contractor is a publicly listed Romanian real estate developer with a strong focus on sustainable, large-scale residential projects. With operations across major Romanian cities, Impact brings institutional-grade quality to their residential developments, featuring integrated community amenities and green certifications.",
      ro: "Impact Developer & Contractor este un dezvoltator imobiliar roman listat la bursa, cu un accent puternic pe proiecte rezidentiale sustenabile de mare amploare. Cu operatiuni in principalele orase din Romania, Impact aduce calitate de grad institutional dezvoltarilor rezidentiale, cu facilitati comunitare integrate si certificari verzi.",
    },
    shortDescription: {
      en: "Publicly listed developer delivering sustainable, large-scale residential communities.",
      ro: "Dezvoltator listat la bursa care livreaza comunitati rezidentiale sustenabile de mare amploare.",
    },
    city: "Cluj-Napoca",
    citySlug: "cluj-napoca",
    website: "https://impactsa.ro",
    projectCount: 6,
    featured: false,
  },
];

export function getDeveloperBySlug(slug: string): Developer | undefined {
  return developers.find((d) => d.slug === slug);
}

export function getFeaturedDevelopers(): Developer[] {
  return developers.filter((d) => d.featured);
}

export function getDevelopersByCity(citySlug: string): Developer[] {
  return developers.filter((d) => d.citySlug === citySlug);
}
