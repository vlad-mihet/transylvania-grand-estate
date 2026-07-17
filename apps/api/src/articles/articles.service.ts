import { Injectable } from '@nestjs/common';
import { AdminRole, ArticleStatus, Prisma } from '@prisma/client';
import type { CurrentUserPayload } from '../common/decorators/user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticleDto } from './dto/query-article.dto';
import { paginate } from '../common/utils/pagination.util';
import { ensureFound } from '../common/utils/ensure-found.util';
import { ensureSlugUnique } from '../common/utils/ensure-slug-unique.util';
import { toJson } from '../common/utils/prisma-json';
import { applyDraftMode } from '../common/utils/entry-draft';
import { localizedJsonContainsAny } from '../common/utils/localized-search';

@Injectable()
export class ArticlesService {
  constructor(
    private prisma: PrismaService,
    private uploads: UploadsService,
  ) {}

  /**
   * Only editors and above may see unpublished (draft) articles. Public and
   * unauthenticated callers — and AGENT role — are always scoped to published.
   */
  private canSeeUnpublished(user?: CurrentUserPayload | null): boolean {
    return (
      user?.role === AdminRole.EDITOR ||
      user?.role === AdminRole.ADMIN ||
      user?.role === AdminRole.SUPER_ADMIN
    );
  }

  async findAll(query: QueryArticleDto, user?: CurrentUserPayload | null) {
    const { page = 1, limit = 12, category, status, search, sort } = query;

    const where: Prisma.ArticleWhereInput = {};

    if (category) where.category = category;
    if (this.canSeeUnpublished(user)) {
      // Editors may filter by any status (or omit it to see everything).
      if (status) where.status = status;
    } else {
      // Public callers only ever see published — a `status` query param
      // cannot widen this (BUG-109: drafts were readable via the open API).
      where.status = ArticleStatus.published;
    }
    if (search) {
      where.OR = [
        ...localizedJsonContainsAny('title', search).map((filter) => ({
          title: filter,
        })),
        { authorName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.ArticleOrderByWithRelationInput =
      sort === 'oldest'
        ? { publishedAt: 'asc' }
        : { publishedAt: 'desc' };

    return paginate(
      (skip, take) =>
        this.prisma.article.findMany({ where, orderBy, skip, take }),
      () => this.prisma.article.count({ where }),
      page,
      limit,
    );
  }

  async findBySlug(slug: string, user?: CurrentUserPayload | null) {
    // Public callers get a 404 for a draft slug rather than the draft itself
    // (BUG-109). Editors resolve the row regardless of status.
    if (this.canSeeUnpublished(user)) {
      return ensureFound(
        this.prisma.article.findUnique({ where: { slug } }),
        'Article',
      );
    }
    return ensureFound(
      this.prisma.article.findFirst({
        where: { slug, status: ArticleStatus.published },
      }),
      'Article',
    );
  }

  async findById(id: string) {
    return ensureFound(
      this.prisma.article.findUnique({ where: { id } }),
      'Article',
    );
  }

  /**
   * Editor-only read used by the admin edit page to pre-populate the form
   * (including any pending `draft` snapshot). The PrismaService applies a
   * default `omit: { draft: true }` for every model with a draft column;
   * this method opts back in with `omit: { draft: false }` so the editor
   * sees the unpublished snapshot.
   */
  async findBySlugForEditor(slug: string) {
    return ensureFound(
      this.prisma.article.findUnique({
        where: { slug },
        omit: { draft: false },
      }),
      'Article',
    );
  }

  async create(dto: CreateArticleDto) {
    await ensureSlugUnique(dto.slug, 'Article', (slug) =>
      this.prisma.article.findUnique({
        where: { slug },
        select: { id: true },
      }),
    );

    return this.prisma.article.create({
      data: {
        slug: dto.slug,
        title: toJson(dto.title),
        excerpt: toJson(dto.excerpt),
        content: toJson(dto.content),
        coverImage: dto.coverImage,
        category: dto.category,
        tags: toJson(dto.tags ?? []),
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null,
        authorName: dto.authorName,
        authorAvatar: dto.authorAvatar,
        readTimeMinutes: dto.readTimeMinutes ?? 5,
      },
    });
  }

  async update(id: string, dto: UpdateArticleDto) {
    const existing = await this.ensureExists(id);
    const data: Prisma.ArticleUpdateInput = {};

    // Localized fields go through the draft/publish split.
    const { live, draft } = applyDraftMode(
      dto,
      ['title', 'excerpt', 'content'] as const,
      dto.mode,
    );
    if (live.title !== undefined) data.title = live.title;
    if (live.excerpt !== undefined) data.excerpt = live.excerpt;
    if (live.content !== undefined) data.content = live.content;
    if (draft !== undefined) data.draft = draft;

    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.coverImage !== undefined) data.coverImage = dto.coverImage;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.tags !== undefined)
      data.tags = toJson(dto.tags);
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.publishedAt !== undefined)
      data.publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : null;
    if (dto.authorName !== undefined) data.authorName = dto.authorName;
    if (dto.authorAvatar !== undefined) data.authorAvatar = dto.authorAvatar;
    if (dto.readTimeMinutes !== undefined)
      data.readTimeMinutes = dto.readTimeMinutes;

    const updated = await this.prisma.article.update({ where: { id }, data });
    // Preemptive cleanup — articles currently take paste-only external URLs
    // (no upload endpoint), so deleteByPublicUrl no-ops for them. The hooks
    // are wired so that if an articles upload endpoint lands later, the
    // PATCH path is already clean.
    if (
      dto.coverImage !== undefined &&
      existing.coverImage &&
      existing.coverImage !== dto.coverImage
    ) {
      await this.uploads.deleteByPublicUrl(existing.coverImage, 'articles');
    }
    if (
      dto.authorAvatar !== undefined &&
      existing.authorAvatar &&
      existing.authorAvatar !== dto.authorAvatar
    ) {
      await this.uploads.deleteByPublicUrl(existing.authorAvatar, 'articles');
    }
    return updated;
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.article.delete({ where: { id } });
  }

  private ensureExists(id: string) {
    return ensureFound(
      this.prisma.article.findUnique({ where: { id } }),
      'Article',
    );
  }
}
