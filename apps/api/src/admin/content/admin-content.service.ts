import { Injectable } from '@nestjs/common';
import { ArticleStatus, CourseStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type LocaleKey = 'ro' | 'en' | 'fr' | 'de';

const LOCALES: readonly LocaleKey[] = ['ro', 'en', 'fr', 'de'];

interface FilledByLocale {
  ro: number;
  en: number;
  fr: number;
  de: number;
}

interface TypeStats {
  total: number;
  filledByLocale: FilledByLocale;
}

export interface MissingEnEntry {
  type: ContentType;
  id: string;
  slug: string | null;
  displayName: string;
  updatedAt: string;
  editHref: string;
}

type LocalizedTitle = Record<LocaleKey, string | undefined>;

export interface RecentArticleEntry {
  id: string;
  slug: string;
  title: LocalizedTitle;
  status: ArticleStatus;
  updatedAt: string;
  publishedAt: string | null;
}

export interface RecentCourseEntry {
  id: string;
  slug: string;
  title: LocalizedTitle;
  status: CourseStatus;
  updatedAt: string;
}

export interface ArticleSummary {
  total: number;
  drafts: number;
  published: number;
  recent: RecentArticleEntry[];
}

export interface CourseSummary {
  total: number;
  drafts: number;
  published: number;
  archived: number;
  recent: RecentCourseEntry[];
}

type ContentType =
  | 'article'
  | 'course'
  | 'lesson'
  | 'property'
  | 'city'
  | 'developer'
  | 'agent'
  | 'testimonial';

export interface LocaleCompletenessResponse {
  byType: Record<ContentType, TypeStats>;
  missingEn: MissingEnEntry[];
  missingEnTotal: number;
  articles: ArticleSummary;
  courses: CourseSummary;
}

const QUEUE_LIMIT = 12;
const RECENT_LIMIT = 5;

function isFilled(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Returns true if every localized field on the entity has a non-empty
 * string at `locale`. The field set is passed in by the caller — each
 * content type has a different list of localized fields.
 */
function isEntityFilledForLocale(
  entity: Record<string, unknown>,
  fields: readonly string[],
  locale: LocaleKey,
): boolean {
  for (const field of fields) {
    const localized = entity[field];
    if (!localized || typeof localized !== 'object') return false;
    const value = (localized as Record<string, unknown>)[locale];
    if (!isFilled(value)) return false;
  }
  return true;
}

function emptyTypeStats(): TypeStats {
  return {
    total: 0,
    filledByLocale: { ro: 0, en: 0, fr: 0, de: 0 },
  };
}

function pickLocalizedDisplay(
  entity: Record<string, unknown>,
  field: string,
  fallback: string,
): string {
  const localized = entity[field];
  if (localized && typeof localized === 'object') {
    const obj = localized as Record<string, unknown>;
    for (const locale of LOCALES) {
      const value = obj[locale];
      if (isFilled(value)) return value as string;
    }
  }
  return fallback;
}

@Injectable()
export class AdminContentService {
  constructor(private prisma: PrismaService) {}

  async localeCompleteness(): Promise<LocaleCompletenessResponse> {
    // We fetch each content type's localized fields + slug/updatedAt in one
    // query. The total row counts are small enough today that aggregating in
    // JS is simpler than coercing Postgres JSONB into per-locale predicates.
    // If any of these tables grows past ~5k rows, lift this into a SQL view.

    const [
      articles,
      courses,
      lessons,
      properties,
      cities,
      developers,
      agents,
      testimonials,
    ] = await Promise.all([
      this.prisma.article.findMany({
        select: {
          id: true,
          slug: true,
          status: true,
          publishedAt: true,
          updatedAt: true,
          title: true,
          excerpt: true,
          content: true,
        },
      }),
      this.prisma.course.findMany({
        select: {
          id: true,
          slug: true,
          status: true,
          updatedAt: true,
          title: true,
          description: true,
        },
      }),
      this.prisma.lesson.findMany({
        select: {
          id: true,
          slug: true,
          courseId: true,
          updatedAt: true,
          title: true,
          excerpt: true,
          content: true,
        },
      }),
      this.prisma.property.findMany({
        select: {
          id: true,
          slug: true,
          updatedAt: true,
          title: true,
          description: true,
          shortDescription: true,
          address: true,
        },
      }),
      this.prisma.city.findMany({
        select: {
          id: true,
          slug: true,
          name: true,
          updatedAt: true,
          description: true,
        },
      }),
      this.prisma.developer.findMany({
        select: {
          id: true,
          slug: true,
          name: true,
          updatedAt: true,
          description: true,
          shortDescription: true,
        },
      }),
      this.prisma.agent.findMany({
        select: {
          id: true,
          slug: true,
          firstName: true,
          lastName: true,
          updatedAt: true,
          bio: true,
        },
      }),
      this.prisma.testimonial.findMany({
        select: {
          id: true,
          clientName: true,
          updatedAt: true,
          quote: true,
        },
      }),
    ]);

    const byType: Record<ContentType, TypeStats> = {
      article: emptyTypeStats(),
      course: emptyTypeStats(),
      lesson: emptyTypeStats(),
      property: emptyTypeStats(),
      city: emptyTypeStats(),
      developer: emptyTypeStats(),
      agent: emptyTypeStats(),
      testimonial: emptyTypeStats(),
    };

    const missing: MissingEnEntry[] = [];

    const groups: Array<{
      type: ContentType;
      records: Record<string, unknown>[];
      fields: readonly string[];
      displayField: string;
      editHref: (record: Record<string, unknown>) => string;
    }> = [
      {
        type: 'article',
        records: articles as unknown as Record<string, unknown>[],
        fields: ['title', 'excerpt', 'content'],
        displayField: 'title',
        editHref: (a) => `/articles/${a.slug}/edit?loc=en`,
      },
      {
        type: 'course',
        records: courses as unknown as Record<string, unknown>[],
        fields: ['title', 'description'],
        displayField: 'title',
        editHref: (c) => `/academy/courses/${c.id}/edit?loc=en`,
      },
      {
        type: 'lesson',
        records: lessons as unknown as Record<string, unknown>[],
        fields: ['title', 'excerpt', 'content'],
        displayField: 'title',
        editHref: (l) =>
          `/academy/courses/${l.courseId}/lessons/${l.id}/edit?loc=en`,
      },
      {
        type: 'property',
        records: properties as unknown as Record<string, unknown>[],
        fields: ['title', 'description', 'shortDescription', 'address'],
        displayField: 'title',
        editHref: (p) => `/properties/${p.id}/edit?loc=en`,
      },
      {
        type: 'city',
        records: cities as unknown as Record<string, unknown>[],
        fields: ['description'],
        displayField: 'description',
        editHref: (c) => `/cities/${c.id}/edit?loc=en`,
      },
      {
        type: 'developer',
        records: developers as unknown as Record<string, unknown>[],
        fields: ['description', 'shortDescription'],
        displayField: 'description',
        editHref: (d) => `/developers/${d.id}/edit?loc=en`,
      },
      {
        type: 'agent',
        records: agents as unknown as Record<string, unknown>[],
        fields: ['bio'],
        displayField: 'bio',
        editHref: (a) => `/agents/${a.id}/edit?loc=en`,
      },
      {
        type: 'testimonial',
        records: testimonials as unknown as Record<string, unknown>[],
        fields: ['quote'],
        displayField: 'quote',
        editHref: (t) => `/testimonials/${t.id}/edit?loc=en`,
      },
    ];

    for (const group of groups) {
      byType[group.type].total = group.records.length;
      for (const record of group.records) {
        for (const locale of LOCALES) {
          if (isEntityFilledForLocale(record, group.fields, locale)) {
            byType[group.type].filledByLocale[locale]++;
          }
        }
        if (!isEntityFilledForLocale(record, group.fields, 'en')) {
          const displayName = pickEntityDisplay(group.type, record, group.displayField);
          missing.push({
            type: group.type,
            id: record.id as string,
            slug: (record.slug as string | undefined) ?? null,
            displayName,
            updatedAt: (record.updatedAt as Date).toISOString(),
            editHref: group.editHref(record),
          });
        }
      }
    }

    // Sort missing-EN queue by recency (most-recently-edited first) and trim.
    missing.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const missingTotal = missing.length;
    const missingEn = missing.slice(0, QUEUE_LIMIT);

    // Article + course status counts and recent items derived from the same
    // findMany scans above. Avoids a second fan-out from the front-end Content
    // home (previously 7 round-trips: 3 articles + 4 courses) and keeps the
    // Dashboard's missingEnTotal call free of extra DB work.
    const articleSummary = summarizeArticles(articles);
    const courseSummary = summarizeCourses(courses);

    return {
      byType,
      missingEn,
      missingEnTotal: missingTotal,
      articles: articleSummary,
      courses: courseSummary,
    };
  }
}

interface ArticleRowForSummary {
  id: string;
  slug: string | null;
  status: ArticleStatus;
  publishedAt: Date | null;
  updatedAt: Date;
  title: unknown;
}

function summarizeArticles(rows: ArticleRowForSummary[]): ArticleSummary {
  let drafts = 0;
  let published = 0;
  for (const row of rows) {
    if (row.status === ArticleStatus.draft) drafts += 1;
    else if (row.status === ArticleStatus.published) published += 1;
  }
  const recent = [...rows]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, RECENT_LIMIT)
    .map<RecentArticleEntry>((row) => ({
      id: row.id,
      slug: row.slug ?? row.id,
      title: (row.title ?? {}) as LocalizedTitle,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    }));
  return { total: rows.length, drafts, published, recent };
}

interface CourseRowForSummary {
  id: string;
  slug: string | null;
  status: CourseStatus;
  updatedAt: Date;
  title: unknown;
}

function summarizeCourses(rows: CourseRowForSummary[]): CourseSummary {
  let drafts = 0;
  let published = 0;
  let archived = 0;
  for (const row of rows) {
    if (row.status === CourseStatus.draft) drafts += 1;
    else if (row.status === CourseStatus.published) published += 1;
    else if (row.status === CourseStatus.archived) archived += 1;
  }
  const recent = [...rows]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, RECENT_LIMIT)
    .map<RecentCourseEntry>((row) => ({
      id: row.id,
      slug: row.slug ?? row.id,
      title: (row.title ?? {}) as LocalizedTitle,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
    }));
  return { total: rows.length, drafts, published, archived, recent };
}

function pickEntityDisplay(
  type: ContentType,
  record: Record<string, unknown>,
  localizedField: string,
): string {
  // Some entity types have a non-localized display name (city.name, agent
  // first/last, testimonial.clientName) — prefer those over the localized
  // fallback so the queue row is recognisable.
  if (type === 'city') {
    return (record.name as string) ?? (record.slug as string) ?? 'Untitled';
  }
  if (type === 'developer') {
    return pickLocalizedDisplay(record, localizedField, (record.slug as string) ?? 'Untitled');
  }
  if (type === 'agent') {
    const first = (record.firstName as string) ?? '';
    const last = (record.lastName as string) ?? '';
    return `${first} ${last}`.trim() || (record.slug as string) || 'Untitled';
  }
  if (type === 'testimonial') {
    return (record.clientName as string) ?? 'Untitled';
  }
  return pickLocalizedDisplay(record, localizedField, (record.slug as string) ?? 'Untitled');
}
