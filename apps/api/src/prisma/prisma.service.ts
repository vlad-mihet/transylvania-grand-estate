import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Defense-in-depth omit for the per-entity `draft` JSON columns introduced
 * by the Phase 5 Contentful overhaul. Drafts contain unpublished localized
 * snapshots; serving them on read endpoints would leak in-progress edits
 * to public consumers (and to admin list views that don't need them).
 *
 * Reads that genuinely need `draft` — currently only the admin article
 * editor, fetched via `articles.service.findBySlugForEditor` — opt in
 * with `omit: { draft: false }` on that specific query.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      omit: {
        article: { draft: true },
        course: { draft: true },
        lesson: { draft: true },
        property: { draft: true },
        city: { draft: true },
        developer: { draft: true },
        agent: { draft: true },
        testimonial: { draft: true },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
