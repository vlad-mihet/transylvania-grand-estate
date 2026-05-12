import { Injectable } from '@nestjs/common';
import { PropertyStatus } from '@prisma/client';
import type {
  AdminCatalogOverview,
  RecentDeveloperEntry,
  RecentPropertyEntry,
  RecentTestimonialEntry,
} from '@tge/types/schemas/admin-catalog';

import { PrismaService } from '../../prisma/prisma.service';

type LocalizedTitle = Record<string, string | undefined>;

const RECENT_LIMIT = 5;

/**
 * Composes the Catalog module home overview. Goes direct to PrismaService
 * (NOT through PropertiesService.findAll etc.) so counts are admin-scope
 * and unaffected by the public-read tier/site filters those services
 * carry. ~11 internal calls in one Promise.all → one round-trip from the
 * client's POV.
 */
@Injectable()
export class AdminCatalogService {
  constructor(private prisma: PrismaService) {}

  async getOverview(): Promise<AdminCatalogOverview> {
    const [
      propertiesTotal,
      propertiesAvailable,
      propertiesSold,
      propertiesReserved,
      propertiesFeatured,
      propertiesRecentRaw,
      developersTotal,
      developersFeatured,
      developersRecentRaw,
      testimonialsTotal,
      testimonialsAvgAggregate,
      testimonialsRecentRaw,
    ] = await Promise.all([
      this.prisma.property.count(),
      this.prisma.property.count({
        where: { status: PropertyStatus.available },
      }),
      this.prisma.property.count({
        where: { status: PropertyStatus.sold },
      }),
      this.prisma.property.count({
        where: { status: PropertyStatus.reserved },
      }),
      this.prisma.property.count({ where: { featured: true } }),
      this.prisma.property.findMany({
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          featured: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: RECENT_LIMIT,
      }),
      this.prisma.developer.count(),
      this.prisma.developer.count({ where: { featured: true } }),
      this.prisma.developer.findMany({
        select: {
          id: true,
          slug: true,
          name: true,
          featured: true,
          projectCount: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: RECENT_LIMIT,
      }),
      this.prisma.testimonial.count(),
      this.prisma.testimonial.aggregate({ _avg: { rating: true } }),
      this.prisma.testimonial.findMany({
        select: {
          id: true,
          clientName: true,
          rating: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: RECENT_LIMIT,
      }),
    ]);

    const propertiesRecent: RecentPropertyEntry[] = propertiesRecentRaw.map(
      (p) => ({
        id: p.id,
        slug: p.slug,
        title: (p.title ?? {}) as LocalizedTitle,
        status: p.status,
        featured: p.featured,
        updatedAt: p.updatedAt.toISOString(),
      }),
    );

    const developersRecent: RecentDeveloperEntry[] = developersRecentRaw.map(
      (d) => ({
        id: d.id,
        slug: d.slug,
        name: d.name,
        featured: d.featured,
        projectCount: d.projectCount,
        updatedAt: d.updatedAt.toISOString(),
      }),
    );

    const testimonialsRecent: RecentTestimonialEntry[] =
      testimonialsRecentRaw.map((t) => ({
        id: t.id,
        clientName: t.clientName,
        rating: t.rating,
        createdAt: t.createdAt.toISOString(),
      }));

    // Round avg to 1 decimal so the UI tile reads cleanly. Null when no
    // rows — Postgres AVG returns NULL on empty, Prisma surfaces that.
    const avgRaw = testimonialsAvgAggregate._avg.rating;
    const avgRating =
      avgRaw === null || avgRaw === undefined
        ? null
        : Math.round(avgRaw * 10) / 10;

    return {
      properties: {
        total: propertiesTotal,
        available: propertiesAvailable,
        sold: propertiesSold,
        reserved: propertiesReserved,
        featured: propertiesFeatured,
        recent: propertiesRecent,
      },
      developers: {
        total: developersTotal,
        featured: developersFeatured,
        recent: developersRecent,
      },
      testimonials: {
        total: testimonialsTotal,
        avgRating,
        recent: testimonialsRecent,
      },
    };
  }
}
