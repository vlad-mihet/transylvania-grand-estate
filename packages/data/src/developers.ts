import { Developer } from "@tge/types";

export const developers: Developer[] = [
  {
    id: "dev-001",
    slug: "verdalis-residence",
    name: "Verdalis Residence",
    logo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=400&q=80",
    description: {
      en: "Verdalis Residence is Cluj-Napoca's leading sustainable luxury developer, known for integrating green building practices with high-end residential design. Their projects feature energy-efficient construction, smart home systems, and generous green spaces, setting new standards for eco-conscious luxury living in Transylvania.",
      ro: "Verdalis Residence este cel mai important dezvoltator de lux sustenabil din Cluj-Napoca, cunoscut pentru integrarea practicilor de construcții verzi cu designul rezidențial de înaltă clasă. Proiectele lor prezintă construcții eficiente energetic, sisteme smart home și spații verzi generoase.",
    },
    shortDescription: {
      en: "Cluj-Napoca's leading sustainable luxury developer with smart, energy-efficient homes.",
      ro: "Cel mai important dezvoltator de lux sustenabil din Cluj-Napoca cu locuințe smart și eficiente energetic.",
    },
    city: "Cluj-Napoca",
    citySlug: "cluj-napoca",
    website: "https://verdalisresidence.ro",
    projectCount: 8,
    featured: true,
  },
  {
    id: "dev-002",
    slug: "carpathia-imobiliare",
    name: "Carpathia Imobiliare",
    logo: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=80",
    description: {
      en: "Carpathia Imobiliare is one of Romania's most established residential developers, with over 15 years of experience delivering premium housing communities across Transylvania. Known for their attention to detail and commitment to quality materials, Carpathia has delivered over 3,000 homes in Brasov, Sibiu, and Cluj-Napoca.",
      ro: "Carpathia Imobiliare este unul dintre cei mai consacrați dezvoltatori rezidențiali din România, cu peste 15 ani de experiență în livrarea comunităților rezidențiale premium din Transilvania. Cunoscuți pentru atenția la detalii și angajamentul față de materialele de calitate, Carpathia a livrat peste 3.000 de locuințe în Brașov, Sibiu și Cluj-Napoca.",
    },
    shortDescription: {
      en: "Established developer with 15+ years and 3,000+ homes delivered across Transylvania.",
      ro: "Dezvoltator consacrat cu peste 15 ani și peste 3.000 de locuințe livrate în Transilvania.",
    },
    city: "Brașov",
    citySlug: "brasov",
    website: "https://carpathiaimobiliare.ro",
    projectCount: 12,
    featured: true,
  },
  {
    id: "dev-003",
    slug: "atrium-boutique",
    name: "Atrium Boutique",
    logo: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80",
    description: {
      en: "Atrium Boutique specializes in boutique residential developments in Timisoara, creating intimate communities with a focus on architectural excellence and premium amenities. Each project is limited to a small number of units, ensuring exclusivity and personalized attention to every detail.",
      ro: "Atrium Boutique se specializează în dezvoltări rezidențiale boutique în Timișoara, creând comunități intime cu accent pe excelența arhitecturală și facilități premium. Fiecare proiect este limitat la un număr mic de unități, asigurând exclusivitate și atenție personalizată la fiecare detaliu.",
    },
    shortDescription: {
      en: "Boutique developer creating exclusive, intimate residential communities in Timisoara.",
      ro: "Dezvoltator boutique care creează comunități rezidențiale exclusive și intime în Timișoara.",
    },
    city: "Timișoara",
    citySlug: "timisoara",
    website: "https://atriumboutique.ro",
    projectCount: 5,
    featured: true,
  },
  {
    id: "dev-004",
    slug: "dacia-construct",
    name: "Dacia Construct & Dezvoltare",
    logo: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=80",
    description: {
      en: "Dacia Construct & Dezvoltare is a publicly listed Romanian real estate developer with a strong focus on sustainable, large-scale residential projects. With operations across major Romanian cities, Dacia Construct brings institutional-grade quality to their residential developments, featuring integrated community amenities and green certifications.",
      ro: "Dacia Construct & Dezvoltare este un dezvoltator imobiliar român listat la bursă, cu un accent puternic pe proiecte rezidențiale sustenabile de mare amploare. Cu operațiuni în principalele orașe din România, Dacia Construct aduce calitate de grad instituțional dezvoltărilor rezidențiale, cu facilități comunitare integrate și certificări verzi.",
    },
    shortDescription: {
      en: "Publicly listed developer delivering sustainable, large-scale residential communities.",
      ro: "Dezvoltator listat la bursă care livrează comunități rezidențiale sustenabile de mare amploare.",
    },
    city: "Cluj-Napoca",
    citySlug: "cluj-napoca",
    website: "https://daciaconstruct.ro",
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
