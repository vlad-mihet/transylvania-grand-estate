import { LocalizedString } from "@/types/property";

export interface City {
  name: string;
  slug: string;
  description: LocalizedString;
  image: string;
  propertyCount: number;
}

export const cities: City[] = [
  {
    name: "Cluj-Napoca",
    slug: "cluj-napoca",
    description: {
      en: "Romania's vibrant tech hub and cultural capital of Transylvania, known for its historic architecture and modern lifestyle.",
      ro: "Centrul tehnologic vibrant al Romaniei si capitala culturala a Transilvaniei, cunoscut pentru arhitectura istorica si stilul de viata modern.",
    },
    image: "https://images.unsplash.com/photo-1587974928442-77dc3e0dba72?w=800&q=80",
    propertyCount: 2,
  },
  {
    name: "Oradea",
    slug: "oradea",
    description: {
      en: "The Art Nouveau jewel of Romania, featuring stunning Habsburg-era architecture and thermal spa culture.",
      ro: "Bijuteria Art Nouveau a Romaniei, cu o arhitectura uimitoare din era habsburgica si cultura termala.",
    },
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80",
    propertyCount: 2,
  },
  {
    name: "Timisoara",
    slug: "timisoara",
    description: {
      en: "European Capital of Culture 2023, a cosmopolitan city blending Baroque heritage with contemporary innovation.",
      ro: "Capitala Europeana a Culturii 2023, un oras cosmopolit care imbina mostenirea baroca cu inovatia contemporana.",
    },
    image: "https://images.unsplash.com/photo-1584646098378-0874589d76b1?w=800&q=80",
    propertyCount: 2,
  },
  {
    name: "Brasov",
    slug: "brasov",
    description: {
      en: "Nestled at the foot of the Carpathian Mountains, offering alpine luxury living with medieval charm.",
      ro: "Asezat la poalele Muntilor Carpati, oferind un trai de lux alpin cu farmec medieval.",
    },
    image: "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800&q=80",
    propertyCount: 2,
  },
  {
    name: "Sibiu",
    slug: "sibiu",
    description: {
      en: "A medieval gem with cobblestone streets, fortified churches, and a thriving cultural scene.",
      ro: "O bijuterie medievala cu strazi pavate, biserici fortificate si o scena culturala infloritoare.",
    },
    image: "https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=800&q=80",
    propertyCount: 2,
  },
];
