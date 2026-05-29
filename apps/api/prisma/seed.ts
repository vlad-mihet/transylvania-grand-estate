import {
  PrismaClient,
  AdminRole,
  Brand,
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
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import {
  properties,
  developers,
  agents,
  cities,
  counties,
  neighborhoods,
  testimonials,
  articles,
  academyCourses,
} from "@tge/data";

/**
 * Set SEED_RESET=true to blow away properties + images before re-seeding.
 * Off by default so re-running seed doesn't delete manually-added listings.
 */
const SEED_RESET = process.env.SEED_RESET === "true";

/**
 * Skip the dev/QA admin-user fixtures (admin@/editor@/agent@transylvaniagrandestate.ro) when
 * running against a production database. Prod admin onboarding goes through
 * the deliberate invitation flow once a SUPER_ADMIN exists; silent random-
 * password fixtures here would otherwise pollute prod with unknown-password
 * accounts on every seed run. Set SEED_FORCE_FIXTURES=true to override (e.g.
 * for an initial bootstrap of a fresh prod DB before the invitation flow
 * has anyone to invite from).
 */
const IS_PROD = process.env.NODE_ENV === "production";
const FORCE_FIXTURES = process.env.SEED_FORCE_FIXTURES === "true";
const SEED_USER_FIXTURES = !IS_PROD || FORCE_FIXTURES;

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
  const isFurnished = furnishing === "furnished" || furnishing === "luxury";
  const isSemi = furnishing === "semi_furnished";

  const isApartment = prop.type === "apartment" || prop.type === "penthouse";
  const isHouseLike =
    prop.type === "house" ||
    prop.type === "villa" ||
    prop.type === "estate" ||
    prop.type === "mansion" ||
    prop.type === "palace" ||
    prop.type === "chalet";

  const daysOut = 30 + (h % 61);
  const availabilityDate = new Date();
  availabilityDate.setDate(availabilityDate.getDate() + daysOut);

  return {
    heating,
    ownership: OwnershipType.personal,
    windowType: WindowType.pvc_double,
    availabilityDate,
    hasInteriorStaircase: isHouseLike || prop.type === "penthouse",
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
  "verdalis-residence":
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80",
  "carpathia-imobiliare":
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&q=80",
  "atrium-boutique":
    "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1920&q=80",
  "dacia-construct":
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&q=80",
};

const developerTaglines: Record<string, { en: string; ro: string }> = {
  "verdalis-residence": {
    en: "Sustainable luxury, timeless design",
    ro: "Lux sustenabil, design atemporal",
  },
  "carpathia-imobiliare": {
    en: "Building tomorrow's heritage today",
    ro: "Construim patrimoniul de mâine, astăzi",
  },
  "atrium-boutique": {
    en: "Where architecture meets artistry",
    ro: "Unde arhitectura întâlnește arta",
  },
  "dacia-construct": {
    en: "Redefining urban living",
    ro: "Redefinim viața urbană",
  },
};

async function main() {
  console.log("Starting database seed...");

  // 1. Create default admin user.
  //   SEED_ADMIN_PASSWORD is preferred; otherwise a random one is generated
  //   and printed exactly once so a fresh-cloned dev setup still works.
  //   Re-seeds leave an existing admin alone — the random password is only
  //   logged when we actually created the row, avoiding a misleading
  //   "here's a password that doesn't work" message on subsequent runs.
  //
  //   Skipped on prod (gated by SEED_USER_FIXTURES) so reseeds don't silently
  //   recreate this row with an unknown random password if it ever gets
  //   deleted. Bootstrap a fresh prod DB with SEED_FORCE_FIXTURES=true and
  //   SEED_ADMIN_PASSWORD set to a known value, then unset both before the
  //   next deploy.
  if (!SEED_USER_FIXTURES) {
    console.log(
      "  Skipping admin/editor/agent fixtures (NODE_ENV=production; set SEED_FORCE_FIXTURES=true to override)",
    );
  } else {
    const existingAdmin = await prisma.adminUser.findUnique({
      where: { email: "admin@transylvaniagrandestate.ro" },
      select: { id: true },
    });
    if (!existingAdmin) {
      const envPassword = process.env.SEED_ADMIN_PASSWORD;
      const plainPassword =
        envPassword && envPassword.length > 0
          ? envPassword
          : randomBytes(12).toString("base64url");
      const adminPassword = await bcrypt.hash(plainPassword, 12);
      await prisma.adminUser.create({
        data: {
          email: "admin@transylvaniagrandestate.ro",
          passwordHash: adminPassword,
          name: "Admin User",
          role: AdminRole.SUPER_ADMIN,
        },
      });
      if (envPassword) {
        console.log(
          "  Admin user created: admin@transylvaniagrandestate.ro (password from SEED_ADMIN_PASSWORD)",
        );
      } else {
        console.log(
          `  Admin user created: admin@transylvaniagrandestate.ro / ${plainPassword}`,
        );
        console.log("    ^ random password, set SEED_ADMIN_PASSWORD to pin it");
      }
    } else {
      console.log(
        "  Admin user already exists: admin@transylvaniagrandestate.ro (password unchanged)",
      );
    }

    // 1b. Create default EDITOR fixture so each role is exercisable out of the box.
    const existingEditor = await prisma.adminUser.findUnique({
      where: { email: "editor@transylvaniagrandestate.ro" },
      select: { id: true },
    });
    if (!existingEditor) {
      const envPassword = process.env.SEED_EDITOR_PASSWORD;
      const plainPassword =
        envPassword && envPassword.length > 0
          ? envPassword
          : randomBytes(12).toString("base64url");
      const passwordHash = await bcrypt.hash(plainPassword, 12);
      await prisma.adminUser.create({
        data: {
          email: "editor@transylvaniagrandestate.ro",
          passwordHash,
          name: "Editor User",
          role: AdminRole.EDITOR,
        },
      });
      if (envPassword) {
        console.log(
          "  Editor user created: editor@transylvaniagrandestate.ro (password from SEED_EDITOR_PASSWORD)",
        );
      } else {
        console.log(
          `  Editor user created: editor@transylvaniagrandestate.ro / ${plainPassword}`,
        );
        console.log(
          "    ^ random password, set SEED_EDITOR_PASSWORD to pin it",
        );
      }
    } else {
      console.log(
        "  Editor user already exists: editor@transylvaniagrandestate.ro (password unchanged)",
      );
    }
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

  // 2c. AGENT-role fixture: creates `agent@transylvaniagrandestate.ro` linked to the first seeded
  // Agent. Idempotent — skipped if the email is already registered (whether
  // linked or not) so repeated runs don't flicker the adminUserId. Sister
  // gate to the admin/editor fixtures above — see SEED_USER_FIXTURES.
  const firstAgentId = agentIdMap.values().next().value as string | undefined;
  if (SEED_USER_FIXTURES && firstAgentId) {
    const existingAgentUser = await prisma.adminUser.findUnique({
      where: { email: "agent@transylvaniagrandestate.ro" },
      select: { id: true },
    });
    if (!existingAgentUser) {
      const envPassword = process.env.SEED_AGENT_PASSWORD;
      const plainPassword =
        envPassword && envPassword.length > 0
          ? envPassword
          : randomBytes(12).toString("base64url");
      const passwordHash = await bcrypt.hash(plainPassword, 12);
      const created = await prisma.adminUser.create({
        data: {
          email: "agent@transylvaniagrandestate.ro",
          passwordHash,
          name: "Test Agent",
          role: AdminRole.AGENT,
        },
      });
      await prisma.agent.update({
        where: { id: firstAgentId },
        data: { adminUserId: created.id },
      });
      if (envPassword) {
        console.log(
          "  Agent user created: agent@transylvaniagrandestate.ro (password from SEED_AGENT_PASSWORD)",
        );
      } else {
        console.log(
          `  Agent user created: agent@transylvaniagrandestate.ro / ${plainPassword}`,
        );
        console.log("    ^ random password, set SEED_AGENT_PASSWORD to pin it");
      }
    } else {
      console.log(
        "  Agent user already exists: agent@transylvaniagrandestate.ro (password unchanged)",
      );
    }
  }

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
        `  skipping city ${city.slug}: no matching county for "${city.countySlug ?? "(none)"}"`,
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
    console.log("  [SEED_RESET] properties + images wiped before re-seed");
  }
  for (const prop of properties) {
    // Map static developer ID to database UUID
    const developerId = prop.developerId
      ? (developerIdMap.get(prop.developerId) ?? null)
      : null;

    // Assign agents by city, round-robin within each city's agent pool
    const citySlug = prop.location.citySlug;
    const cityAgents = agentIdsByCity.get(citySlug) ?? [];
    const counter = cityPropertyCounters.get(citySlug) ?? 0;
    const agentId =
      cityAgents.length > 0 ? cityAgents[counter % cityAgents.length] : null;
    cityPropertyCounters.set(citySlug, counter + 1);

    const storia = deriveStoriaFields(prop);

    // Resolve FK ids from the denormalized slug / name. These feed the new
    // cityRef/neighborhoodRef relations; the string columns below keep
    // working for any code that hasn't migrated yet.
    const cityId = cityIdBySlug.get(citySlug) ?? null;
    const neighborhoodId = cityId
      ? ((
          await prisma.neighborhood.findFirst({
            where: {
              cityId,
              name: {
                equals: prop.location.neighborhood,
                mode: "insensitive",
              },
            },
            select: { id: true },
          })
        )?.id ?? null)
      : null;

    const row = await prisma.property.upsert({
      where: { slug: prop.slug },
      update: {
        // Re-assert source copy so new translations (fr/de) land on existing
        // rows — nested image alt is synced separately below.
        title: prop.title,
        description: prop.description,
        shortDescription: prop.shortDescription,
        address: prop.location.address,
        features: prop.features as any,
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
      select: { id: true },
    });
    // Keep image alt translations in sync (nested create only runs on first insert).
    for (const [index, img] of prop.images.entries()) {
      await prisma.propertyImage.updateMany({
        where: { propertyId: row.id, sortOrder: index },
        data: { alt: img.alt },
      });
    }
  }
  console.log(`  ${properties.length} properties seeded`);

  // 4b. Seed Revery (affordable) properties. These live in the same table
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
      ? ((
          await prisma.neighborhood.findFirst({
            where: {
              cityId,
              name: { equals: ap.neighborhood, mode: "insensitive" },
            },
            select: { id: true },
          })
        )?.id ?? null)
      : null;

    const row = await prisma.property.upsert({
      where: { slug: ap.slug },
      update: {
        // Re-assert source copy so new translations (fr/de) land on existing rows.
        title: ap.title,
        description: ap.description,
        shortDescription: ap.shortDescription,
        address: ap.address,
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
        currency: "EUR",
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
        agentId: (agentIdsByCity.get(ap.citySlug) ?? [])[0] ?? null,
        images: {
          create: ap.images.map((src, index) => ({
            src,
            alt: {
              en: `${ap.title.en} — photo ${index + 1}`,
              ro: `${ap.title.ro} — fotografia ${index + 1}`,
              fr: `${ap.title.fr} — photo ${index + 1}`,
              de: `${ap.title.de} — Foto ${index + 1}`,
            },
            isHero: index === 0,
            sortOrder: index,
          })),
        },
      },
      select: { id: true },
    });
    // Keep derived image alt translations in sync on re-seed.
    for (let index = 0; index < ap.images.length; index++) {
      await prisma.propertyImage.updateMany({
        where: { propertyId: row.id, sortOrder: index },
        data: {
          alt: {
            en: `${ap.title.en} — photo ${index + 1}`,
            ro: `${ap.title.ro} — fotografia ${index + 1}`,
            fr: `${ap.title.fr} — photo ${index + 1}`,
            de: `${ap.title.de} — Foto ${index + 1}`,
          },
        },
      });
    }
  }
  console.log(
    `  ${affordableProperties.length} affordable (Revery) properties seeded`,
  );

  // 5. Seed testimonials — wipe when SEED_RESET is set so content edits
  //   (e.g. diacritic fixes) propagate to an already-seeded dev DB.
  if (SEED_RESET) {
    await prisma.testimonial.deleteMany({});
    console.log("  [SEED_RESET] testimonials wiped before re-seed");
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
    console.log(
      `  Testimonials already seeded (${existingTestimonials} found)`,
    );
  }

  // 6. Seed articles — same SEED_RESET pattern as testimonials.
  if (SEED_RESET) {
    await prisma.article.deleteMany({});
    console.log("  [SEED_RESET] articles wiped before re-seed");
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
          status: "published",
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

  // 6b. Seed academy courses + lessons — UPSERT by slug, never wipe.
  //   The prod Academy already hosts other courses (e.g. the 180-lesson
  //   "real-estate-fundamentals" and "real-estate-legislation"), so this block
  //   only adds/refreshes the slugs in `academyCourses` and leaves everything
  //   else untouched. Deliberately NOT gated on SEED_RESET / count — a wipe
  //   here would cascade-delete real courses, lessons and progress.
  //   Published + public visibility to match the existing courses; ro-only
  //   content (the API falls back to ro for any other requested locale).
  {
    const now = new Date();
    let lessonCount = 0;
    for (const course of academyCourses) {
      const courseRow = await prisma.course.upsert({
        where: { slug: course.slug },
        update: {
          title: course.title,
          description: course.description,
          status: "published",
          visibility: "public",
          order: course.order,
        },
        create: {
          slug: course.slug,
          title: course.title,
          description: course.description,
          status: "published",
          visibility: "public",
          order: course.order,
          publishedAt: now,
        },
      });
      for (const lesson of course.lessons) {
        await prisma.lesson.upsert({
          where: {
            courseId_slug: { courseId: courseRow.id, slug: lesson.slug },
          },
          update: {
            order: lesson.order,
            title: lesson.title,
            excerpt: lesson.excerpt,
            content: lesson.content,
            type: lesson.type ?? "text",
            status: "published",
          },
          create: {
            courseId: courseRow.id,
            slug: lesson.slug,
            order: lesson.order,
            title: lesson.title,
            excerpt: lesson.excerpt,
            content: lesson.content,
            type: lesson.type ?? "text",
            status: "published",
            publishedAt: now,
          },
        });
        lessonCount += 1;
      }
    }
    console.log(
      `  ${academyCourses.length} academy courses (${lessonCount} lessons) upserted`,
    );
  }

  // 7. Seed site config
  const siteConfigData = {
    name: "Transylvania Grand Estate",
    tagline: {
      en: "Romania's Premier Luxury Real Estate Consultancy",
      ro: "Consultanță Imobiliară de Lux Premier din România",
    },
    description: {
      en: "Discover exceptional luxury properties across Romania's most prestigious addresses. Villas, mansions, and estates from €1M+.",
      ro: "Descoperiți proprietăți de lux excepționale în cele mai prestigioase adrese din România. Vile, conace și domenii de la €1M+.",
    },
    contact: {
      phone: "+40 748 605 203",
      email: "contact@transylvaniagrandestate.ro",
      whatsapp: "+40 748 605 203",
    },
    socialLinks: [
      { platform: "instagram", url: "https://instagram.com/tge" },
      { platform: "facebook", url: "https://facebook.com/tge" },
      { platform: "linkedin", url: "https://linkedin.com/company/tge" },
      { platform: "youtube", url: "https://youtube.com/@tge" },
    ],
    // Client-curated home-page order. 18 cities; position in the array IS the
    // rank — keep the order intact. TGE renders the first 8 as large 2-per-row
    // tiles on the home page (see city-showcase.tsx `slice(0, 8)`); the rest
    // live on the /cities "View All" page. Client-requested home rows:
    //   Cluj-Napoca · Timișoara / Brașov · Oradea / Arad · Sibiu / București · Iași
    tgeHomepageCities: [
      "cluj-napoca",
      "timisoara",
      "brasov",
      "oradea",
      "arad",
      "sibiu",
      "bucuresti",
      "iasi",
      "targu-mures",
      "alba-iulia",
      "satu-mare",
      "constanta",
      "sighisoara",
      "craiova",
      "ploiesti",
      "bistrita",
      "suceava",
      "deva",
    ],
    reveryHomepageCities: [
      "bucuresti",
      "cluj-napoca",
      "timisoara",
      "brasov",
      "oradea",
      "sibiu",
      "arad",
      "alba-iulia",
      "targu-mures",
      "constanta",
      "iasi",
      "satu-mare",
      "sighisoara",
      "craiova",
      "ploiesti",
      "bistrita",
      "suceava",
      "deva",
    ],
  };
  await prisma.siteConfig.upsert({
    where: { id: "singleton" },
    update: {
      name: siteConfigData.name,
      tagline: siteConfigData.tagline,
      description: siteConfigData.description,
      contact: siteConfigData.contact,
      socialLinks: siteConfigData.socialLinks as any,
    },
    create: {
      id: "singleton",
      name: siteConfigData.name,
      tagline: siteConfigData.tagline,
      description: siteConfigData.description,
      contact: siteConfigData.contact,
      socialLinks: siteConfigData.socialLinks as any,
      tgeHomepageCities: siteConfigData.tgeHomepageCities,
      reveryHomepageCities: siteConfigData.reveryHomepageCities,
    },
  });
  console.log("  Site config seeded");

  // 7b. Seed per-city brand membership (`city_brands`).
  //
  //   Brand visibility is gated by this join table — a city's *absence* from
  //   it for a brand makes its properties invisible on that brand's public
  //   site (see apps/api/src/common/site/brand-where.util.ts).
  //
  //   The original membership was populated by a one-time backfill migration
  //   (20260508130000_add_brand_membership) that ran `INSERT … SELECT FROM
  //   cities …`. That only tags cities present when the migration runs — on a
  //   clean DB the migrations run *before* this seed, so the backfill inserts
  //   zero rows and every city ends up untagged. We reproduce the same rules
  //   here so a freshly-seeded DB (CI, local) has working brand isolation.
  //   The legacy SiteConfig.tgeCountyScope / tgeHiddenCities columns were
  //   dropped (20260508160000), so the final business config is inlined below.
  //
  //   Idempotent (skipDuplicates) and additive — safe to re-run against prod.
  const TGE_COUNTY_SCOPE = new Set([
    "alba",
    "bistrita-nasaud",
    "brasov",
    "cluj",
    "covasna",
    "harghita",
    "hunedoara",
    "mures",
    "salaj",
    "sibiu",
    "bihor",
    "timis",
  ]);
  const TGE_HIDDEN_CITIES = new Set([
    "tarnaveni",
    "miercurea-ciuc",
    "reghin",
    "sfantu-gheorghe",
  ]);
  const TGE_HOMEPAGE_CITIES = new Set(siteConfigData.tgeHomepageCities);
  // Mirrors geo-scope.util.ts: every city is Revery except this denylist.
  const REVERY_HIDDEN_CITIES = new Set(["reghin", "tarnaveni"]);

  const cityBrandRows: { cityId: string; brand: Brand }[] = [];
  for (const city of cities) {
    const cityId = cityIdBySlug.get(city.slug);
    if (!cityId) continue;
    const inTgeCounty =
      !!city.countySlug && TGE_COUNTY_SCOPE.has(city.countySlug);
    const isTge =
      (inTgeCounty && !TGE_HIDDEN_CITIES.has(city.slug)) ||
      TGE_HOMEPAGE_CITIES.has(city.slug);
    if (isTge) cityBrandRows.push({ cityId, brand: Brand.tge });
    if (!REVERY_HIDDEN_CITIES.has(city.slug)) {
      cityBrandRows.push({ cityId, brand: Brand.revery });
    }
  }
  const cityBrandResult = await prisma.cityBrand.createMany({
    data: cityBrandRows,
    skipDuplicates: true,
  });
  console.log(
    `  ${cityBrandResult.count} city-brand memberships seeded (${cityBrandRows.length} candidates)`,
  );

  // 8. Seed bank rates — 5-year-fixed nominal rates, researched May 2026 from
  //    public Romanian mortgage comparators. Noua Casă is the government
  //    program (rate ≈ IRCC + 2pp). Upserts so a re-seed refreshes existing
  //    rows (rates move; the calculator must not show stale numbers).
  const bankRatesData = [
    {
      bankName: "Noua Casă",
      rate: 7.58,
      rateType: "govt_program" as const,
      maxLtv: 0.95,
      maxTermYears: 30,
      processingFee: 0.0,
      insuranceRate: 0.05,
      notes: "Program guvernamental — max 70.000 EUR; dobândă ≈ IRCC + 2pp",
      sortOrder: 0,
    },
    {
      bankName: "ING Bank",
      rate: 5.95,
      rateType: "fixed" as const,
      maxLtv: 0.85,
      maxTermYears: 30,
      processingFee: 0.5,
      insuranceRate: 0.05,
      sortOrder: 1,
    },
    {
      bankName: "CEC Bank",
      rate: 5.95,
      rateType: "fixed" as const,
      maxLtv: 0.85,
      maxTermYears: 30,
      processingFee: 0.75,
      insuranceRate: 0.06,
      sortOrder: 2,
    },
    {
      bankName: "Banca Transilvania",
      rate: 5.29,
      rateType: "fixed" as const,
      maxLtv: 0.85,
      maxTermYears: 30,
      processingFee: 1.0,
      insuranceRate: 0.05,
      sortOrder: 3,
    },
    {
      bankName: "BRD",
      rate: 6.3,
      rateType: "fixed" as const,
      maxLtv: 0.8,
      maxTermYears: 30,
      processingFee: 0.75,
      insuranceRate: 0.06,
      sortOrder: 4,
    },
    {
      bankName: "Raiffeisen",
      rate: 5.9,
      rateType: "fixed" as const,
      maxLtv: 0.85,
      maxTermYears: 30,
      processingFee: 1.0,
      insuranceRate: 0.05,
      sortOrder: 5,
    },
    {
      bankName: "BCR",
      rate: 5.95,
      rateType: "fixed" as const,
      maxLtv: 0.85,
      maxTermYears: 30,
      processingFee: 0.5,
      insuranceRate: 0.06,
      sortOrder: 6,
    },
  ];
  for (const br of bankRatesData) {
    const existing = await prisma.bankRate.findFirst({
      where: { bankName: br.bankName },
    });
    if (existing) {
      await prisma.bankRate.update({ where: { id: existing.id }, data: br });
    } else {
      await prisma.bankRate.create({ data: br });
    }
  }
  console.log("  Bank rates seeded");

  // 9. Seed financial indicators — refresh values on every re-seed. EUR_RON is
  //    also auto-synced daily from the BNR FX feed by BnrSyncService; this is
  //    the seed baseline. IRCC is published quarterly by BNR (manual refresh).
  const indicatorsData = [
    {
      key: "EUR_RON",
      value: 5.2359,
      source: "BNR XML Feed",
      sourceUrl: "https://www.bnr.ro/nbrfxrates.xml",
    },
    {
      key: "IRCC",
      value: 5.58,
      source: "BNR — IRCC, valabil 1 apr–30 iun 2026",
      sourceUrl:
        "https://www.bnr.ro/Indicele-de-referinta-pentru-creditele-acordate-consumatorilor-21331.aspx" as
          | string
          | null,
    },
  ];
  for (const ind of indicatorsData) {
    await prisma.financialIndicator.upsert({
      where: { key: ind.key },
      update: {
        value: ind.value,
        source: ind.source,
        sourceUrl: ind.sourceUrl,
        fetchedAt: new Date(),
      },
      create: {
        key: ind.key,
        value: ind.value,
        source: ind.source,
        sourceUrl: ind.sourceUrl,
        fetchedAt: new Date(),
      },
    });
  }
  console.log("  Financial indicators seeded");

  console.log("Seed completed successfully!");
}

// ── Revery affordable seed data ─────────────────────────────────────────
//
// Hand-curated listings in the 60k–950k EUR band. Prices and addresses are
// fictional but plausible; Romanian strings use the proper diacritics that
// the Revery brand requires. Kept inline (not in @tge/data) because the
// package currently only exports luxury data and we don't want to couple
// the two datasets yet.

type Loc = { en: string; ro: string; fr: string; de: string };

interface AffordableSeed {
  slug: string;
  title: Loc;
  description: Loc;
  shortDescription: Loc;
  price: number;
  type: PropertyType;
  city: string;
  citySlug: string;
  neighborhood: string;
  address: Loc;
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
      slug: "revery-studio-centru-cluj",
      title: {
        en: "Bright studio in central Cluj-Napoca",
        ro: "Studio luminos în centrul Clujului",
        fr: "Studio lumineux au cœur de Cluj-Napoca",
        de: "Helles Studio im Zentrum von Cluj-Napoca",
      },
      description: {
        en: "Compact studio within walking distance of Piața Unirii. Recently renovated, ready to move in.",
        ro: "Studio compact la câțiva pași de Piața Unirii. Recent renovat, gata de mutare.",
        fr: "Studio compact à quelques pas de Piața Unirii. Récemment rénové, prêt à emménager.",
        de: "Kompaktes Studio in Gehweite zur Piața Unirii. Kürzlich renoviert, bezugsfertig.",
      },
      shortDescription: {
        en: "Renovated studio near Piața Unirii",
        ro: "Studio renovat lângă Piața Unirii",
        fr: "Studio rénové près de Piața Unirii",
        de: "Renoviertes Studio nahe der Piața Unirii",
      },
      price: 68_500,
      type: PropertyType.apartment,
      city: "Cluj-Napoca",
      citySlug: "cluj-napoca",
      neighborhood: "Centru",
      address: {
        en: "Str. Iuliu Maniu 12, Cluj-Napoca",
        ro: "Str. Iuliu Maniu 12, Cluj-Napoca",
        fr: "Str. Iuliu Maniu 12, Cluj-Napoca",
        de: "Str. Iuliu Maniu 12, Cluj-Napoca",
      },
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
      images: [
        stockImage("photo-1502672260266-1c1ef2d93688"),
        stockImage("photo-1484154218962-a197022b5858"),
      ],
    },
    {
      slug: "revery-2cam-marasti-cluj",
      title: {
        en: "Two-room apartment in Mărăști",
        ro: "Apartament cu 2 camere în Mărăști",
        fr: "Appartement de deux pièces à Mărăști",
        de: "Zwei-Zimmer-Wohnung in Mărăști",
      },
      description: {
        en: "Well-kept 2-room apartment near the Iulius Mall. Tenant-friendly layout and private parking.",
        ro: "Apartament îngrijit cu 2 camere, lângă Iulius Mall. Plan bine gândit și parcare privată.",
        fr: "Appartement de 2 pièces bien entretenu près du Iulius Mall. Agencement fonctionnel et parking privé.",
        de: "Gepflegte 2-Zimmer-Wohnung in der Nähe des Iulius Mall. Durchdachter Grundriss und privater Stellplatz.",
      },
      shortDescription: {
        en: "2 rooms, parking, near Iulius Mall",
        ro: "2 camere, parcare, lângă Iulius Mall",
        fr: "2 pièces, parking, près du Iulius Mall",
        de: "2 Zimmer, Stellplatz, nahe Iulius Mall",
      },
      price: 118_000,
      type: PropertyType.apartment,
      city: "Cluj-Napoca",
      citySlug: "cluj-napoca",
      neighborhood: "Mărăști",
      address: {
        en: "Str. Dorobanților 102, Cluj-Napoca",
        ro: "Str. Dorobanților 102, Cluj-Napoca",
        fr: "Str. Dorobanților 102, Cluj-Napoca",
        de: "Str. Dorobanților 102, Cluj-Napoca",
      },
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
      images: [
        stockImage("photo-1522708323590-d24dbb6b0267"),
        stockImage("photo-1560448204-e02f11c3d0e2"),
      ],
    },
    {
      slug: "revery-3cam-grigorescu-cluj",
      title: {
        en: "Three-room apartment in Grigorescu",
        ro: "Apartament cu 3 camere în Grigorescu",
        fr: "Appartement de trois pièces à Grigorescu",
        de: "Drei-Zimmer-Wohnung in Grigorescu",
      },
      description: {
        en: "Family-sized apartment in a quiet residential pocket, close to Parcul Detunata and schools.",
        ro: "Apartament potrivit pentru familie, într-o zonă liniștită, aproape de Parcul Detunata și școli.",
        fr: "Appartement familial dans un îlot résidentiel calme, à proximité du Parcul Detunata et des écoles.",
        de: "Familiengerechte Wohnung in einer ruhigen Wohnlage, nahe dem Parcul Detunata und Schulen.",
      },
      shortDescription: {
        en: "Family-friendly, quiet neighborhood",
        ro: "Potrivit pentru familie, zonă liniștită",
        fr: "Idéal pour les familles, quartier calme",
        de: "Familienfreundlich, ruhiges Viertel",
      },
      price: 189_900,
      type: PropertyType.apartment,
      city: "Cluj-Napoca",
      citySlug: "cluj-napoca",
      neighborhood: "Grigorescu",
      address: {
        en: "Str. Donath 45, Cluj-Napoca",
        ro: "Str. Donath 45, Cluj-Napoca",
        fr: "Str. Donath 45, Cluj-Napoca",
        de: "Str. Donath 45, Cluj-Napoca",
      },
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
      images: [
        stockImage("photo-1493809842364-78817add7ffb"),
        stockImage("photo-1505843513577-22bb7d21e455"),
      ],
    },

    // ─── Timișoara ──────────────────────────────────────────
    {
      slug: "revery-studio-iosefin-timisoara",
      title: {
        en: "Studio in historic Iosefin, Timișoara",
        ro: "Studio în cartierul istoric Iosefin, Timișoara",
        fr: "Studio dans le quartier historique d'Iosefin, Timișoara",
        de: "Studio im historischen Iosefin, Timișoara",
      },
      description: {
        en: "Charming studio in a period building with high ceilings and original mouldings.",
        ro: "Studio cu farmec într-o clădire de epocă, cu tavane înalte și ornamente originale.",
        fr: "Studio de charme dans un immeuble d'époque, avec hauts plafonds et moulures d'origine.",
        de: "Charmantes Studio in einem Altbau mit hohen Decken und originalen Stuckverzierungen.",
      },
      shortDescription: {
        en: "Period building, high ceilings",
        ro: "Clădire de epocă, tavane înalte",
        fr: "Immeuble d'époque, hauts plafonds",
        de: "Altbau, hohe Decken",
      },
      price: 62_000,
      type: PropertyType.apartment,
      city: "Timișoara",
      citySlug: "timisoara",
      neighborhood: "Iosefin",
      address: {
        en: "Bd. 16 Decembrie 1989 24, Timișoara",
        ro: "Bd. 16 Decembrie 1989 24, Timișoara",
        fr: "Bd. 16 Decembrie 1989 24, Timișoara",
        de: "Bd. 16 Decembrie 1989 24, Timișoara",
      },
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
      images: [stockImage("photo-1493809842364-78817add7ffb")],
    },
    {
      slug: "revery-2cam-complex-timisoara",
      title: {
        en: "New 2-room apartment in Timișoara",
        ro: "Apartament nou cu 2 camere în Timișoara",
        fr: "Appartement neuf de 2 pièces à Timișoara",
        de: "Neue 2-Zimmer-Wohnung in Timișoara",
      },
      description: {
        en: "Brand-new unit in a residential complex with underground parking and green courtyard.",
        ro: "Unitate complet nouă, într-un complex rezidențial, cu parcare subterană și curte verde.",
        fr: "Logement entièrement neuf dans une résidence avec parking souterrain et cour verdoyante.",
        de: "Brandneue Einheit in einer Wohnanlage mit Tiefgarage und begrüntem Innenhof.",
      },
      shortDescription: {
        en: "New build, underground parking",
        ro: "Construcție nouă, parcare subterană",
        fr: "Construction neuve, parking souterrain",
        de: "Neubau, Tiefgarage",
      },
      price: 145_000,
      type: PropertyType.apartment,
      city: "Timișoara",
      citySlug: "timisoara",
      neighborhood: "Cetate",
      address: {
        en: "Str. Aurelianus 8, Timișoara",
        ro: "Str. Aurelianus 8, Timișoara",
        fr: "Str. Aurelianus 8, Timișoara",
        de: "Str. Aurelianus 8, Timișoara",
      },
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
      images: [
        stockImage("photo-1507089947368-19c1da9775ae"),
        stockImage("photo-1600585154340-be6161a56a0c"),
      ],
    },
    {
      slug: "revery-casa-ghiroda-timisoara",
      title: {
        en: "House with garden in Ghiroda",
        ro: "Casă cu grădină în Ghiroda",
        fr: "Maison avec jardin à Ghiroda",
        de: "Haus mit Garten in Ghiroda",
      },
      description: {
        en: "Detached family house on a 400 m² plot with a south-facing garden, 10 minutes from the city centre.",
        ro: "Casă individuală pe un teren de 400 m² cu grădină orientată sud, la 10 minute de centru.",
        fr: "Maison familiale individuelle sur un terrain de 400 m² avec jardin exposé sud, à 10 minutes du centre-ville.",
        de: "Freistehendes Einfamilienhaus auf einem 400 m² großen Grundstück mit Südgarten, 10 Minuten vom Stadtzentrum entfernt.",
      },
      shortDescription: {
        en: "Detached house, 400 m² garden",
        ro: "Casă individuală, grădină 400 m²",
        fr: "Maison individuelle, jardin de 400 m²",
        de: "Freistehendes Haus, 400 m² Garten",
      },
      price: 289_000,
      type: PropertyType.house,
      city: "Timișoara",
      citySlug: "timisoara",
      neighborhood: "Ghiroda",
      address: {
        en: "Str. Pădurii 41, Ghiroda, Timișoara",
        ro: "Str. Pădurii 41, Ghiroda, Timișoara",
        fr: "Str. Pădurii 41, Ghiroda, Timișoara",
        de: "Str. Pădurii 41, Ghiroda, Timișoara",
      },
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
      images: [
        stockImage("photo-1600585154340-be6161a56a0c"),
        stockImage("photo-1613490493576-7fde63acd811"),
      ],
    },

    // ─── Brașov ─────────────────────────────────────────────
    {
      slug: "revery-studio-centru-brasov",
      title: {
        en: "Studio near the old town of Brașov",
        ro: "Studio lângă centrul vechi din Brașov",
        fr: "Studio près de la vieille ville de Brașov",
        de: "Studio nahe der Altstadt von Brașov",
      },
      description: {
        en: "Cozy studio two blocks from Piața Sfatului, ideal as a first home or rental.",
        ro: "Studio primitor la două străzi de Piața Sfatului, ideal ca prima locuință sau pentru închiriere.",
        fr: "Studio chaleureux à deux rues de la Piața Sfatului, idéal comme premier logement ou bien locatif.",
        de: "Gemütliches Studio zwei Häuserblocks von der Piața Sfatului entfernt, ideal als Erstwohnung oder Mietobjekt.",
      },
      shortDescription: {
        en: "Two blocks from Piața Sfatului",
        ro: "La două străzi de Piața Sfatului",
        fr: "À deux rues de la Piața Sfatului",
        de: "Zwei Häuserblocks von der Piața Sfatului",
      },
      price: 74_500,
      type: PropertyType.apartment,
      city: "Brașov",
      citySlug: "brasov",
      neighborhood: "Centrul Vechi",
      address: {
        en: "Str. Republicii 18, Brașov",
        ro: "Str. Republicii 18, Brașov",
        fr: "Str. Republicii 18, Brașov",
        de: "Str. Republicii 18, Brașov",
      },
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
      images: [stockImage("photo-1505693416388-ac5ce068fe85")],
    },
    {
      slug: "revery-3cam-astra-brasov",
      title: {
        en: "Three-room apartment in Astra, Brașov",
        ro: "Apartament cu 3 camere în Astra, Brașov",
        fr: "Appartement de trois pièces à Astra, Brașov",
        de: "Drei-Zimmer-Wohnung in Astra, Brașov",
      },
      description: {
        en: "Comfortable 3-room apartment in a family neighbourhood with parks and schools nearby.",
        ro: "Apartament confortabil cu 3 camere, într-un cartier cu parcuri și școli în apropiere.",
        fr: "Appartement confortable de 3 pièces dans un quartier familial, à proximité de parcs et d'écoles.",
        de: "Komfortable 3-Zimmer-Wohnung in einem familienfreundlichen Viertel mit Parks und Schulen in der Nähe.",
      },
      shortDescription: {
        en: "Family neighbourhood, near parks",
        ro: "Cartier de familie, aproape de parcuri",
        fr: "Quartier familial, à proximité de parcs",
        de: "Familienviertel, nahe Parks",
      },
      price: 138_000,
      type: PropertyType.apartment,
      city: "Brașov",
      citySlug: "brasov",
      neighborhood: "Astra",
      address: {
        en: "Str. Saturn 22, Brașov",
        ro: "Str. Saturn 22, Brașov",
        fr: "Str. Saturn 22, Brașov",
        de: "Str. Saturn 22, Brașov",
      },
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
      images: [
        stockImage("photo-1502672260266-1c1ef2d93688"),
        stockImage("photo-1560448204-e02f11c3d0e2"),
      ],
    },
    {
      slug: "revery-casa-sacele-brasov",
      title: {
        en: "House with mountain view near Săcele",
        ro: "Casă cu vedere la munte lângă Săcele",
        fr: "Maison avec vue sur la montagne près de Săcele",
        de: "Haus mit Bergblick in der Nähe von Săcele",
      },
      description: {
        en: "Three-bedroom house on a quiet street, with terrace facing the Carpathians.",
        ro: "Casă cu trei dormitoare, pe o stradă liniștită, cu terasă orientată spre Carpați.",
        fr: "Maison de trois chambres dans une rue calme, avec terrasse orientée vers les Carpates.",
        de: "Haus mit drei Schlafzimmern in einer ruhigen Straße, mit Terrasse zu den Karpaten.",
      },
      shortDescription: {
        en: "Carpathian view, terrace",
        ro: "Vedere spre Carpați, terasă",
        fr: "Vue sur les Carpates, terrasse",
        de: "Karpatenblick, Terrasse",
      },
      price: 325_000,
      type: PropertyType.house,
      city: "Brașov",
      citySlug: "brasov",
      neighborhood: "Săcele",
      address: {
        en: "Str. Viitorului 7, Săcele, Brașov",
        ro: "Str. Viitorului 7, Săcele, Brașov",
        fr: "Str. Viitorului 7, Săcele, Brașov",
        de: "Str. Viitorului 7, Săcele, Brașov",
      },
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
      images: [
        stockImage("photo-1568605114967-8130f3a36994"),
        stockImage("photo-1600607687939-ce8a6c25118c"),
      ],
    },

    // ─── Sibiu ──────────────────────────────────────────────
    {
      slug: "revery-studio-centru-sibiu",
      title: {
        en: "Studio in Sibiu upper town",
        ro: "Studio în orașul de sus din Sibiu",
        fr: "Studio dans la ville haute de Sibiu",
        de: "Studio in der Oberstadt von Sibiu",
      },
      description: {
        en: "Characterful studio steps away from Piața Mare. Original wooden floors, recently rewired.",
        ro: "Studio cu caracter, la câțiva pași de Piața Mare. Podele originale din lemn, instalație electrică refăcută.",
        fr: "Studio plein de caractère à deux pas de Piața Mare. Parquet d'origine, installation électrique récemment refaite.",
        de: "Charaktervolles Studio nur wenige Schritte von Piața Mare entfernt. Originale Holzdielen, kürzlich neu verkabelt.",
      },
      shortDescription: {
        en: "Near Piața Mare, renovated",
        ro: "Lângă Piața Mare, renovat",
        fr: "Près de Piața Mare, rénové",
        de: "Nahe Piața Mare, renoviert",
      },
      price: 69_900,
      type: PropertyType.apartment,
      city: "Sibiu",
      citySlug: "sibiu",
      neighborhood: "Orașul de Sus",
      address: {
        en: "Str. Nicolae Bălcescu 14, Sibiu",
        ro: "Str. Nicolae Bălcescu 14, Sibiu",
        fr: "Str. Nicolae Bălcescu 14, Sibiu",
        de: "Str. Nicolae Bălcescu 14, Sibiu",
      },
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
      images: [stockImage("photo-1507089947368-19c1da9775ae")],
    },
    {
      slug: "revery-2cam-vasile-aaron-sibiu",
      title: {
        en: "Two-room flat in Vasile Aaron, Sibiu",
        ro: "Apartament cu 2 camere în Vasile Aaron, Sibiu",
        fr: "Appartement deux pièces à Vasile Aaron, Sibiu",
        de: "Zwei-Zimmer-Wohnung in Vasile Aaron, Sibiu",
      },
      description: {
        en: "Practical 2-room flat with thermal insulation, close to supermarkets and public transport.",
        ro: "Apartament practic cu 2 camere, cu termosistem, aproape de supermarket-uri și transport în comun.",
        fr: "Appartement pratique de deux pièces avec isolation thermique, à proximité des supermarchés et des transports en commun.",
        de: "Praktische Zwei-Zimmer-Wohnung mit Wärmedämmung, in der Nähe von Supermärkten und öffentlichen Verkehrsmitteln.",
      },
      shortDescription: {
        en: "Insulated, well-connected",
        ro: "Termoizolat, bine conectat",
        fr: "Isolé, bien desservi",
        de: "Gedämmt, gut angebunden",
      },
      price: 92_000,
      type: PropertyType.apartment,
      city: "Sibiu",
      citySlug: "sibiu",
      neighborhood: "Vasile Aaron",
      address: {
        en: "Str. Henri Coandă 30, Sibiu",
        ro: "Str. Henri Coandă 30, Sibiu",
        fr: "Str. Henri Coandă 30, Sibiu",
        de: "Str. Henri Coandă 30, Sibiu",
      },
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
      images: [stockImage("photo-1522708323590-d24dbb6b0267")],
    },
    {
      slug: "revery-casa-cisnadie-sibiu",
      title: {
        en: "Family house in Cisnădie",
        ro: "Casă de familie în Cisnădie",
        fr: "Maison familiale à Cisnădie",
        de: "Familienhaus in Cisnădie",
      },
      description: {
        en: "Four-bedroom house with garden and garage, perfect for a family moving out of Sibiu centre.",
        ro: "Casă cu patru dormitoare, grădină și garaj, potrivită pentru o familie care se mută din centrul Sibiului.",
        fr: "Maison de quatre chambres avec jardin et garage, idéale pour une famille quittant le centre de Sibiu.",
        de: "Haus mit vier Schlafzimmern, Garten und Garage, ideal für eine Familie, die aus dem Zentrum von Sibiu wegzieht.",
      },
      shortDescription: {
        en: "4 bedrooms, garden, garage",
        ro: "4 dormitoare, grădină, garaj",
        fr: "4 chambres, jardin, garage",
        de: "4 Schlafzimmer, Garten, Garage",
      },
      price: 249_000,
      type: PropertyType.house,
      city: "Sibiu",
      citySlug: "sibiu",
      neighborhood: "Cisnădie",
      address: {
        en: "Str. Cetății 22, Cisnădie, Sibiu",
        ro: "Str. Cetății 22, Cisnădie, Sibiu",
        fr: "Str. Cetății 22, Cisnădie, Sibiu",
        de: "Str. Cetății 22, Cisnădie, Sibiu",
      },
      lat: 45.71,
      lng: 24.147,
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
      images: [
        stockImage("photo-1600585154340-be6161a56a0c"),
        stockImage("photo-1613490493576-7fde63acd811"),
      ],
    },

    // ─── Oradea ─────────────────────────────────────────────
    {
      slug: "revery-studio-centru-oradea",
      title: {
        en: "Studio in Oradea city centre",
        ro: "Studio în centrul Oradiei",
        fr: "Studio dans le centre-ville d'Oradea",
        de: "Studio im Stadtzentrum von Oradea",
      },
      description: {
        en: "Freshly painted studio, walking distance to the Art Nouveau palaces.",
        ro: "Studio proaspăt zugrăvit, la câțiva pași de palatele Art Nouveau.",
        fr: "Studio fraîchement repeint, à quelques minutes à pied des palais Art nouveau.",
        de: "Frisch gestrichenes Studio, fußläufig zu den Jugendstilpalästen.",
      },
      shortDescription: {
        en: "Walk to Art Nouveau centre",
        ro: "La pas de centrul Art Nouveau",
        fr: "À pied du centre Art nouveau",
        de: "Zu Fuß zum Jugendstilzentrum",
      },
      price: 59_000,
      type: PropertyType.apartment,
      city: "Oradea",
      citySlug: "oradea",
      neighborhood: "Centru",
      address: {
        en: "Str. Republicii 9, Oradea",
        ro: "Str. Republicii 9, Oradea",
        fr: "Str. Republicii 9, Oradea",
        de: "Str. Republicii 9, Oradea",
      },
      lat: 47.0525,
      lng: 21.928,
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
      images: [stockImage("photo-1484154218962-a197022b5858")],
    },
    {
      slug: "revery-3cam-rogerius-oradea",
      title: {
        en: "Three-room apartment in Rogerius",
        ro: "Apartament cu 3 camere în Rogerius",
        fr: "Appartement trois pièces à Rogerius",
        de: "Drei-Zimmer-Wohnung in Rogerius",
      },
      description: {
        en: "Spacious 3-room flat with two balconies, recent thermal insulation on the building.",
        ro: "Apartament spațios cu 3 camere și două balcoane, bloc termoizolat recent.",
        fr: "Appartement spacieux de trois pièces avec deux balcons, isolation thermique récente de l'immeuble.",
        de: "Geräumige Drei-Zimmer-Wohnung mit zwei Balkonen, kürzlich erfolgte Wärmedämmung des Gebäudes.",
      },
      shortDescription: {
        en: "3 rooms, 2 balconies",
        ro: "3 camere, 2 balcoane",
        fr: "3 pièces, 2 balcons",
        de: "3 Zimmer, 2 Balkone",
      },
      price: 99_500,
      type: PropertyType.apartment,
      city: "Oradea",
      citySlug: "oradea",
      neighborhood: "Rogerius",
      address: {
        en: "Str. Transilvaniei 41, Oradea",
        ro: "Str. Transilvaniei 41, Oradea",
        fr: "Str. Transilvaniei 41, Oradea",
        de: "Str. Transilvaniei 41, Oradea",
      },
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
      images: [stockImage("photo-1493809842364-78817add7ffb")],
    },
    {
      slug: "revery-casa-episcopia-oradea",
      title: {
        en: "New-build house in Episcopia, Oradea",
        ro: "Casă nouă în Episcopia, Oradea",
        fr: "Maison neuve à Episcopia, Oradea",
        de: "Neubau-Haus in Episcopia, Oradea",
      },
      description: {
        en: "Newly finished 3-bedroom house with fenced plot and open-plan living area.",
        ro: "Casă nouă cu 3 dormitoare, teren împrejmuit și living open-space.",
        fr: "Maison neuve de trois chambres récemment achevée, avec terrain clôturé et séjour ouvert.",
        de: "Neu fertiggestelltes Haus mit drei Schlafzimmern, eingezäuntem Grundstück und offenem Wohnbereich.",
      },
      shortDescription: {
        en: "New build, 3 bedrooms",
        ro: "Construcție nouă, 3 dormitoare",
        fr: "Construction neuve, 3 chambres",
        de: "Neubau, 3 Schlafzimmer",
      },
      price: 219_000,
      type: PropertyType.house,
      city: "Oradea",
      citySlug: "oradea",
      neighborhood: "Episcopia",
      address: {
        en: "Str. Matei Corvin 14, Oradea",
        ro: "Str. Matei Corvin 14, Oradea",
        fr: "Str. Matei Corvin 14, Oradea",
        de: "Str. Matei Corvin 14, Oradea",
      },
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
      images: [
        stockImage("photo-1600607687939-ce8a6c25118c"),
        stockImage("photo-1600596542815-ffad4c1539a9"),
      ],
    },

    // ─── Târgu Mureș ────────────────────────────────────────
    {
      slug: "revery-studio-centru-targu-mures",
      title: {
        en: "Studio near Piața Trandafirilor",
        ro: "Studio lângă Piața Trandafirilor",
        fr: "Studio près de Piața Trandafirilor",
        de: "Studio in der Nähe von Piața Trandafirilor",
      },
      description: {
        en: "Compact studio in the heart of Târgu Mureș, minutes from the Palace of Culture and the rose-lined central square.",
        ro: "Studio compact în inima Târgu Mureșului, la câțiva pași de Palatul Culturii și Piața Trandafirilor.",
        fr: "Studio compact au cœur de Târgu Mureș, à quelques minutes du Palais de la Culture et de la place centrale bordée de roses.",
        de: "Kompaktes Studio im Herzen von Târgu Mureș, nur wenige Minuten vom Kulturpalast und dem rosengesäumten Hauptplatz entfernt.",
      },
      shortDescription: {
        en: "Central, near Palatul Culturii",
        ro: "Central, lângă Palatul Culturii",
        fr: "Central, près du Palatul Culturii",
        de: "Zentral, nahe dem Palatul Culturii",
      },
      price: 64_000,
      type: PropertyType.apartment,
      city: "Târgu Mureș",
      citySlug: "targu-mures",
      neighborhood: "Centru",
      address: {
        en: "Str. Avram Iancu 7, Târgu Mureș",
        ro: "Str. Avram Iancu 7, Târgu Mureș",
        fr: "Str. Avram Iancu 7, Târgu Mureș",
        de: "Str. Avram Iancu 7, Târgu Mureș",
      },
      lat: 46.5465,
      lng: 24.562,
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
      images: [
        stockImage("photo-1502672260266-1c1ef2d93688"),
        stockImage("photo-1484154218962-a197022b5858"),
      ],
    },
    {
      slug: "revery-2cam-tudor-targu-mures",
      title: {
        en: "Two-room apartment in Tudor Vladimirescu",
        ro: "Apartament cu 2 camere în Tudor Vladimirescu",
        fr: "Appartement deux pièces à Tudor Vladimirescu",
        de: "Zwei-Zimmer-Wohnung in Tudor Vladimirescu",
      },
      description: {
        en: "Well-insulated 2-room flat on a quiet side street, close to supermarkets and tram stops.",
        ro: "Apartament cu 2 camere bine termoizolat, pe o stradă liniștită, aproape de supermarket-uri și stațiile de tramvai.",
        fr: "Appartement deux pièces bien isolé, dans une rue secondaire calme, à proximité des supermarchés et des arrêts de tramway.",
        de: "Gut gedämmte Zwei-Zimmer-Wohnung in einer ruhigen Seitenstraße, nahe Supermärkten und Straßenbahnhaltestellen.",
      },
      shortDescription: {
        en: "Insulated, tram-served",
        ro: "Termoizolat, cu tramvai",
        fr: "Isolé, desservi par le tramway",
        de: "Gedämmt, Straßenbahnanschluss",
      },
      price: 95_000,
      type: PropertyType.apartment,
      city: "Târgu Mureș",
      citySlug: "targu-mures",
      neighborhood: "Tudor Vladimirescu",
      address: {
        en: "Bd. 1848 nr. 62, Târgu Mureș",
        ro: "Bd. 1848 nr. 62, Târgu Mureș",
        fr: "Bd. 1848 nr. 62, Târgu Mureș",
        de: "Bd. 1848 nr. 62, Târgu Mureș",
      },
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
      images: [
        stockImage("photo-1522708323590-d24dbb6b0267"),
        stockImage("photo-1560448204-e02f11c3d0e2"),
      ],
    },
    {
      slug: "revery-casa-livezeni-targu-mures",
      title: {
        en: "Family house in Livezeni",
        ro: "Casă de familie în Livezeni",
        fr: "Maison familiale à Livezeni",
        de: "Familienhaus in Livezeni",
      },
      description: {
        en: "Three-bedroom detached house on a 450 m² plot, 10 minutes from the Palace of Culture.",
        ro: "Casă individuală cu trei dormitoare, pe un teren de 450 m², la 10 minute de Palatul Culturii.",
        fr: "Maison individuelle de trois chambres sur un terrain de 450 m², à 10 minutes du Palais de la Culture.",
        de: "Freistehendes Haus mit drei Schlafzimmern auf einem 450 m² großen Grundstück, 10 Minuten vom Kulturpalast entfernt.",
      },
      shortDescription: {
        en: "Detached, 450 m² plot",
        ro: "Individuală, teren 450 m²",
        fr: "Individuelle, terrain de 450 m²",
        de: "Freistehend, 450 m² Grundstück",
      },
      price: 245_000,
      type: PropertyType.house,
      city: "Târgu Mureș",
      citySlug: "targu-mures",
      neighborhood: "Livezeni",
      address: {
        en: "Str. Muncii 14, Livezeni, Târgu Mureș",
        ro: "Str. Muncii 14, Livezeni, Târgu Mureș",
        fr: "Str. Muncii 14, Livezeni, Târgu Mureș",
        de: "Str. Muncii 14, Livezeni, Târgu Mureș",
      },
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
      images: [
        stockImage("photo-1600585154340-be6161a56a0c"),
        stockImage("photo-1613490493576-7fde63acd811"),
      ],
    },

    // ─── Reghin ─────────────────────────────────────────────
    {
      slug: "revery-studio-centru-reghin",
      title: {
        en: "Studio in central Reghin",
        ro: "Studio în centrul Reghinului",
        fr: "Studio dans le centre de Reghin",
        de: "Studio im Zentrum von Reghin",
      },
      description: {
        en: "Neat studio a short walk from the Evangelical church and the central market.",
        ro: "Studio îngrijit, la câțiva pași de biserica evanghelică și piața centrală.",
        fr: "Studio soigné à quelques pas de l'église évangélique et du marché central.",
        de: "Gepflegtes Studio nur wenige Gehminuten von der evangelischen Kirche und dem Zentralmarkt entfernt.",
      },
      shortDescription: {
        en: "Walk to Evangelical church",
        ro: "La pas de biserica evanghelică",
        fr: "À pied de l'église évangélique",
        de: "Zu Fuß zur evangelischen Kirche",
      },
      price: 48_000,
      type: PropertyType.apartment,
      city: "Reghin",
      citySlug: "reghin",
      neighborhood: "Centru",
      address: {
        en: "Str. Petru Maior 8, Reghin",
        ro: "Str. Petru Maior 8, Reghin",
        fr: "Str. Petru Maior 8, Reghin",
        de: "Str. Petru Maior 8, Reghin",
      },
      lat: 46.777,
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
      images: [stockImage("photo-1502672260266-1c1ef2d93688")],
    },
    {
      slug: "revery-2cam-apalina-reghin",
      title: {
        en: "Two-room apartment in Apalina",
        ro: "Apartament cu 2 camere în Apalina",
        fr: "Appartement deux pièces à Apalina",
        de: "Zwei-Zimmer-Wohnung in Apalina",
      },
      description: {
        en: "Quiet 2-room flat in a residential pocket, close to schools and the Mureș riverbank promenade.",
        ro: "Apartament liniștit cu 2 camere, într-o zonă rezidențială, aproape de școli și de promenada de pe malul Mureșului.",
        fr: "Appartement deux pièces tranquille dans un îlot résidentiel, à proximité des écoles et de la promenade au bord du Mureș.",
        de: "Ruhige Zwei-Zimmer-Wohnung in einem Wohnviertel, nahe Schulen und der Uferpromenade am Mureș.",
      },
      shortDescription: {
        en: "Quiet, near the Mureș",
        ro: "Liniștit, aproape de Mureș",
        fr: "Calme, proche du Mureș",
        de: "Ruhig, nahe am Mureș",
      },
      price: 72_000,
      type: PropertyType.apartment,
      city: "Reghin",
      citySlug: "reghin",
      neighborhood: "Apalina",
      address: {
        en: "Str. Apalinei 22, Reghin",
        ro: "Str. Apalinei 22, Reghin",
        fr: "Str. Apalinei 22, Reghin",
        de: "Str. Apalinei 22, Reghin",
      },
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
      images: [stockImage("photo-1522708323590-d24dbb6b0267")],
    },
    {
      slug: "revery-casa-iernuteni-reghin",
      title: {
        en: "Family house in Iernuțeni",
        ro: "Casă de familie în Iernuțeni",
        fr: "Maison familiale à Iernuțeni",
        de: "Familienhaus in Iernuțeni",
      },
      description: {
        en: "Three-bedroom detached house on a 380 m² plot, close to the forest edge and Gliga workshops.",
        ro: "Casă individuală cu trei dormitoare, pe un teren de 380 m², aproape de liziera pădurii și atelierele Gliga.",
        fr: "Maison individuelle de trois chambres sur un terrain de 380 m², à proximité de la lisière de la forêt et des ateliers Gliga.",
        de: "Freistehendes Haus mit drei Schlafzimmern auf einem 380 m² großen Grundstück, nahe dem Waldrand und den Gliga-Werkstätten.",
      },
      shortDescription: {
        en: "Detached, near Gliga workshops",
        ro: "Individuală, lângă Gliga",
        fr: "Individuelle, près des ateliers Gliga",
        de: "Freistehend, nahe den Gliga-Werkstätten",
      },
      price: 165_000,
      type: PropertyType.house,
      city: "Reghin",
      citySlug: "reghin",
      neighborhood: "Iernuțeni",
      address: {
        en: "Str. Iernuțenilor 11, Reghin",
        ro: "Str. Iernuțenilor 11, Reghin",
        fr: "Str. Iernuțenilor 11, Reghin",
        de: "Str. Iernuțenilor 11, Reghin",
      },
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
      images: [stockImage("photo-1600585154340-be6161a56a0c")],
    },

    // ─── Târnăveni ──────────────────────────────────────────
    {
      slug: "revery-studio-centru-tarnaveni",
      title: {
        en: "Studio in central Târnăveni",
        ro: "Studio în centrul Târnăveniului",
        fr: "Studio dans le centre de Târnăveni",
        de: "Studio im Zentrum von Târnăveni",
      },
      description: {
        en: "Compact studio by the Art Deco town hall, newly painted and ready to move in.",
        ro: "Studio compact, lângă primăria în stil Art Deco, proaspăt zugrăvit și gata de mutare.",
        fr: "Studio compact près de l'hôtel de ville Art déco, fraîchement repeint et prêt à emménager.",
        de: "Kompaktes Studio nahe dem Art-déco-Rathaus, frisch gestrichen und bezugsfertig.",
      },
      shortDescription: {
        en: "Near Art Deco town hall",
        ro: "Lângă primăria Art Deco",
        fr: "Près de l'hôtel de ville Art déco",
        de: "Nahe dem Art-déco-Rathaus",
      },
      price: 42_000,
      type: PropertyType.apartment,
      city: "Târnăveni",
      citySlug: "tarnaveni",
      neighborhood: "Centru",
      address: {
        en: "Piața Primăriei 4, Târnăveni",
        ro: "Piața Primăriei 4, Târnăveni",
        fr: "Piața Primăriei 4, Târnăveni",
        de: "Piața Primăriei 4, Târnăveni",
      },
      lat: 46.333,
      lng: 24.287,
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
      images: [stockImage("photo-1484154218962-a197022b5858")],
    },
    {
      slug: "revery-2cam-botorca-tarnaveni",
      title: {
        en: "Two-room flat in Botorca",
        ro: "Apartament cu 2 camere în Botorca",
        fr: "Appartement deux pièces à Botorca",
        de: "Zwei-Zimmer-Wohnung in Botorca",
      },
      description: {
        en: "Practical 2-room flat in a 1970s block, recently insulated and close to the industrial park for commuters.",
        ro: "Apartament practic cu 2 camere, într-un bloc din anii 70, recent termoizolat, aproape de parcul industrial.",
        fr: "Appartement deux pièces fonctionnel dans un immeuble des années 1970, récemment isolé et proche du parc industriel pour les navetteurs.",
        de: "Praktische Zwei-Zimmer-Wohnung in einem Block aus den 1970er-Jahren, kürzlich gedämmt und nahe dem Industriepark für Pendler.",
      },
      shortDescription: {
        en: "Insulated, commuter-friendly",
        ro: "Termoizolat, pentru navetiști",
        fr: "Isolé, idéal pour les navetteurs",
        de: "Gedämmt, pendlerfreundlich",
      },
      price: 58_000,
      type: PropertyType.apartment,
      city: "Târnăveni",
      citySlug: "tarnaveni",
      neighborhood: "Botorca",
      address: {
        en: "Str. Republicii 71, Târnăveni",
        ro: "Str. Republicii 71, Târnăveni",
        fr: "Str. Republicii 71, Târnăveni",
        de: "Str. Republicii 71, Târnăveni",
      },
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
      images: [stockImage("photo-1493809842364-78817add7ffb")],
    },
    {
      slug: "revery-casa-bobohalma-tarnaveni",
      title: {
        en: "House in Bobohalma",
        ro: "Casă în Bobohalma",
        fr: "Maison à Bobohalma",
        de: "Haus in Bobohalma",
      },
      description: {
        en: "Detached house with a generous garden on the outskirts of Târnăveni, 10 minutes from the town centre.",
        ro: "Casă individuală cu grădină generoasă la marginea Târnăveniului, la 10 minute de centru.",
        fr: "Maison individuelle avec un jardin généreux à la périphérie de Târnăveni, à 10 minutes du centre-ville.",
        de: "Freistehendes Haus mit großzügigem Garten am Rande von Târnăveni, 10 Minuten vom Stadtzentrum entfernt.",
      },
      shortDescription: {
        en: "Garden house, edge of town",
        ro: "Casă cu grădină, la margine",
        fr: "Maison avec jardin, en périphérie",
        de: "Haus mit Garten, am Stadtrand",
      },
      price: 128_000,
      type: PropertyType.house,
      city: "Târnăveni",
      citySlug: "tarnaveni",
      neighborhood: "Bobohalma",
      address: {
        en: "Str. Bobohalmei 9, Târnăveni",
        ro: "Str. Bobohalmei 9, Târnăveni",
        fr: "Str. Bobohalmei 9, Târnăveni",
        de: "Str. Bobohalmei 9, Târnăveni",
      },
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
      images: [stockImage("photo-1600607687939-ce8a6c25118c")],
    },
  ];
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
