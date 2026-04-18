import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticleDto } from './dto/query-article.dto';
import { paginate } from '../common/utils/pagination.util';
import { ensureFound } from '../common/utils/ensure-found.util';
import { ensureSlugUnique } from '../common/utils/ensure-slug-unique.util';
import { toJson } from '../common/utils/prisma-json';

@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryArticleDto) {
    const { page = 1, limit = 12, category, status, search, sort } = query;

    const where: Prisma.ArticleWhereInput = {};

    if (category) where.category = category;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { path: ['en'], string_contains: search } },
        { title: { path: ['ro'], string_contains: search } },
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

  async findBySlug(slug: string) {
    return ensureFound(
      this.prisma.article.findUnique({ where: { slug } }),
      'Article',
    );
  }

  async findById(id: string) {
    return ensureFound(
      this.prisma.article.findUnique({ where: { id } }),
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
    await this.ensureExists(id);
    const data: Prisma.ArticleUpdateInput = {};

    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.title !== undefined)
      data.title = toJson(dto.title);
    if (dto.excerpt !== undefined)
      data.excerpt = toJson(dto.excerpt);
    if (dto.content !== undefined)
      data.content = toJson(dto.content);
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

    return this.prisma.article.update({ where: { id }, data });
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
