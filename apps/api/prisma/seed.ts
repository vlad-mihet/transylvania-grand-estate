import {
  PrismaClient,
  AdminRole,
  HeatingType,
  OwnershipType,
  WindowType,
  PropertyTier,
  PropertyType,
  PropertyStatus,
  Furnishing,
  ConstructionMaterial,
  PropertyCondition,
  SellerType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import {
  properties,
  developers,
  agents,
  cities,
  counties,
  neighborhoods,
  testimonials,
  articles,
} from '@tge/data';

/**
 * Set SEED_RESET=true to blow away properties + images before re-seeding.
 * Off by default so re-running seed doesn't delete manually-added listings.
 */
const SEED_RESET = process.env.SEED_RESET === 'true';

/*
 * Prod workflow: when you change data in packages/data/**, after the
 * deploy goes green run
 *   fly ssh console -a tge-api -C 'cd /app && npx prisma db seed'
 * to upsert the new rows into prod Neon. This step is manual on
 * purpose — it keeps deploys fast and keeps seed failures out of the
 * release rollback path. fly.toml's release_command only runs
 * `prisma migrate deploy`; seed never runs automatically.
 */

const prisma = new PrismaClient();

function hashSlug(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function deriveStoriaFields(prop: (typeof properties)[number]) {
  const h = hashSlug(prop.slug);
  const heatings: HeatingType[] = [
    HeatingType.central_gas,
    HeatingType.block_central,
    HeatingType.centralized,
  ];
  const heating = heatings[h % heatings.length];

  const furnishing = prop.specs.furnishing;
  const isFurnished = furnishing === 'furnished' || furnishing === 'luxury';
  const isSemi = furnishing === 'semi_furnished';

  const isApartment = prop.type === 'apartment' || prop.type === 'penthouse';
  const isHouseLike =
    prop.type === 'house' ||
    prop.type === 'villa' ||
    prop.type === 'estate' ||
    prop.type === 'mansion' ||
    prop.type === 'palace' ||
    prop.type === 'chalet';

  const daysOut = 30 + (h % 61);
  const availabilityDate = new Date();
  availabilityDate.setDate(availabilityDate.getDate() + daysOut);

  return {
    heating,
    ownership: OwnershipType.personal,
    windowType: WindowType.pvc_double,
    availabilityDate,
    hasInteriorStaircase: isHouseLike || prop.type === 'penthouse',
    hasWashingMachine: isFurnished || isSemi,
    hasFridge: isFurnished || isSemi,
    hasStove: isFurnished || isSemi,
    hasOven: isFurnished,
    hasAC: h % 2 === 0,
    hasBlinds: isApartment,
    hasArmoredDoors: isApartment,
    hasIntercom: isApartment,
    hasInternet: true,
    hasCableTV: true,
  };
}

const developerCoverImages: Record<string, string> = {
  'verdalis-residence':
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80',
  'carpathia-imobiliare':
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&q=80',
  'atrium-boutique':
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1920&q=80',
  'dacia-construct':
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&q=80',
};

const developerTaglines: Record<string, { en: string; ro: string }> = {
  'verdalis-residence': {
    en: 'Sustainable luxury, timeless design',
    ro: 'Lux sustenabil, design atemporal',
  },
  'carpathia-imobiliare': {
    en: "Building tomorrow's heritage today",
    ro: 'Construim patrimoniul de mâine, astăzi',
  },
  'atrium-boutique': {
    en: 'Where architecture meets artistry',
    ro: 'Unde arhitectura întâlnește arta',
  },
  'dacia-construct': {
    en: 'Redefining urban living',
    ro: 'Redefinim viața urbană',
  },
};

async function main() {
  console.log('Starting database seed...');

  // 1. Create default admin user.
  //   SEED_ADMIN_PASSWORD is preferred; otherwise a random one is generated
  //   and printed exactly once so a fresh-cloned dev setup still works.
  //   Re-seeds leave an existing admin alone — the random password is only
  //   logged when we actually created the row, avoiding a misleading
  //   "here's a password that doesn't work" message on subsequent runs.
  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: 'admin@tge.ro' },
    select: { id: true },
  });
  if (!existingAdmin) {
    const envPassword = process.env.SEED_ADMIN_PASSWORD;
    const plainPassword =
      envPassword && envPassword.length > 0
        ? envPassword
        : randomBytes(12).toString('base64url');
    const adminPassword = await bcrypt.hash(plainPassword, 12);
    await prisma.adminUser.create({
      data: {
        email: 'admin@tge.ro',
        passwordHash: adminPassword,
        name: 'Admin User',
        role: AdminRole.SUPER_ADMIN,
      },
    });
    if (envPassword) {
      console.log('  Admin user created: admin@tge.ro (password from SEED_ADMIN_PASSWORD)');
    } else {
      console.log(`  Admin user created: admin@tge.ro / ${plainPassword}`);
      console.log('    ^ random password, set SEED_ADMIN_PASSWORD to pin it');
    }
  } else {
    console.log('  Admin user already exists: admin@tge.ro (password unchanged)');
  }

  // 2. Seed developers (before properties, due to FK)
  const developerIdMap = new Map<string, string>();
  for (const dev of developers) {
    const created = await prisma.developer.upsert({
      where: { slug: dev.slug },
      update: {
        coverImage: developerCoverImages[dev.slug] ?? null,
        tagline: developerTaglines[dev.slug] ?? null,
      },
      create: {
        slug: dev.slug,
        name: dev.name,
        logo: dev.logo,
        description: dev.description,
        shortDescription: dev.shortDescription,
        city: dev.city,
        citySlug: dev.citySlug,
        website: dev.website ?? null,
        projectCount: dev.projectCount,
        featured: dev.featured,
        coverImage: developerCoverImages[dev.slug] ?? null,
        tagline: developerTaglines[dev.slug] ?? null,
      },
    });
    developerIdMap.set(dev.id, created.id);
  }
  console.log(`  ${developers.length} developers seeded`);

  // 2b. Seed agents (grouped by city for property assignment)
  const agentIdMap = new Map<string, string>();
  const agentIdsByCity = new Map<string, string[]>();
  for (const agent of agents) {
    const created = await prisma.agent.upsert({
      where: { slug: agent.slug },
      update: {},
      create: {
        slug: agent.slug,
        firstName: agent.firstName,
        lastName: agent.lastName,
        email: agent.email,
        phone: agent.phone,
        photo: agent.photo ?? null,
        bio: agent.bio,
        active: agent.active,
      },
    });
    agentIdMap.set(agent.id, created.id);
    const cityAgents = agentIdsByCity.get(agent.city) ?? [];
    cityAgents.push(created.id);
    agentIdsByCity.set(agent.city, cityAgents);
  }
  console.log(`  ${agents.length} agents seeded`);

  // 2c. Seed counties (before cities, so City.countyId FK can resolve)
  const countyIdBySlug = new Map<string, string>();
  for (const county of counties) {
    const created = await prisma.county.upsert({
      where: { slug: county.slug },
      update: {
        name: county.name,
        code: county.code,
        latitude: county.latitude,
        longitude: county.longitude,
      },
      create: {
        name: county.name,
        slug: county.slug,
        code: county.code,
        latitude: county.latitude,
        longitude: county.longitude,
      },
    });
    countyIdBySlug.set(county.slug, created.id);
  }
  console.log(`  ${counties.length} counties seeded`);

  // 3. Seed cities with county FK populated from countySlug.
  //   Prisma's CityCreateInput requires `countyId: string` (the schema
  //   migration made the FK NOT NULL), so a missing county slug must resolve
  //   to `undefined` rather than `null` — the `??` fallback handles both.
  const cityIdBySlug = new Map<string, string>();
  for (const city of cities) {
    const countyId = city.countySlug
      ? countyIdBySlug.get(city.countySlug)
      : undefined;
    if (!countyId) {
      console.warn(
        `  skipping city ${city.slug}: no matching county for "${city.countySlug ?? '(none)'}"`,
      );
      continue;
    }
    const created = await prisma.city.upsert({
      where: { slug: city.slug },
      update: {
        name: city.name,
        description: city.description,
        image: city.image,
        latitude: city.latitude ?? null,
        longitude: city.longitude ?? null,
        countyId,
      },
      create: {
        name: city.name,
        slug: city.slug,
        description: city.description,
        image: city.image,
        propertyCount: city.propertyCount,
        latitude: city.latitude ?? null,
        longitude: city.longitude ?? null,
        countyId,
      },
    });
    cityIdBySlug.set(city.slug, created.id);
  }
  console.log(`  ${cities.length} cities seeded`);

  // 3b. Seed neighborhoods (keyed by city)
  for (const n of neighborhoods) {
    const cityId = cityIdBySlug.get(n.citySlug);
    if (!cityId) continue;
    await prisma.neighborhood.upsert({
      where: { slug_cityId: { slug: n.slug, cityId } },
      update: { name: n.name },
      create: { name: n.name, slug: n.slug, cityId },
    });
  }
  console.log(`  ${neighborhoods.length} neighborhoods seeded`);

  // 4. Seed properties with images.
  //   Destructive reset is opt-in via SEED_RESET=true — without it, re-running
  //   seed only upserts and preserves any manually-added listings.
  const cityPropertyCounters = new Map<string, number>();
  if (SEED_RESET) {
    await prisma.propertyImage.deleteMany({});
    await prisma.property.deleteMany({});
    console.log('  [SEED_RESET] properties + images wiped before re-seed');
  }
  for (const prop of properties) {
    // Map static developer ID to database UUID
    const developerId = prop.developerId
      ? developerIdMap.get(prop.developerId) ?? null
      : null;

    // Assign agents by city, round-robin within each city's agent pool
    const citySlug = prop.location.citySlug;
    const cityAgents = agentIdsByCity.get(citySlug) ?? [];
    const counter = cityPropertyCounters.get(citySlug) ?? 0;
    const agentId = cityAgents.length > 0 ? cityAgents[counter % cityAgents.length] : null;
    cityPropertyCounters.set(citySlug, counter + 1);

    const storia = deriveStoriaFields(prop);

    // Resolve FK ids from the denormalized slug / name. These feed the new
    // cityRef/neighborhoodRef relations; the string columns below keep
    // working for any code that hasn't migrated yet.
    const cityId = cityIdBySlug.get(citySlug) ?? null;
    const neighborhoodId = cityId
      ? (
          await prisma.neighborhood.findFirst({
            where: {
              cityId,
              name: {
                equals: prop.location.neighborhood,
                mode: 'insensitive',
              },
            },
            select: { id: true },
          })
        )?.id ?? null
      : null;

    await prisma.property.upsert({
      where: { slug: prop.slug },
      update: {
        ...storia,
        tier: PropertyTier.luxury,
        cityId,
        neighborhoodId,
      },
      create: {
        slug: prop.slug,
        title: prop.title,
        description: prop.description,
        shortDescription: prop.shortDescription,
        price: prop.price,
        currency: prop.currency,
        type: prop.type as any,
        status: prop.status as any,
        tier: PropertyTier.luxury,
        city: prop.location.city,
        citySlug: prop.location.citySlug,
        neighborhood: prop.location.neighborhood,
        address: prop.location.address,
        latitude: prop.location.coordinates.lat,
        longitude: prop.location.coordinates.lng,
        bedrooms: prop.specs.bedrooms,
        bathrooms: prop.specs.bathrooms,
        area: prop.specs.area,
        landArea: prop.specs.landArea ?? null,
        floors: prop.specs.floors,
        yearBuilt: prop.specs.yearBuilt,
        garage: prop.specs.garage ?? null,
        pool: prop.specs.pool ?? false,
        features: prop.features as any,
        featured: prop.featured,
        isNew: prop.new ?? false,
        developerId: developerId,
        agentId: agentId,
        cityId,
        neighborhoodId,
        ...storia,
        images: {
          create: prop.images.map((img, index) => ({
            src: img.src,
            alt: img.alt,
            isHero: img.isHero ?? false,
            sortOrder: index,
          })),
        },
      },
    });
  }
  console.log(`  ${properties.length} properties seeded`);

  // 4b. Seed Reveria (affordable) properties. These live in the same table
  //    as luxury listings; the `tier` column is what keeps the two brands
  //    separated at the API layer (see apps/api/prisma/schema.prisma).
  const affordableProperties = buildAffordableProperties(
    cityIdBySlug,
    developerIdMap,
    agentIdsByCity,
  );
  for (const ap of affordableProperties) {
    const cityId = cityIdBySlug.get(ap.citySlug) ?? null;
    const neighborhoodId = cityId
      ? (
          await prisma.neighborhood.findFirst({
            where: {
              cityId,
              name: { equals: ap.neighborhood, mode: 'insensitive' },
            },
            select: { id: true },
          })
        )?.id ?? null
      : null;

    await prisma.property.upsert({
      where: { slug: ap.slug },
      update: {
        tier: PropertyTier.affordable,
        cityId,
        neighborhoodId,
      },
      create: {
        slug: ap.slug,
        title: ap.title,
        description: ap.description,
        shortDescription: ap.shortDescription,
        price: ap.price,
        currency: 'EUR',
        type: ap.type,
        status: PropertyStatus.available,
        tier: PropertyTier.affordable,
        city: ap.city,
        citySlug: ap.citySlug,
        neighborhood: ap.neighborhood,
        address: ap.address,
        latitude: ap.lat,
        longitude: ap.lng,
        bedrooms: ap.bedrooms,
        bathrooms: ap.bathrooms,
        area: ap.area,
        landArea: ap.landArea ?? null,
        floors: ap.floors,
        yearBuilt: ap.yearBuilt,
        floor: ap.floor ?? null,
        furnishing: ap.furnishing,
        material: ap.material,
        condition: ap.condition,
        sellerType: ap.sellerType,
        heating: HeatingType.central_gas,
        ownership: OwnershipType.personal,
        windowType: WindowType.pvc_double,
        hasBalcony: ap.hasBalcony ?? false,
        hasParking: ap.hasParking ?? false,
        hasElevator: ap.hasElevator ?? false,
        hasAC: ap.hasAC ?? false,
        hasInternet: true,
        hasCableTV: true,
        features: [] as unknown as any,
        featured: ap.featured ?? false,
        isNew: ap.isNew ?? false,
        cityId,
        neighborhoodId,
        agentId:
          (agentIdsByCity.get(ap.citySlug) ?? [])[0] ?? null,
        images: {
          create: ap.images.map((src, index) => ({
            src,
            alt: {
              en: `${ap.title.en} — photo ${index + 1}`,
              ro: `${ap.title.ro} — fotografia ${index + 1}`,
            },
            isHero: index === 0,
            sortOrder: index,
          })),
        },
      },
    });
  }
  console.log(
    `  ${affordableProperties.length} affordable (Reveria) properties seeded`,
  );

  // 5. Seed testimonials — wipe when SEED_RESET is set so content edits
  //   (e.g. diacritic fixes) propagate to an already-seeded dev DB.
  if (SEED_RESET) {
    await prisma.testimonial.deleteMany({});
    console.log('  [SEED_RESET] testimonials wiped before re-seed');
  }
  const existingTestimonials = await prisma.testimonial.count();
  if (existingTestimonials === 0) {
    for (const test of testimonials) {
      await prisma.testimonial.create({
        data: {
          clientName: test.clientName,
          location: test.location,
          propertyType: test.propertyType,
          quote: test.quote,
          rating: test.rating,
        },
      });
    }
    console.log(`  ${testimonials.length} testimonials seeded`);
  } else {
    console.log(`  Testimonials already seeded (${existingTestimonials} found)`);
  }

  // 6. Seed articles — same SEED_RESET pattern as testimonials.
  if (SEED_RESET) {
    await prisma.article.deleteMany({});
    console.log('  [SEED_RESET] articles wiped before re-seed');
  }
  const existingArticles = await prisma.article.count();
  if (existingArticles === 0) {
    for (const article of articles) {
      await prisma.article.create({
        data: {
          slug: article.slug,
          title: article.title,
          excerpt: article.excerpt,
          content: article.content,
          coverImage: article.coverImage,
          category: article.category,
          tags: article.tags,
          status: 'published',
          publishedAt: new Date(article.publishedAt),
          authorName: article.authorName,
          authorAvatar: article.authorAvatar,
          readTimeMinutes: article.readTimeMinutes,
        },
      });
    }
    console.log(`  ${articles.length} articles seeded`);
  } else {
    console.log(`  Articles already seeded (${existingArticles} found)`);
  }

  // 7. Seed site config
  const siteConfigData = {
    name: 'Transylvania Grand Estate',
    tagline: {
      en: "Romania's Premier Luxury Real Estate Consultancy",
      ro: 'Consultanță Imobiliară de Lux Premier din România',
    },
    description: {
      en: "Discover exceptional luxury properties across Romania's most prestigious addresses. Villas, mansions, and estates from €1M+.",
      ro: 'Descoperiți proprietăți de lux excepționale în cele mai prestigioase adrese din România. Vile, conace și domenii de la €1M+.',
    },
    contact: {
      phone: '+40 264 123 456',
      email: 'contact@tge.ro',
      whatsapp: '+40 745 123 456',
    },
    socialLinks: [
      { platform: 'instagram', url: 'https://instagram.com/tge' },
      { platform: 'facebook', url: 'https://facebook.com/tge' },
      { platform: 'linkedin', url: 'https://linkedin.com/company/tge' },
      { platform: 'youtube', url: 'https://youtube.com/@tge' },
    ],
  };
  await prisma.siteConfig.upsert({
    where: { id: 'singleton' },
    update: {
      name: siteConfigData.name,
      tagline: siteConfigData.tagline,
      description: siteConfigData.description,
      contact: siteConfigData.contact,
      socialLinks: siteConfigData.socialLinks as any,
    },
    create: {
      id: 'singleton',
      name: siteConfigData.name,
      tagline: siteConfigData.tagline,
      description: siteConfigData.description,
      contact: siteConfigData.contact,
      socialLinks: siteConfigData.socialLinks as any,
    },
  });
  console.log('  Site config seeded');

  // 8. Seed bank rates
  const bankRatesData = [
    { bankName: 'Noua Casă', rate: 5.0, rateType: 'govt_program' as const, maxLtv: 0.95, maxTermYears: 30, processingFee: 0.0, insuranceRate: 0.05, notes: 'Program guvernamental — max 70.000 EUR', sortOrder: 0 },
    { bankName: 'ING Bank', rate: 6.2, rateType: 'fixed' as const, maxLtv: 0.85, maxTermYears: 30, processingFee: 0.5, insuranceRate: 0.05, sortOrder: 1 },
    { bankName: 'CEC Bank', rate: 6.3, rateType: 'fixed' as const, maxLtv: 0.85, maxTermYears: 30, processingFee: 0.75, insuranceRate: 0.06, sortOrder: 2 },
    { bankName: 'Banca Transilvania', rate: 6.4, rateType: 'fixed' as const, maxLtv: 0.85, maxTermYears: 30, processingFee: 1.0, insuranceRate: 0.05, sortOrder: 3 },
    { bankName: 'BRD', rate: 6.5, rateType: 'fixed' as const, maxLtv: 0.80, maxTermYears: 30, processingFee: 0.75, insuranceRate: 0.06, sortOrder: 4 },
    { bankName: 'Raiffeisen', rate: 6.6, rateType: 'fixed' as const, maxLtv: 0.85, maxTermYears: 30, processingFee: 1.0, insuranceRate: 0.05, sortOrder: 5 },
    { bankName: 'BCR', rate: 6.8, rateType: 'fixed' as const, maxLtv: 0.85, maxTermYears: 30, processingFee: 0.5, insuranceRate: 0.06, sortOrder: 6 },
  ];
  for (const br of bankRatesData) {
    const existing = await prisma.bankRate.findFirst({
      where: { bankName: br.bankName },
    });
    if (!existing) {
      await prisma.bankRate.create({ data: br });
    }
  }
  console.log('  Bank rates seeded');

  // 9. Seed financial indicators
  const indicatorsData = [
    { key: 'EUR_RON', value: 4.97, source: 'Seed (approximate)', sourceUrl: 'https://www.bnr.ro/nbrfxrates.xml' },
    { key: 'IRCC', value: 5.86, source: 'Seed (Q1 2026 approximate)', sourceUrl: null as string | null },
  ];
  for (const ind of indicatorsData) {
    await prisma.financialIndicator.upsert({
      where: { key: ind.key },
      update: {},
      create: {
        key: ind.key,
        value: ind.value,
        source: ind.source,
        sourceUrl: ind.sourceUrl,
        fetchedAt: new Date(),
      },
    });
  }
  console.log('  Financial indicators seeded');

  console.log('Seed completed successfully!');
}

