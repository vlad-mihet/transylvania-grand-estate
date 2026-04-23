#!/usr/bin/env node
// @ts-check
/**
 * Seeds the academy with the 23 Romanian real-estate training articles
 * from `context.txt` as a single course ("Fundamentele imobiliarelor") +
 * one lesson per article. Safe to run repeatedly — it upserts the course
 * by slug and lessons by (course_id, slug).
 *
 * Usage:
 *   # Node 20+: pick up DATABASE_URL from apps/api/.env automatically
 *   node --env-file=apps/api/.env scripts/seed-academy.mjs
 *
 *   # Or set it explicitly:
 *   DATABASE_URL=postgres://... node scripts/seed-academy.mjs
 *
 *   # Or via the root shortcut (doesn't load the .env — export first):
 *   pnpm seed:academy
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

if (!process.env.DATABASE_URL) {
  console.error(
    'DATABASE_URL is not set. Either:\n' +
      '  1) node --env-file=apps/api/.env scripts/seed-academy.mjs\n' +
      '  2) export DATABASE_URL=... first\n',
  );
  process.exit(1);
}

const COURSE_SLUG = 'real-estate-fundamentals';

const prisma = new PrismaClient();

/**
 * Parse context.txt into { header, body } blocks keyed by section number.
 * The file uses `### **N. Title**` as section headers. Between two headers
 * the body may contain nested markdown (bullet lists, bold, blockquotes)
 * which we preserve verbatim after NFC-normalising the string.
 */
function parseContext(raw) {
  // NFC collapses comma-below vs cedilla diacritic variants (ş→ș, ţ→ț) and
  // the CR strip normalises Windows line endings so stored content doesn't
  // carry literal `\r` through to the markdown renderer.
  const text = raw.replace(/\r\n?/g, '\n').normalize('NFC');
  const sectionPattern = /^###\s+\*\*(\d+)\.\s+([^*]+)\*\*\s*$/gm;

  const matches = [];
  let match;
  while ((match = sectionPattern.exec(text)) !== null) {
    matches.push({
      index: parseInt(match[1], 10),
      title: match[2].trim(),
      headerStart: match.index,
      headerEnd: match.index + match[0].length,
    });
  }

  const sections = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const next = matches[i + 1];
    const bodyEnd = next ? next.headerStart : text.length;
    let body = text.slice(m.headerEnd, bodyEnd);
    // Trim the `---` rule between sections from both ends; also collapse
    // excess leading/trailing whitespace.
    body = body.replace(/^\s*---\s*$/gm, '').trim();
    sections.push({ index: m.index, title: m.title, body });
  }
  return sections;
}

/**
 * Text → sparse int order (10, 20, 30…) so manual reordering in admin
 * later doesn't require rewriting every row.
 */
function sparseOrder(index) {
  return index * 10;
}

/**
 * Word-count-derived reading time. Romanian reads a bit slower than English
 * on average for non-native speakers (~180 wpm); 180 is conservative.
 */
function estimateReadingMinutes(body) {
  const words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

/**
 * First paragraph becomes the excerpt. Stripped of Markdown bold/italic so
 * the listing card shows clean prose. Hard-capped to avoid unbounded rows.
 */
function deriveExcerpt(body) {
  const firstPara = body.split(/\n{2,}/)[0] ?? '';
  const plain = firstPara
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > 280 ? plain.slice(0, 277) + '…' : plain;
}

async function main() {
  const contextPath = resolve(REPO_ROOT, 'context.txt');
  const raw = readFileSync(contextPath, 'utf8');
  const sections = parseContext(raw);
  if (sections.length === 0) {
    throw new Error(
      `No sections found in ${contextPath} — check the "### **N. Title**" header pattern`,
    );
  }
  console.log(`Parsed ${sections.length} lessons from context.txt`);

  // We need a grantor for any enrollment we create — but seeding lessons
  // doesn't create enrollments, so only an AdminUser check for safety:
  // if the course is created before any admin exists the schema is still
  // consistent (no enrollments yet). OK to proceed without admins.

  const course = await prisma.course.upsert({
    where: { slug: COURSE_SLUG },
    create: {
      slug: COURSE_SLUG,
      title: {
        ro: 'Fundamentele imobiliarelor',
        en: 'Real Estate Fundamentals',
      },
      description: {
        ro: 'Curs introductiv pentru agenții imobiliari: atitudine, obiceiuri, prospectare, abordare telefonică și poziționare în piață.',
        en: 'Foundational course for real-estate agents: mindset, habits, lead generation, phone outreach, and market positioning.',
      },
      status: 'published',
      order: 10,
      publishedAt: new Date(),
    },
    update: {
      // Only refresh description metadata — leave status/order alone so a
      // re-run after someone archived or reordered doesn't undo that.
      description: {
        ro: 'Curs introductiv pentru agenții imobiliari: atitudine, obiceiuri, prospectare, abordare telefonică și poziționare în piață.',
        en: 'Foundational course for real-estate agents: mindset, habits, lead generation, phone outreach, and market positioning.',
      },
    },
  });
  console.log(`Course ready: ${course.slug} (${course.id})`);

  for (const section of sections) {
    const slug = slugify(section.title, section.index);
    const excerpt = deriveExcerpt(section.body);
    // Reading-time estimate is computed at serve time from content, so we
    // no longer persist a per-lesson duration for text lessons. Kept the
    // console log for parity with the original seed output.
    const minutes = estimateReadingMinutes(section.body);
    await prisma.lesson.upsert({
      where: {
        courseId_slug: { courseId: course.id, slug },
      },
      create: {
        courseId: course.id,
        slug,
        order: sparseOrder(section.index),
        title: { ro: section.title, en: '' },
        excerpt: { ro: excerpt, en: '' },
        content: { ro: section.body, en: '' },
        type: 'text',
        status: 'published',
        publishedAt: new Date(),
      },
      update: {
        // Content-only refresh on re-seed. Order + status stay sticky so
        // manual admin edits aren't reverted.
        title: { ro: section.title, en: '' },
        excerpt: { ro: excerpt, en: '' },
        content: { ro: section.body, en: '' },
      },
    });
    console.log(
      `  #${section.index.toString().padStart(2, '0')} ${slug} (~${minutes} min)`,
    );
  }

  console.log('Done.');
}

/**
 * Build a URL-friendly slug from a Romanian title. Diacritics fold to ASCII
 * equivalents, punctuation drops, spaces → hyphens. Numeric prefix preserves
 * sequence even if titles collide after normalization.
 */
function slugify(title, index) {
  const folded = title
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const prefix = index.toString().padStart(2, '0');
  return `${prefix}-${folded}`.slice(0, 120);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
