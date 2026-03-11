import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  properties,
  developers,
  cities,
  testimonials,
} from '@tge/data';

const prisma = new PrismaClient();

const developerCoverImages: Record<string, string> = {
  'studium-green':
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80',
  'maurer-imobiliare':
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&q=80',
  'west-residential':
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1920&q=80',
  'impact-developer':
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&q=80',
};

const developerTaglines: Record<string, { en: string; ro: string }> = {
  'studium-green': {
    en: 'Sustainable luxury, timeless design',
    ro: 'Lux sustenabil, design atemporal',
  },
  'maurer-imobiliare': {
    en: "Building tomorrow's heritage today",
    ro: 'Construim patrimoniul de mâine, astăzi',
  },
  'west-residential': {
    en: 'Where architecture meets artistry',
    ro: 'Unde arhitectura întâlnește arta',
  },
  'impact-developer': {
    en: 'Redefining urban living',
    ro: 'Redefinim viața urbană',
  },
};

async function main() {
  console.log('Starting database seed...');

  // 1. Create default admin user
  const adminPassword = await bcrypt.hash('admin123!', 12);
  await prisma.adminUser.upsert({
    where: { email: 'admin@tge.ro' },
    update: {},
    create: {
      email: 'admin@tge.ro',
      passwordHash: adminPassword,
      name: 'Admin User',
      role: AdminRole.SUPER_ADMIN,
    },
  });
  console.log('  Admin user created: admin@tge.ro / admin123!');

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

  // 3. Seed cities
  for (const city of cities) {
    await prisma.city.upsert({
      where: { slug: city.slug },
      update: {
        image: city.image,
      },
      create: {
        name: city.name,
        slug: city.slug,
        description: city.description,
        image: city.image,
        propertyCount: city.propertyCount,
      },
    });
  }
  console.log(`  ${cities.length} cities seeded`);

  // 4. Seed properties with images (clear existing to ensure developer assignments)
  await prisma.propertyImage.deleteMany({});
  await prisma.property.deleteMany({});
  for (const prop of properties) {
    // Map static developer ID to database UUID
    const developerId = prop.developerId
      ? developerIdMap.get(prop.developerId) ?? null
      : null;

    await prisma.property.upsert({
      where: { slug: prop.slug },
      update: {},
      create: {
        slug: prop.slug,
        title: prop.title,
        description: prop.description,
        shortDescription: prop.shortDescription,
        price: prop.price,
        currency: prop.currency,
        type: prop.type as any,
        status: prop.status as any,
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

  // 5. Seed testimonials
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

  // 6. Seed site config
  const siteConfigData = {
    name: 'Transylvania Grand Estate',
    tagline: {
      en: "Romania's Premier Luxury Real Estate Consultancy",
      ro: 'Consultanta Imobiliara de Lux Premier din Romania',
    },
    description: {
      en: "Discover exceptional luxury properties across Romania's most prestigious addresses. Villas, mansions, and estates from €1M+.",
      ro: 'Descoperiti proprietati de lux exceptionale in cele mai prestigioase adrese din Romania. Vile, conace si domenii de la €1M+.',
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

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