// ── Reveria affordable seed data ─────────────────────────────────────────
//
// Hand-curated listings in the 60k–950k EUR band. Prices and addresses are
// fictional but plausible; Romanian strings use the proper diacritics that
// the Reveria brand requires. Kept inline (not in @tge/data) because the
// package currently only exports luxury data and we don't want to couple
// the two datasets yet.

interface AffordableSeed {
  slug: string;
  title: { en: string; ro: string };
  description: { en: string; ro: string };
  shortDescription: { en: string; ro: string };
  price: number;
  type: PropertyType;
  city: string;
  citySlug: string;
  neighborhood: string;
  address: { en: string; ro: string };
  lat: number;
  lng: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  landArea?: number;
  floors: number;
  yearBuilt: number;
  floor?: number;
  furnishing: Furnishing;
  material: ConstructionMaterial;
  condition: PropertyCondition;
  sellerType: SellerType;
  hasBalcony?: boolean;
  hasParking?: boolean;
  hasElevator?: boolean;
  hasAC?: boolean;
  featured?: boolean;
  isNew?: boolean;
  images: string[];
}

function buildAffordableProperties(
  _cityIdBySlug: Map<string, string>,
  _developerIdMap: Map<string, string>,
  _agentIdsByCity: Map<string, string[]>,
): AffordableSeed[] {
  const stockImage = (id: string) =>
    `https://images.unsplash.com/${id}?w=1600&q=80`;

  return [
    // ─── Cluj-Napoca ────────────────────────────────────────
    {
      slug: 'reveria-studio-centru-cluj',
      title: {
        en: 'Bright studio in central Cluj-Napoca',
        ro: 'Studio luminos în centrul Clujului',
      },
      description: {
        en: 'Compact studio within walking distance of Piața Unirii. Recently renovated, ready to move in.',
        ro: 'Studio compact la câțiva pași de Piața Unirii. Recent renovat, gata de mutare.',
      },
      shortDescription: {
        en: 'Renovated studio near Piața Unirii',
        ro: 'Studio renovat lângă Piața Unirii',
      },
      price: 68_500,
      type: PropertyType.apartment,
      city: 'Cluj-Napoca',
      citySlug: 'cluj-napoca',
      neighborhood: 'Centru',
      address: { en: 'Str. Iuliu Maniu 12, Cluj-Napoca', ro: 'Str. Iuliu Maniu 12, Cluj-Napoca' },
      lat: 46.7692,
      lng: 23.5892,
      bedrooms: 1,
      bathrooms: 1,
      area: 32,
      floors: 4,
      yearBuilt: 1972,
      floor: 2,
      furnishing: Furnishing.semi_furnished,
      material: ConstructionMaterial.brick,
      condition: PropertyCondition.renovated,
      sellerType: SellerType.private_seller,
      hasBalcony: true,
      hasElevator: false,
      hasAC: true,
      isNew: true,
      images: [stockImage('photo-1502672260266-1c1ef2d93688'), stockImage('photo-1484154218962-a197022b5858')],
    },
    {
      slug: 'reveria-2cam-marasti-cluj',
      title: {
        en: 'Two-room apartment in Mărăști',
        ro: 'Apartament cu 2 camere în Mărăști',
      },
      description: {
        en: 'Well-kept 2-room apartment near the Iulius Mall. Tenant-friendly layout and private parking.',
        ro: 'Apartament îngrijit cu 2 camere, lângă Iulius Mall. Plan bine gândit și parcare privată.',
      },
      shortDescription: {
        en: '2 rooms, parking, near Iulius Mall',
        ro: '2 camere, parcare, lângă Iulius Mall',
      },
      price: 118_000,
      type: PropertyType.apartment,
      city: 'Cluj-Napoca',
      citySlug: 'cluj-napoca',
      neighborhood: 'Mărăști',
      address: { en: 'Str. Dorobanților 102, Cluj-Napoca', ro: 'Str. Dorobanților 102, Cluj-Napoca' },
      lat: 46.7723,
      lng: 23.6187,
      bedrooms: 2,
      bathrooms: 1,
      area: 52,
      floors: 10,
      yearBuilt: 1985,
      floor: 5,
      furnishing: Furnishing.furnished,
      material: ConstructionMaterial.concrete,
      condition: PropertyCondition.good,
      sellerType: SellerType.agency,
      hasBalcony: true,
      hasParking: true,
      hasElevator: true,
      hasAC: true,
      images: [stockImage('photo-1522708323590-d24dbb6b0267'), stockImage('photo-1560448204-e02f11c3d0e2')],
    },
    {
      slug: 'reveria-3cam-grigorescu-cluj',
      title: {
        en: 'Three-room apartment in Grigorescu',
        ro: 'Apartament cu 3 camere în Grigorescu',
      },
      description: {
        en: 'Family-sized apartment in a quiet residential pocket, close to Parcul Detunata and schools.',
        ro: 'Apartament potrivit pentru familie, într-o zonă liniștită, aproape de Parcul Detunata și școli.',
      },
      shortDescription: { en: 'Family-friendly, quiet neighborhood', ro: 'Potrivit pentru familie, zonă liniștită' },
      price: 189_900,
      type: PropertyType.apartment,
      city: 'Cluj-Napoca',
      citySlug: 'cluj-napoca',
      neighborhood: 'Grigorescu',
      address: { en: 'Str. Donath 45, Cluj-Napoca', ro: 'Str. Donath 45, Cluj-Napoca' },
      lat: 46.7761,
      lng: 23.5573,
      bedrooms: 3,
      bathrooms: 2,
      area: 78,
      floors: 4,
      yearBuilt: 2008,
      floor: 3,
      furnishing: Furnishing.unfurnished,
      material: ConstructionMaterial.brick,
      condition: PropertyCondition.good,
      sellerType: SellerType.agency,
      hasBalcony: true,
      hasParking: true,
      hasElevator: true,
      hasAC: false,
      featured: true,
      images: [stockImage('photo-1493809842364-78817add7ffb'), stockImage('photo-1505843513577-22bb7d21e455')],
    },

    // ─── Timișoara ──────────────────────────────────────────
    {
      slug: 'reveria-studio-iosefin-timisoara',
      title: {
        en: 'Studio in historic Iosefin, Timișoara',
        ro: 'Studio în cartierul istoric Iosefin, Timișoara',
      },
      description: {
        en: 'Charming studio in a period building with high ceilings and original mouldings.',
        ro: 'Studio cu farmec într-o clădire de epocă, cu tavane înalte și ornamente originale.',
      },
      shortDescription: { en: 'Period building, high ceilings', ro: 'Clădire de epocă, tavane înalte' },
      price: 62_000,
      type: PropertyType.apartment,
      city: 'Timișoara',
      citySlug: 'timisoara',
      neighborhood: 'Iosefin',
      address: { en: 'Bd. 16 Decembrie 1989 24, Timișoara', ro: 'Bd. 16 Decembrie 1989 24, Timișoara' },
      lat: 45.7475,
      lng: 21.2163,
      bedrooms: 1,
      bathrooms: 1,
      area: 35,
      floors: 2,
      yearBuilt: 1908,
      floor: 1,
      furnishing: Furnishing.semi_furnished,
      material: ConstructionMaterial.brick,
      condition: PropertyCondition.needs_renovation,
      sellerType: SellerType.private_seller,
      hasBalcony: false,
      hasAC: false,
      images: [stockImage('photo-1493809842364-78817add7ffb')],
    },
    {
      slug: 'reveria-2cam-complex-timisoara',
      title: {
        en: 'New 2-room apartment in Timișoara',
        ro: 'Apartament nou cu 2 camere în Timișoara',
      },
      description: {
        en: 'Brand-new unit in a residential complex with underground parking and green courtyard.',
        ro: 'Unitate complet nouă, într-un complex rezidențial, cu parcare subterană și curte verde.',
      },
      shortDescription: { en: 'New build, underground parking', ro: 'Construcție nouă, parcare subterană' },
      price: 145_000,
      type: PropertyType.apartment,
      city: 'Timișoara',
      citySlug: 'timisoara',
      neighborhood: 'Cetate',
      address: { en: 'Str. Aurelianus 8, Timișoara', ro: 'Str. Aurelianus 8, Timișoara' },
      lat: 45.7552,
      lng: 21.2259,
      bedrooms: 2,
      bathrooms: 1,
      area: 58,
      floors: 6,
      yearBuilt: 2024,
      floor: 3,
      furnishing: Furnishing.unfurnished,
      material: ConstructionMaterial.brick,
      condition: PropertyCondition.new_build,
      sellerType: SellerType.developer,
      hasBalcony: true,
      hasParking: true,
      hasElevator: true,
      hasAC: true,
      featured: true,
      isNew: true,
      images: [stockImage('photo-1507089947368-19c1da9775ae'), stockImage('photo-1600585154340-be6161a56a0c')],
    },
    {
      slug: 'reveria-casa-ghiroda-timisoara',
      title: {
        en: 'House with garden in Ghiroda',
        ro: 'Casă cu grădină în Ghiroda',
      },
      description: {
        en: 'Detached family house on a 400 m² plot with a south-facing garden, 10 minutes from the city centre.',
        ro: 'Casă individuală pe un teren de 400 m² cu grădină orientată sud, la 10 minute de centru.',
      },
      shortDescription: { en: 'Detached house, 400 m² garden', ro: 'Casă individuală, grădină 400 m²' },
      price: 289_000,
      type: PropertyType.house,
      city: 'Timișoara',
      citySlug: 'timisoara',
      neighborhood: 'Ghiroda',
      address: { en: 'Str. Pădurii 41, Ghiroda, Timișoara', ro: 'Str. Pădurii 41, Ghiroda, Timișoara' },
      lat: 45.7839,
      lng: 21.2894,
      bedrooms: 3,
      bathrooms: 2,
      area: 120,
      landArea: 400,
      floors: 2,
      yearBuilt: 2012,
      furnishing: Furnishing.unfurnished,
      material: ConstructionMaterial.brick,
      condition: PropertyCondition.good,
      sellerType: SellerType.agency,
      hasParking: true,
      hasAC: true,
      images: [stockImage('photo-1600585154340-be6161a56a0c'), stockImage('photo-1613490493576-7fde63acd811')],
    },

    // ─── Brașov ─────────────────────────────────────────────
    {
      slug: 'reveria-studio-centru-brasov',
      title: {
        en: 'Studio near the old town of Brașov',
        ro: 'Studio lângă centrul vechi din Brașov',
      },
      description: {
        en: 'Cozy studio two blocks from Piața Sfatului, ideal as a first home or rental.',
        ro: 'Studio primitor la două străzi de Piața Sfatului, ideal ca prima locuință sau pentru închiriere.',
      },
      shortDescription: { en: 'Two blocks from Piața Sfatului', ro: 'La două străzi de Piața Sfatului' },
      price: 74_500,
      type: PropertyType.apartment,
      city: 'Brașov',
      citySlug: 'brasov',
      neighborhood: 'Centrul Vechi',
      address: { en: 'Str. Republicii 18, Brașov', ro: 'Str. Republicii 18, Brașov' },
      lat: 45.6434,
      lng: 25.5896,
      bedrooms: 1,
      bathrooms: 1,
      area: 34,
      floors: 3,
      yearBuilt: 1960,
      floor: 2,
      furnishing: Furnishing.furnished,
      material: ConstructionMaterial.brick,
      condition: PropertyCondition.renovated,
      sellerType: SellerType.private_seller,
      hasBalcony: false,
      hasAC: true,
      images: [stockImage('photo-1505693416388-ac5ce068fe85')],
    },
    {
      slug: 'reveria-3cam-astra-brasov',
      title: {
        en: 'Three-room apartment in Astra, Brașov',
        ro: 'Apartament cu 3 camere în Astra, Brașov',
      },
      description: {
        en: 'Comfortable 3-room apartment in a family neighbourhood with parks and schools nearby.',
        ro: 'Apartament confortabil cu 3 camere, într-un cartier cu parcuri și școli în apropiere.',
      },
      shortDescription: { en: 'Family neighbourhood, near parks', ro: 'Cartier de familie, aproape de parcuri' },
      price: 138_000,
      type: PropertyType.apartment,
      city: 'Brașov',
      citySlug: 'brasov',
      neighborhood: 'Astra',
      address: { en: 'Str. Saturn 22, Brașov', ro: 'Str. Saturn 22, Brașov' },
      lat: 45.6232,
      lng: 25.5831,
      bedrooms: 3,
      bathrooms: 1,
      area: 68,
      floors: 10,
      yearBuilt: 1988,
      floor: 4,
      furnishing: Furnishing.semi_furnished,
      material: ConstructionMaterial.concrete,
      condition: PropertyCondition.good,
      sellerType: SellerType.agency,
      hasBalcony: true,
      hasParking: true,
      hasElevator: true,
      hasAC: false,
      images: [stockImage('photo-1502672260266-1c1ef2d93688'), stockImage('photo-1560448204-e02f11c3d0e2')],
    },
    {
      slug: 'reveria-casa-sacele-brasov',
      title: {
        en: 'House with mountain view near Săcele',
        ro: 'Casă cu vedere la munte lângă Săcele',
      },
      description: {
        en: 'Three-bedroom house on a quiet street, with terrace facing the Carpathians.',
        ro: 'Casă cu trei dormitoare, pe o stradă liniștită, cu terasă orientată spre Carpați.',
      },
      shortDescription: { en: 'Carpathian view, terrace', ro: 'Vedere spre Carpați, terasă' },
      price: 325_000,
      type: PropertyType.house,
      city: 'Brașov',
      citySlug: 'brasov',
      neighborhood: 'Săcele',
      address: { en: 'Str. Viitorului 7, Săcele, Brașov', ro: 'Str. Viitorului 7, Săcele, Brașov' },
      lat: 45.6166,
      lng: 25.6997,
      bedrooms: 3,
      bathrooms: 2,
      area: 135,
      landArea: 500,
      floors: 2,
      yearBuilt: 2015,
      furnishing: Furnishing.unfurnished,
      material: ConstructionMaterial.brick,
      condition: PropertyCondition.good,
      sellerType: SellerType.private_seller,
      hasParking: true,
      hasAC: true,
      featured: true,
      images: [stockImage('photo-1568605114967-8130f3a36994'), stockImage('photo-1600607687939-ce8a6c25118c')],
    },

    // ─── Sibiu ──────────────────────────────────────────────
    {
      slug: 'reveria-studio-centru-sibiu',
      title: {
        en: 'Studio in Sibiu upper town',
        ro: 'Studio în orașul de sus din Sibiu',
      },
      description: {
        en: 'Characterful studio steps away from Piața Mare. Original wooden floors, recently rewired.',
        ro: 'Studio cu caracter, la câțiva pași de Piața Mare. Podele originale din lemn, instalație electrică refăcută.',
      },
      shortDescription: { en: 'Near Piața Mare, renovated', ro: 'Lângă Piața Mare, renovat' },
      price: 69_900,
      type: PropertyType.apartment,
      city: 'Sibiu',
      citySlug: 'sibiu',
      neighborhood: 'Orașul de Sus',
      address: { en: 'Str. Nicolae Bălcescu 14, Sibiu', ro: 'Str. Nicolae Bălcescu 14, Sibiu' },
      lat: 45.7972,
      lng: 24.1528,
      bedrooms: 1,
      bathrooms: 1,
      area: 38,
      floors: 3,
      yearBuilt: 1930,
      floor: 2,
      furnishing: Furnishing.furnished,
      material: ConstructionMaterial.brick,
      condition: PropertyCondition.renovated,
      sellerType: SellerType.agency,
      hasAC: false,
      isNew: true,
      images: [stockImage('photo-1507089947368-19c1da9775ae')],
    },
    {
      slug: 'reveria-2cam-vasile-aaron-sibiu',
      title: {
        en: 'Two-room flat in Vasile Aaron, Sibiu',
        ro: 'Apartament cu 2 camere în Vasile Aaron, Sibiu',
      },
      description: {
        en: 'Practical 2-room flat with thermal insulation, close to supermarkets and public transport.',
        ro: 'Apartament practic cu 2 camere, cu termosistem, aproape de supermarket-uri și transport în comun.',
      },
      shortDescription: { en: 'Insulated, well-connected', ro: 'Termoizolat, bine conectat' },
      price: 92_000,
      type: PropertyType.apartment,
      city: 'Sibiu',
      citySlug: 'sibiu',
      neighborhood: 'Vasile Aaron',
      address: { en: 'Str. Henri Coandă 30, Sibiu', ro: 'Str. Henri Coandă 30, Sibiu' },
      lat: 45.7811,
      lng: 24.1604,
      bedrooms: 2,
      bathrooms: 1,
      area: 48,
      floors: 10,
      yearBuilt: 1982,
      floor: 6,
      furnishing: Furnishing.semi_furnished,
      material: ConstructionMaterial.concrete,
      condition: PropertyCondition.good,
      sellerType: SellerType.private_seller,
      hasBalcony: true,
      hasElevator: true,
      hasAC: true,
      images: [stockImage('photo-1522708323590-d24dbb6b0267')],
    },
    {
      slug: 'reveria-casa-cisnadie-sibiu',
      title: {
        en: 'Family house in Cisnădie',
        ro: 'Casă de familie în Cisnădie',
      },
      description: {
        en: 'Four-bedroom house with garden and garage, perfect for a family moving out of Sibiu centre.',
        ro: 'Casă cu patru dormitoare, grădină și garaj, potrivită pentru o familie care se mută din centrul Sibiului.',
      },
      shortDescription: { en: '4 bedrooms, garden, garage', ro: '4 dormitoare, grădină, garaj' },
      price: 249_000,
      type: PropertyType.house,
      city: 'Sibiu',
      citySlug: 'sibiu',
      neighborhood: 'Cisnădie',
      address: { en: 'Str. Cetății 22, Cisnădie, Sibiu', ro: 'Str. Cetății 22, Cisnădie, Sibiu' },
      lat: 45.7100,
      lng: 24.1470,
      bedrooms: 4,
      bathrooms: 2,
      area: 140,
      landArea: 450,
      floors: 2,
      yearBuilt: 2005,
      furnishing: Furnishing.unfurnished,
      material: ConstructionMaterial.brick,
      condition: PropertyCondition.good,
      sellerType: SellerType.agency,
      hasParking: true,
      hasAC: true,
      images: [stockImage('photo-1600585154340-be6161a56a0c'), stockImage('photo-1613490493576-7fde63acd811')],
    },

    // ─── Oradea ─────────────────────────────────────────────
    {
      slug: 'reveria-studio-centru-oradea',
      title: {
        en: 'Studio in Oradea city centre',
        ro: 'Studio în centrul Oradiei',
      },
      description: {
        en: 'Freshly painted studio, walking distance to the Art Nouveau palaces.',
        ro: 'Studio proaspăt zugrăvit, la câțiva pași de palatele Art Nouveau.',
      },
      shortDescription: { en: 'Walk to Art Nouveau centre', ro: 'La pas de centrul Art Nouveau' },
      price: 59_000,
      type: PropertyType.apartment,
      city: 'Oradea',
      citySlug: 'oradea',
      neighborhood: 'Centru',
      address: { en: 'Str. Republicii 9, Oradea', ro: 'Str. Republicii 9, Oradea' },
      lat: 47.0525,
      lng: 21.9280,
      bedrooms: 1,
      bathrooms: 1,
      area: 30,
      floors: 3,
      yearBuilt: 1955,
      floor: 2,
      furnishing: Furnishing.semi_furnished,
      material: ConstructionMaterial.brick,
      condition: PropertyCondition.renovated,
      sellerType: SellerType.private_seller,
      hasBalcony: true,
      images: [stockImage('photo-1484154218962-a197022b5858')],
    },
    {
      slug: 'reveria-3cam-rogerius-oradea',
      title: {
        en: 'Three-room apartment in Rogerius',
        ro: 'Apartament cu 3 camere în Rogerius',
      },
      description: {
        en: 'Spacious 3-room flat with two balconies, recent thermal insulation on the building.',
        ro: 'Apartament spațios cu 3 camere și două balcoane, bloc termoizolat recent.',
      },
      shortDescription: { en: '3 rooms, 2 balconies', ro: '3 camere, 2 balcoane' },
      price: 99_500,
      type: PropertyType.apartment,
      city: 'Oradea',
      citySlug: 'oradea',
      neighborhood: 'Rogerius',
      address: { en: 'Str. Transilvaniei 41, Oradea', ro: 'Str. Transilvaniei 41, Oradea' },
      lat: 47.0733,
      lng: 21.9122,
      bedrooms: 3,
      bathrooms: 1,
      area: 70,
      floors: 10,
      yearBuilt: 1978,
      floor: 5,
      furnishing: Furnishing.semi_furnished,
      material: ConstructionMaterial.concrete,
      condition: PropertyCondition.good,
      sellerType: SellerType.agency,
      hasBalcony: true,
      hasElevator: true,
      hasAC: true,
      images: [stockImage('photo-1493809842364-78817add7ffb')],
    },
    {
      slug: 'reveria-casa-episcopia-oradea',
      title: {
        en: 'New-build house in Episcopia, Oradea',
        ro: 'Casă nouă în Episcopia, Oradea',
      },
      description: {
        en: 'Newly finished 3-bedroom house with fenced plot and open-plan living area.',
        ro: 'Casă nouă cu 3 dormitoare, teren împrejmuit și living open-space.',
      },
      shortDescription: { en: 'New build, 3 bedrooms', ro: 'Construcție nouă, 3 dormitoare' },
      price: 219_000,
      type: PropertyType.house,
      city: 'Oradea',
      citySlug: 'oradea',
      neighborhood: 'Episcopia',
      address: { en: 'Str. Matei Corvin 14, Oradea', ro: 'Str. Matei Corvin 14, Oradea' },
      lat: 47.0903,
      lng: 21.9365,
      bedrooms: 3,
      bathrooms: 2,
      area: 115,
      landArea: 380,
      floors: 2,
      yearBuilt: 2024,
      furnishing: Furnishing.unfurnished,
      material: ConstructionMaterial.brick,
      condition: PropertyCondition.new_build,
      sellerType: SellerType.developer,
      hasParking: true,
      hasAC: true,
      featured: true,
      isNew: true,
      images: [stockImage('photo-1600607687939-ce8a6c25118c'), stockImage('photo-1600596542815-ffad4c1539a9')],
    },

    // ─── Târgu Mureș ────────────────────────────────────────
    {
      slug: 'reveria-studio-centru-targu-mures',
      title: {
        en: 'Studio near Piața Trandafirilor',
        ro: 'Studio lângă Piața Trandafirilor',
      },
      description: {
        en: 'Compact studio in the heart of Târgu Mureș, minutes from the Palace of Culture and the rose-lined central square.',
        ro: 'Studio compact în inima Târgu Mureșului, la câțiva pași de Palatul Culturii și Piața Trandafirilor.',
      },
      shortDescription: { en: 'Central, near Palatul Culturii', ro: 'Central, lângă Palatul Culturii' },
      price: 64_000,
      type: PropertyType.apartment,
      city: 'Târgu Mureș',
      citySlug: 'targu-mures',
      neighborhood: 'Centru',
      address: { en: 'Str. Avram Iancu 7, Târgu Mureș', ro: 'Str. Avram Iancu 7, Târgu Mureș' },
      lat: 46.5465,
      lng: 24.5620,
      bedrooms: 1,
      bathrooms: 1,
      area: 34,
      floors: 4,
      yearBuilt: 1968,
      floor: 3,
      furnishing: Furnishing.semi_furnished,
      material: ConstructionMaterial.brick,
      condition: PropertyCondition.renovated,
      sellerType: SellerType.private_seller,
      hasBalcony: true,
      hasAC: true,
      isNew: true,
      images: [stockImage('photo-1502672260266-1c1ef2d93688'), stockImage('photo-1484154218962-a197022b5858')],
    },
    {
      slug: 'reveria-2cam-tudor-targu-mures',
      title: {
        en: 'Two-room apartment in Tudor Vladimirescu',
        ro: 'Apartament cu 2 camere în Tudor Vladimirescu',
      },
      description: {
        en: 'Well-insulated 2-room flat on a quiet side street, close to supermarkets and tram stops.',
        ro: 'Apartament cu 2 camere bine termoizolat, pe o stradă liniștită, aproape de supermarket-uri și stațiile de tramvai.',
      },
      shortDescription: { en: 'Insulated, tram-served', ro: 'Termoizolat, cu tramvai' },
      price: 95_000,
      type: PropertyType.apartment,
      city: 'Târgu Mureș',
      citySlug: 'targu-mures',
      neighborhood: 'Tudor Vladimirescu',
      address: { en: 'Bd. 1848 nr. 62, Târgu Mureș', ro: 'Bd. 1848 nr. 62, Târgu Mureș' },
      lat: 46.5531,
      lng: 24.5792,
      bedrooms: 2,
      bathrooms: 1,
      area: 54,
      floors: 10,
      yearBuilt: 1984,
      floor: 4,
      furnishing: Furnishing.furnished,
      material: ConstructionMaterial.concrete,
      condition: PropertyCondition.good,
      sellerType: SellerType.agency,
      hasBalcony: true,
      hasParking: true,
      hasElevator: true,
      hasAC: true,
      images: [stockImage('photo-1522708323590-d24dbb6b0267'), stockImage('photo-1560448204-e02f11c3d0e2')],
    },
    {
      slug: 'reveria-casa-livezeni-targu-mures',
      title: {
        en: 'Family house in Livezeni',
        ro: 'Casă de familie în Livezeni',
      },
      description: {
        en: 'Three-bedroom detached house on a 450 m² plot, 10 minutes from the Palace of Culture.',
        ro: 'Casă individuală cu trei dormitoare, pe un teren de 450 m², la 10 minute de Palatul Culturii.',
      },
      shortDescription: { en: 'Detached, 450 m² plot', ro: 'Individuală, teren 450 m²' },
      price: 245_000,
      type: PropertyType.house,
      city: 'Târgu Mureș',
      citySlug: 'targu-mures',
      neighborhood: 'Livezeni',
      address: { en: 'Str. Muncii 14, Livezeni, Târgu Mureș', ro: 'Str. Muncii 14, Livezeni, Târgu Mureș' },
      lat: 46.5202,
      lng: 24.5488,
      bedrooms: 3,
      bathrooms: 2,
      area: 128,
      landArea: 450,
      floors: 2,
      yearBuilt: 2014,
      furnishing: Furnishing.unfurnished,
      material: ConstructionMaterial.brick,
      condition: PropertyCondition.good,
      sellerType: SellerType.agency,
      hasParking: true,
      hasAC: true,
      featured: true,
      images: [stockImage('photo-1600585154340-be6161a56a0c'), stockImage('photo-1613490493576-7fde63acd811')],
    },

    // ─── Reghin ─────────────────────────────────────────────
    {
      slug: 'reveria-studio-centru-reghin',
      title: {
        en: 'Studio in central Reghin',
        ro: 'Studio în centrul Reghinului',
      },
      description: {
        en: 'Neat studio a short walk from the Evangelical church and the central market.',
        ro: 'Studio îngrijit, la câțiva pași de biserica evanghelică și piața centrală.',
      },
      shortDescription: { en: 'Walk to Evangelical church', ro: 'La pas de biserica evanghelică' },
      price: 48_000,
      type: PropertyType.apartment,
      city: 'Reghin',
      citySlug: 'reghin',
      neighborhood: 'Centru',
      address: { en: 'Str. Petru Maior 8, Reghin', ro: 'Str. Petru Maior 8, Reghin' },
      lat: 46.7770,
      lng: 24.7075,
      bedrooms: 1,
      bathrooms: 1,
      area: 31,
      floors: 3,
      yearBuilt: 1972,
      floor: 2,
      furnishing: Furnishing.semi_furnished,
      material: ConstructionMaterial.brick,
      condition: PropertyCondition.renovated,
      sellerType: SellerType.private_seller,
      hasBalcony: true,
      images: [stockImage('photo-1502672260266-1c1ef2d93688')],
    },
    {
      slug: 'reveria-2cam-apalina-reghin',
      title: {
        en: 'Two-room apartment in Apalina',
        ro: 'Apartament cu 2 camere în Apalina',
      },
      description: {
        en: 'Quiet 2-room flat in a residential pocket, close to schools and the Mureș riverbank promenade.',
        ro: 'Apartament liniștit cu 2 camere, într-o zonă rezidențială, aproape de școli și de promenada de pe malul Mureșului.',
      },
      shortDescription: { en: 'Quiet, near the Mureș', ro: 'Liniștit, aproape de Mureș' },
      price: 72_000,
      type: PropertyType.apartment,
      city: 'Reghin',
      citySlug: 'reghin',
      neighborhood: 'Apalina',
      address: { en: 'Str. Apalinei 22, Reghin', ro: 'Str. Apalinei 22, Reghin' },
      lat: 46.7695,
      lng: 24.6842,
      bedrooms: 2,
      bathrooms: 1,
      area: 50,
      floors: 4,
      yearBuilt: 1980,
      floor: 2,
      furnishing: Furnishing.furnished,
      material: ConstructionMaterial.concrete,
      condition: PropertyCondition.good,
      sellerType: SellerType.agency,
      hasBalcony: true,
      hasParking: true,
      hasAC: true,
      images: [stockImage('photo-1522708323590-d24dbb6b0267')],
    },
    {
      slug: 'reveria-casa-iernuteni-reghin',
      title: {
        en: 'Family house in Iernuțeni',
        ro: 'Casă de familie în Iernuțeni',
      },
      description: {
        en: 'Three-bedroom detached house on a 380 m² plot, close to the forest edge and Gliga workshops.',
        ro: 'Casă individuală cu trei dormitoare, pe un teren de 380 m², aproape de liziera pădurii și atelierele Gliga.',
      },
      shortDescription: { en: 'Detached, near Gliga workshops', ro: 'Individuală, lângă Gliga' },
      price: 165_000,
      type: PropertyType.house,
      city: 'Reghin',
      citySlug: 'reghin',
      neighborhood: 'Iernuțeni',
      address: { en: 'Str. Iernuțenilor 11, Reghin', ro: 'Str. Iernuțenilor 11, Reghin' },
      lat: 46.7922,
      lng: 24.7154,
      bedrooms: 3,
      bathrooms: 2,
      area: 118,
      landArea: 380,
      floors: 2,
      yearBuilt: 2010,
      furnishing: Furnishing.unfurnished,
      material: ConstructionMaterial.brick,
      condition: PropertyCondition.good,
      sellerType: SellerType.private_seller,
      hasParking: true,
      hasAC: true,
      images: [stockImage('photo-1600585154340-be6161a56a0c')],
    },

    // ─── Târnăveni ──────────────────────────────────────────
    {
      slug: 'reveria-studio-centru-tarnaveni',
      title: {
        en: 'Studio in central Târnăveni',
        ro: 'Studio în centrul Târnăveniului',
      },
      description: {
        en: 'Compact studio by the Art Deco town hall, newly painted and ready to move in.',
        ro: 'Studio compact, lângă primăria în stil Art Deco, proaspăt zugrăvit și gata de mutare.',
      },
      shortDescription: { en: 'Near Art Deco town hall', ro: 'Lângă primăria Art Deco' },
      price: 42_000,
      type: PropertyType.apartment,
      city: 'Târnăveni',
      citySlug: 'tarnaveni',
      neighborhood: 'Centru',
      address: { en: 'Piața Primăriei 4, Târnăveni', ro: 'Piața Primăriei 4, Târnăveni' },
      lat: 46.3330,
      lng: 24.2870,
      bedrooms: 1,
      bathrooms: 1,
      area: 28,
      floors: 3,
      yearBuilt: 1970,
      floor: 2,
      furnishing: Furnishing.semi_furnished,
      material: ConstructionMaterial.brick,
      condition: PropertyCondition.renovated,
      sellerType: SellerType.private_seller,
      hasBalcony: false,
      hasAC: true,
      isNew: true,
      images: [stockImage('photo-1484154218962-a197022b5858')],
    },
    {
      slug: 'reveria-2cam-botorca-tarnaveni',
      title: {
        en: 'Two-room flat in Botorca',
        ro: 'Apartament cu 2 camere în Botorca',
      },
      description: {
        en: 'Practical 2-room flat in a 1970s block, recently insulated and close to the industrial park for commuters.',
        ro: 'Apartament practic cu 2 camere, într-un bloc din anii 70, recent termoizolat, aproape de parcul industrial.',
      },
      shortDescription: { en: 'Insulated, commuter-friendly', ro: 'Termoizolat, pentru navetiști' },
      price: 58_000,
      type: PropertyType.apartment,
      city: 'Târnăveni',
      citySlug: 'tarnaveni',
      neighborhood: 'Botorca',
      address: { en: 'Str. Republicii 71, Târnăveni', ro: 'Str. Republicii 71, Târnăveni' },
      lat: 46.3421,
      lng: 24.2958,
      bedrooms: 2,
      bathrooms: 1,
      area: 46,
      floors: 4,
      yearBuilt: 1978,
      floor: 3,
      furnishing: Furnishing.semi_furnished,
      material: ConstructionMaterial.concrete,
      condition: PropertyCondition.good,
      sellerType: SellerType.agency,
      hasBalcony: true,
      hasParking: true,
      hasElevator: false,
      images: [stockImage('photo-1493809842364-78817add7ffb')],
    },
    {
      slug: 'reveria-casa-bobohalma-tarnaveni',
      title: {
        en: 'House in Bobohalma',
        ro: 'Casă în Bobohalma',
      },
      description: {
        en: 'Detached house with a generous garden on the outskirts of Târnăveni, 10 minutes from the town centre.',
        ro: 'Casă individuală cu grădină generoasă la marginea Târnăveniului, la 10 minute de centru.',
      },
      shortDescription: { en: 'Garden house, edge of town', ro: 'Casă cu grădină, la margine' },
      price: 128_000,
      type: PropertyType.house,
      city: 'Târnăveni',
      citySlug: 'tarnaveni',
      neighborhood: 'Bobohalma',
      address: { en: 'Str. Bobohalmei 9, Târnăveni', ro: 'Str. Bobohalmei 9, Târnăveni' },
      lat: 46.3225,
      lng: 24.3056,
      bedrooms: 3,
      bathrooms: 1,
      area: 96,
      landArea: 520,
      floors: 1,
      yearBuilt: 1998,
      furnishing: Furnishing.unfurnished,
      material: ConstructionMaterial.brick,
      condition: PropertyCondition.good,
      sellerType: SellerType.private_seller,
      hasParking: true,
      images: [stockImage('photo-1600607687939-ce8a6c25118c')],
    },
  ];
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
