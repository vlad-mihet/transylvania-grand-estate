#!/usr/bin/env node
// @ts-check
/**
 * Imports the WhatsApp-exported legal lessons from `lessons-legal.txt` 
 * into a new `real-estate-legislation` Academy course.
 *
 * Usage:
 *   pnpm seed:academy:legal
 *   # or:
 *   node --env-file=apps/api/.env scripts/import-legal-lessons.mjs
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
      '  1) node --env-file=apps/api/.env scripts/import-legal-lessons.mjs\n' +
      '  2) export DATABASE_URL=... first\n',
  );
  process.exit(1);
}

const COURSE_SLUG = 'real-estate-legislation';
const LESSONS_FILE = process.env.LESSONS_FILE
  ? resolve(process.env.LESSONS_FILE)
  : resolve(REPO_ROOT, 'lessons-legal.txt');
const DRY_RUN = process.argv.includes('--dry-run');

const prisma = new PrismaClient();

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

  const course = await prisma.course.upsert({
    where: { slug: COURSE_SLUG },
    create: {
      slug: COURSE_SLUG,
      title: {
        ro: 'Legislație Imobiliară',
        en: 'Legal Requirements for Real Estate Agents',
      },
      description: {
        ro: 'Ghid juridic esențial pentru agenți imobiliari: GDPR, spălarea banilor, contracte și clauze.',
        en: 'Essential legal guide for real estate agents: GDPR, money laundering, contracts, and clauses.',
      },
      status: 'published',
      order: 20,
      publishedAt: new Date(),
    },
    update: {
      description: {
        ro: 'Ghid juridic esențial pentru agenți imobiliari: GDPR, spălarea banilor, contracte și clauze.',
        en: 'Essential legal guide for real estate agents: GDPR, money laundering, contracts, and clauses.',
      },
    },
  });

  console.log(`Course ready: ${course.slug} (${course.id})`);

  let created = 0;
  let refreshed = 0;
  for (let i = 0; i < kept.length; i++) {
    const r = kept[i];
    const positionInCourse = i + 1;
    const order = (i + 1) * 10;
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
      `filtered ${droppedDeleted + droppedDuplicate + droppedHandoff}.`,
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
