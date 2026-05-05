#!/usr/bin/env node
// @ts-check
/**
 * Imports the WhatsApp-exported lessons in `lessons.txt` (one record per
 * timestamped message from Claudiu Dumitrache) into the existing
 * `real-estate-fundamentals` Academy course, *appending* to whatever is
 * already there. The first ~24 timestamped messages overlap with the
 * hand-polished lessons that were seeded earlier from `context.txt` —
 * those are skipped so the editorial polish (sentence-cased titles,
 * markdown bullets, blockquotes) survives this import. Everything past
 * that overlap window is inserted as new published lessons in send order;
 * the author has stated he'll re-chapter them in the admin UI later.
 *
 * Usage:
 *   pnpm seed:academy:lessons
 *   # or, equivalently:
 *   node --env-file=apps/api/.env scripts/import-lessons-from-whatsapp.mjs
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
      '  1) node --env-file=apps/api/.env scripts/import-lessons-from-whatsapp.mjs\n' +
      '  2) export DATABASE_URL=... first\n',
  );
  process.exit(1);
}

const COURSE_SLUG = 'real-estate-fundamentals';
const LESSONS_FILE = process.env.LESSONS_FILE
  ? resolve(process.env.LESSONS_FILE)
  : resolve(REPO_ROOT, 'lessons.txt');
const DRY_RUN = process.argv.includes('--dry-run');

const prisma = new PrismaClient();

/**
 * Parse the WhatsApp export. The format is one record per line that
 * starts with `[DD/MM/YYYY, HH:MM:SS] Claudiu Dumitrache: <title>`,
 * followed by zero or more body lines until the next timestamped header
 * (or EOF).
 */
function parseExport(raw) {
  const text = raw.replace(/\r\n?/g, '\n').normalize('NFC');
  const headerRe =
    /^\[(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})\] Claudiu Dumitrache: (.*)$/gm;

  const headers = [];
  let m;
  while ((m = headerRe.exec(text)) !== null) {
    headers.push({
      titleLine: m[7],
      headerStart: m.index,
      headerEnd: m.index + m[0].length,
    });
  }

  const records = [];
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    const next = headers[i + 1];
    const bodyEnd = next ? next.headerStart : text.length;
    // Body starts on the line *after* the header line. The header match
    // ends at the end-of-line for the header (no trailing \n consumed),
    // so trim the leading \n (if any) before slicing.
    let body = text.slice(h.headerEnd, bodyEnd).replace(/^\n/, '');
    body = trimTrailingBlankLines(body);
    records.push({
      title: h.titleLine.trim(),
      body,
    });
  }
  return records;
}

function trimTrailingBlankLines(s) {
  return s.replace(/\s+$/g, '');
}

const DELETED_RE = /^‎?This message was deleted\.$/;
const HANDOFF_RE = /^Bună ziua Vlad!/;

function applyFilters(records) {
  const seenTitles = new Set();
  const kept = [];
  let droppedDeleted = 0;
  let droppedDuplicate = 0;
  let droppedHandoff = 0;

  for (const r of records) {
    if (DELETED_RE.test(r.title)) {
      droppedDeleted++;
      continue;
    }
    if (HANDOFF_RE.test(r.title)) {
      droppedHandoff++;
      continue;
    }
    if (seenTitles.has(r.title)) {
      droppedDuplicate++;
      continue;
    }
    seenTitles.add(r.title);
    kept.push(r);
  }

  return { kept, droppedDeleted, droppedDuplicate, droppedHandoff };
}

/** First paragraph of the body, stripped to plain prose, capped at 280 chars. */
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

/**
 * Build a URL-friendly slug from a Romanian title. 3-digit numeric prefix
 * keeps lex order intact past 99 (this batch will land at #025 .. #180-ish).
 */
function slugify(title, index) {
  const folded = title
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const prefix = String(index).padStart(3, '0');
  return `${prefix}-${folded}`.slice(0, 120);
}

async function main() {
  const raw = readFileSync(LESSONS_FILE, 'utf8');
  const parsed = parseExport(raw);
  const { kept, droppedDeleted, droppedDuplicate, droppedHandoff } =
    applyFilters(parsed);
  console.log(
    `Parsed ${parsed.length} timestamped records → kept ${kept.length} ` +
      `(dropped ${droppedDeleted} deleted, ${droppedDuplicate} duplicate, ${droppedHandoff} handoff)`,
  );

  const course = await prisma.course.findUnique({
    where: { slug: COURSE_SLUG },
    select: { id: true },
  });
  if (!course) {
    throw new Error(
      `Course "${COURSE_SLUG}" does not exist. Run \`pnpm seed:academy\` first.`,
    );
  }

  const existingCount = await prisma.lesson.count({
    where: { courseId: course.id },
  });
  if (existingCount === 0) {
    throw new Error(
      `No lessons in course "${COURSE_SLUG}". Run \`pnpm seed:academy\` first ` +
        `to seed the polished baseline; this script appends after it.`,
    );
  }
  if (existingCount > kept.length) {
    throw new Error(
      `Course already has ${existingCount} lessons but the export only contains ` +
        `${kept.length} candidates — refusing to run to avoid corrupting state.`,
    );
  }

  const maxOrderRow = await prisma.lesson.aggregate({
    where: { courseId: course.id },
    _max: { order: true },
  });
  const baseOrder = maxOrderRow._max.order ?? 0;

  const toImport = kept.slice(existingCount);
  console.log(
    `Skipping first ${existingCount} (already-polished overlap). ` +
      `Importing ${toImport.length} new lesson(s) starting at order ${baseOrder + 10}.`,
  );

  let created = 0;
  let refreshed = 0;
  for (let i = 0; i < toImport.length; i++) {
    const r = toImport[i];
    const positionInCourse = existingCount + i + 1;
    const order = baseOrder + (i + 1) * 10;
    const slug = slugify(r.title, positionInCourse);
    const excerpt = deriveExcerpt(r.body);

    const existing = await prisma.lesson.findUnique({
      where: { courseId_slug: { courseId: course.id, slug } },
      select: { id: true },
    });

    if (existing) {
      if (!DRY_RUN) {
        await prisma.lesson.update({
          where: { id: existing.id },
          data: {
            // Refresh content only — leave order/status sticky so manual
            // admin reordering or unpublishing isn't undone by re-runs.
            title: { ro: r.title, en: '' },
            excerpt: { ro: excerpt, en: '' },
            content: { ro: r.body, en: '' },
          },
        });
      }
      refreshed++;
    } else {
      if (!DRY_RUN) {
        await prisma.lesson.create({
          data: {
            courseId: course.id,
            slug,
            order,
            title: { ro: r.title, en: '' },
            excerpt: { ro: excerpt, en: '' },
            content: { ro: r.body, en: '' },
            type: 'text',
            status: 'published',
            publishedAt: new Date(),
          },
        });
      }
      created++;
    }

    console.log(
      `  ${DRY_RUN ? '[dry] ' : ''}#${String(positionInCourse).padStart(3, '0')} order=${order} ${slug}`,
    );
  }

  console.log(
    `${DRY_RUN ? '[DRY-RUN] Would create' : 'Done. Created'} ${created} new, ` +
      `${DRY_RUN ? 'would refresh' : 'refreshed'} ${refreshed} existing, ` +
      `skipped ${existingCount} polished + ` +
      `${droppedDeleted + droppedDuplicate + droppedHandoff} filtered.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
