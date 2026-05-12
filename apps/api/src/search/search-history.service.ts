import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CurrentUserPayload } from '../common/decorators/user.decorator';
import type {
  RecentSearchItem,
  RecordSearchHistoryInput,
  SearchEntityType,
} from '@tge/types/schemas/search';
import { ROLE_ALLOWED } from './search.service';

/**
 * Hard cap on recent-search rows per admin user. Sized for fast index-only
 * scans on the `(userId, selectedAt DESC)` index — at 25 we never bloat into
 * a paged read. Anything older than the 25th most-recent selection is
 * deleted in the same transaction as the insert.
 */
const HISTORY_CAP = 25;

@Injectable()
export class SearchHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a selection. Upserts on `(userId, entity, entityId)` so picking
   * the same row twice just bumps `selectedAt`. Trims to `HISTORY_CAP` rows
   * after insert in the same transaction.
   */
  async record(
    user: CurrentUserPayload,
    input: RecordSearchHistoryInput,
  ): Promise<RecentSearchItem> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.adminSearchHistory.upsert({
        where: {
          userId_entity_entityId: {
            userId: user.id,
            entity: input.entity,
            entityId: input.entityId,
          },
        },
        create: {
          userId: user.id,
          entity: input.entity,
          entityId: input.entityId,
          title: input.title,
          subtitle: input.subtitle ?? null,
          href: input.href,
          imageUrl: input.imageUrl ?? null,
          badge: input.badge ?? null,
        },
        update: {
          // Refresh the displayed metadata in case the underlying entity has
          // been renamed since it last entered the user's history.
          title: input.title,
          subtitle: input.subtitle ?? null,
          href: input.href,
          imageUrl: input.imageUrl ?? null,
          badge: input.badge ?? null,
          selectedAt: new Date(),
        },
      });

      // Find rows beyond the cap (oldest first beyond index `HISTORY_CAP-1`)
      // and delete them. Single query, single round-trip, index-only.
      const stale = await tx.adminSearchHistory.findMany({
        where: { userId: user.id },
        orderBy: { selectedAt: 'desc' },
        skip: HISTORY_CAP,
        select: { id: true },
      });
      if (stale.length > 0) {
        await tx.adminSearchHistory.deleteMany({
          where: { id: { in: stale.map((s) => s.id) } },
        });
      }

      return this.toDto(row);
    });
  }

  /**
   * List the user's most-recent picks, filtered to entity types the caller's
   * current role still allows (re-checked here in case the user was demoted
   * between sessions).
   */
  async list(user: CurrentUserPayload, limit: number): Promise<RecentSearchItem[]> {
    const allowed = new Set<SearchEntityType>(
      ROLE_ALLOWED[user.role as AdminRole] ?? [],
    );
    if (allowed.size === 0) return [];

    const rows = await this.prisma.adminSearchHistory.findMany({
      where: {
        userId: user.id,
        entity: { in: Array.from(allowed) },
      },
      orderBy: { selectedAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => this.toDto(r));
  }

  async remove(user: CurrentUserPayload, id: string): Promise<void> {
    const row = await this.prisma.adminSearchHistory.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!row || row.userId !== user.id) {
      // Don't leak whether the row exists for another user — same 404 either
      // way. Direct ownership check rather than scoped delete so we can
      // surface a clear API error.
      throw new NotFoundException('Recent search entry not found');
    }
    await this.prisma.adminSearchHistory.delete({ where: { id } });
  }

  private toDto(row: {
    id: string;
    entity: string;
    entityId: string;
    title: string;
    subtitle: string | null;
    href: string;
    imageUrl: string | null;
    badge: string | null;
    selectedAt: Date;
  }): RecentSearchItem {
    return {
      id: row.id,
      entity: row.entity as SearchEntityType,
      entityId: row.entityId,
      title: row.title,
      subtitle: row.subtitle,
      href: row.href,
      imageUrl: row.imageUrl,
      badge: row.badge,
      selectedAt: row.selectedAt.toISOString(),
    };
  }
}
