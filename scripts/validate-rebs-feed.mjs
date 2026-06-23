#!/usr/bin/env node
// @ts-check
/**
 * Read-only REBS feed validator — proves the API key authenticates and surfaces
 * the REAL field vocabulary so we can confirm/extend the mapper BEFORE going
 * live. Touches no database and imports no app code, so it always runs.
 *
 * Usage (key + base URL go in apps/api/.env — never committed):
 *   pnpm rebs:validate
 *   # i.e. node --env-file=apps/api/.env scripts/validate-rebs-feed.mjs
 *
 * Reports: auth status, meta.total_count, for_sale split, distinct
 * `property_type` values (flagging any our mapper wouldn't recognize),
 * currency_sale distribution, image-field shapes, and a few raw samples.
 *
 * NOTE: the authoritative REBS→domain mapping lives in the TypeScript adapter
 * (`apps/api/src/crm-sync/adapters/rebs/rebs.mapper.ts`). The type-recognition
 * check below MIRRORS `mapPropertyType` for diagnostics only — if you change
 * one, change the other.
 */

const API_KEY = process.env.REBS_API_KEY ?? '';
const BASE_URL = (
  process.env.REBS_BASE_URL ?? 'https://client-396fe343.crmrebs.com/api/public'
).replace(/\/+$/, '');

const MAX_PAGES = 5;
const PAGE_LIMIT = 50;
const REQUEST_TIMEOUT_MS = 20_000;

if (!API_KEY) {
  console.error(
    'REBS not configured — set REBS_API_KEY (and optionally REBS_BASE_URL) in apps/api/.env',
  );
  process.exit(1);
}

/** Mirrors mapPropertyType() keyword recognition (diagnostic only). */
function recognizesType(raw) {
  const t = (raw ?? '').toLowerCase();
  if (!t) return false;
  return [
    'apartament', 'garsonier', 'apart', 'penthouse', 'vil', 'conac',
    'mansion', 'palat', 'palace', 'cabana', 'chalet', 'teren', 'lot',
    'terrain', 'casa', 'casă', 'house',
  ].some((k) => t.includes(k));
}

function truthy(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return ['1', 'true', 'yes', 'da'].includes(v.toLowerCase());
  return false;
}

function resolveNext(next) {
  if (!next) return null;
  if (/^https?:\/\//i.test(next)) return next;
  const origin = new URL(BASE_URL).origin;
  return `${origin}${next.startsWith('/') ? '' : '/'}${next}`;
}

async function fetchPage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Authorization: API_KEY, Accept: 'application/json' }, // raw key, NOT Bearer
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

/** Describe an image-array entry's shape: 'string' or 'object{keys}'. */
function imageShape(entry) {
  if (typeof entry === 'string') return 'string';
  if (entry && typeof entry === 'object') {
    return `object{${Object.keys(entry).join(',')}}`;
  }
  return typeof entry;
}

function tally(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function printTally(label, map) {
  console.log(`\n${label}:`);
  const rows = [...map.entries()].sort((a, b) => b[1] - a[1]);
  if (rows.length === 0) console.log('  (none)');
  for (const [k, n] of rows) console.log(`  ${String(n).padStart(5)}  ${k}`);
}

(async () => {
  console.log(`REBS feed validation → ${BASE_URL}`);
  console.log(`(reading up to ${MAX_PAGES} pages × ${PAGE_LIMIT})\n`);

  let url = `${BASE_URL}/property/?limit=${PAGE_LIMIT}`;
  let page = 0;
  let total = 0;
  let totalCount = null;

  const forSale = new Map();
  const types = new Map();
  const currencies = new Map();
  const imageShapes = new Map();
  const samples = [];

  while (url && page < MAX_PAGES) {
    const res = await fetchPage(url);

    if (page === 0) {
      if (res.status === 401 || res.status === 403) {
        console.error(
          `❌ AUTH FAILED (HTTP ${res.status}). The key was rejected — check REBS_API_KEY and that the instance (${BASE_URL}) matches the key.`,
        );
        process.exit(2);
      }
      if (!res.ok) {
        console.error(`❌ HTTP ${res.status} on first page — feed unreachable.`);
        process.exit(2);
      }
      console.log(`✅ Authenticated (HTTP ${res.status}).`);
    }
    if (!res.ok) {
      console.error(`page ${page + 1}: HTTP ${res.status}, stopping.`);
      break;
    }

    const json = await res.json();
    const meta = json.meta ?? {};
    const objects = json.objects ?? [];
    if (totalCount == null && typeof meta.total_count === 'number') {
      totalCount = meta.total_count;
    }

    for (const o of objects) {
      total++;
      tally(forSale, truthy(o.for_sale) ? 'for_sale=true' : 'for_sale=false/absent');
      const pt = (o.property_type ?? '(none)').toString();
      tally(types, recognizesType(o.property_type) ? pt : `⚠ UNMAPPED: ${pt}`);
      tally(currencies, (o.currency_sale ?? '(none)').toString());

      for (const field of ['full_images', 'resized_images', 'sketches']) {
        const arr = o[field];
        if (Array.isArray(arr) && arr.length > 0) {
          tally(imageShapes, `${field}: ${imageShape(arr[0])}`);
        }
      }
      if (o.thumbnail != null) tally(imageShapes, `thumbnail: ${imageShape(o.thumbnail)}`);

      if (samples.length < 3) {
        samples.push({
          id: o.id,
          internal_id: o.internal_id,
          property_type: o.property_type,
          city: o.city,
          price_sale: o.price_sale,
          currency_sale: o.currency_sale,
          for_sale: o.for_sale,
          images: Array.isArray(o.full_images) ? o.full_images.length : 0,
        });
      }
    }

    page++;
    url = resolveNext(meta.next);
  }

  console.log(`\nmeta.total_count (full feed): ${totalCount ?? 'unknown'}`);
  console.log(`objects inspected: ${total} (first ${page} page(s))`);
  printTally('for_sale split', forSale);
  printTally('property_type (⚠ = mapper would SKIP it)', types);
  printTally('currency_sale', currencies);
  printTally('image field shapes', imageShapes);

  console.log('\nsample objects:');
  console.log(JSON.stringify(samples, null, 2));

  const unmapped = [...types.keys()].filter((k) => k.startsWith('⚠ UNMAPPED'));
  if (unmapped.length > 0) {
    console.log(
      `\n⚠ ${unmapped.length} property_type value(s) are NOT recognized by the mapper and would be skipped. ` +
        `Extend mapPropertyType() in apps/api/src/crm-sync/adapters/rebs/rebs.mapper.ts before go-live.`,
    );
  } else {
    console.log('\n✅ All observed property_type values are handled by the mapper.');
  }
})().catch((err) => {
  console.error('\n❌ validation failed:', err?.message ?? err);
  process.exit(1);
});
