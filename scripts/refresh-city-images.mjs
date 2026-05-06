// Refresh city tile images from free-license stock CDNs (Unsplash / Pexels / Pixabay / Flickr).
//
// Why this exists: scripts/scrape-images.mjs (April 2026) hit Unsplash's now-defunct unauth
// /napi/ endpoint and produced byte-identical duplicates across 8 cities. This replacement
// uses DuckDuckGo's image-search JSON endpoint (no auth) to surface candidates, filters to
// free-license CDN hosts, and scores by whether the title actually mentions the city — so
// generic "Romania countryside" stock can't masquerade as Slobozia.
//
// Output: writes <slug>.jpg (1600×1067) into apps/landing/public/images/cities AND
// apps/revery/public/images/cities, plus a manifest at scripts/refresh-city-images.manifest.json
// for CREDITS.md updates.
//
// Run: `node scripts/refresh-city-images.mjs [slug1 slug2 ...]` (no args = all)

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
// Flickr is excluded by default: photos are licensed per-upload, often "All Rights Reserved" —
// using them commercially requires per-photo verification via the Flickr API. Unsplash /
// Pexels / Pixabay are free-for-commercial by their platform TOS regardless of who uploaded.
const FREE_HOST_RE = /^(images\.unsplash\.com|images\.pexels\.com|cdn\.pixabay\.com)$/;
const TARGET_W = 1600;
const TARGET_H = 1067;

const CITIES = [
  { slug: 'sibiu', names: ['sibiu', 'hermannstadt'], landmarks: ['piata mare', 'bridge of lies', 'turnul sfatului', 'large square'] },
  { slug: 'targu-mures', names: ['targu mures', 'tirgu mures', 'tg mures', 'mures'], landmarks: ['palace of culture', 'palatul culturii', 'rose square', 'piata trandafirilor'] },
  { slug: 'zalau', names: ['zalau', 'zilah'], landmarks: ['iuliu maniu', 'salaj'] },
  { slug: 'arad', names: ['arad'], landmarks: ['cultural palace', 'palatul cultural', 'trajan bridge', 'podul traian'] },
  { slug: 'slobozia', names: ['slobozia'], landmarks: ['ialomita'] },
  { slug: 'suceava', names: ['suceava'], landmarks: ['fortress', 'cetate', 'cetatea de scaun', 'throne citadel'] },
  { slug: 'baia-mare', names: ['baia mare'], landmarks: ['stephen tower', 'stefan tower', 'centrul vechi', 'piata libertatii'] },
  { slug: 'drobeta-turnu-severin', names: ['drobeta', 'turnu severin'], landmarks: ['water tower', 'castelul de apa', 'trajan bridge', 'danube severin'] },
  { slug: 'resita', names: ['resita'], landmarks: ['locomotive resita', 'gara resita'] },
  { slug: 'buftea', names: ['buftea'], landmarks: ['stirbei', 'castelul stirbei'] },
  { slug: 'slatina', names: ['slatina olt'], landmarks: ['ionascu', 'slatina romania olt'] },
];

const OUT_DIRS = [
  'apps/landing/public/images/cities',
  'apps/revery/public/images/cities',
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const stripDiacritics = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

async function ddgSearch(query) {
  const r1 = await fetch('https://duckduckgo.com/?q=' + encodeURIComponent(query) + '&iar=images&iax=images&ia=images', {
    headers: { 'User-Agent': UA, 'Accept': 'text/html' }
  });
  const html = await r1.text();
  const m = html.match(/vqd=([\d-]+)/);
  if (!m) return [];
  await sleep(400);
  const r2 = await fetch('https://duckduckgo.com/i.js?l=us-en&o=json&q=' + encodeURIComponent(query) + '&vqd=' + m[1] + '&f=,,,,,&p=-1', {
    headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://duckduckgo.com/' }
  });
  if (!r2.ok) return [];
  const j = await r2.json();
  return j.results || [];
}

function isFreeHost(url) {
  try {
    const u = new URL(url);
    if (!FREE_HOST_RE.test(u.host)) return false;
    // Reject Unsplash open-graph / logo / placeholder images — these are platform metadata, not photos
    if (u.host === 'images.unsplash.com' && /\/(opengraph|reserve|premium)\//i.test(u.pathname)) return false;
    return true;
  } catch { return false; }
}

function extractPhotoId(url) {
  try {
    const u = new URL(url);
    if (u.host === 'images.unsplash.com') return 'unsplash:' + (u.pathname.match(/photo-([\w-]+)/) || [, u.pathname])[1];
    if (u.host === 'images.pexels.com') return 'pexels:' + (u.pathname.match(/photos\/(\d+)/) || [, u.pathname])[1];
    if (u.host === 'cdn.pixabay.com') return 'pixabay:' + (u.pathname.match(/(\d+_\d+)/) || [, u.pathname])[1];
    if (u.host.includes('staticflickr.com')) return 'flickr:' + (u.pathname.match(/(\d+)_/) || [, u.pathname])[1];
    return u.host + ':' + u.pathname;
  } catch { return url; }
}

function highResUrl(url) {
  try {
    const u = new URL(url);
    if (u.host === 'images.unsplash.com') {
      const id = u.pathname;
      return 'https://images.unsplash.com' + id + '?auto=format&fit=crop&w=2400&q=85';
    }
    if (u.host === 'images.pexels.com') {
      // Strip thumb sizing, keep base path; Pexels honors ?auto=compress&cs=tinysrgb&w=2400
      const base = url.split('?')[0];
      return base + '?auto=compress&cs=tinysrgb&w=2400&fit=crop';
    }
    if (u.host === 'cdn.pixabay.com') return url; // pixabay paths already include sizing
    if (u.host.includes('staticflickr.com')) {
      // Caller (downloadResize) handles size fallback; pass through unchanged
      return url;
    }
    return url;
  } catch { return url; }
}

// Flickr serves multiple sizes via suffixes; not every photo has every size.
// Try big → smaller → original. Returns first successful Buffer or throws.
async function fetchFlickrWithFallback(url) {
  const sizes = ['_h', '_b', '_c', '_z', '_n', '_m', '']; // h=1600, b=1024, c=800, z=640, n=320, m=240, ''=original
  const baseMatch = url.match(/^(.+?)(_[a-z])?\.jpg$/i);
  if (!baseMatch) return null;
  const base = baseMatch[1];
  for (const s of sizes) {
    const tryUrl = base + s + '.jpg';
    const r = await fetch(tryUrl, { headers: { 'User-Agent': UA, 'Accept': 'image/*' } });
    if (r.ok) return { buf: Buffer.from(await r.arrayBuffer()), tried: tryUrl };
  }
  return null;
}

function scoreCandidate(c, city) {
  const title = (c.title || '');
  const haystack = stripDiacritics(title + ' ' + (c.source || ''));
  // Hard reject: tiny placeholder images (caught the Unsplash 1x1 opengraph bug)
  if (c.width && c.width < 600) return -1;
  // Hard reject: Unsplash search-results-page meta titles like
  // "X | N best free Y, Z and W photos on Unsplash" — these aren't actual photo pages,
  // they're keyword listing pages where the image isn't necessarily of the city.
  if (/\bbest free\b/i.test(title)) return -1;
  if (/\bphotos on Unsplash$/i.test(title) && /\band\b/i.test(title)) return -1;
  let score = 0;
  for (const n of city.names) if (haystack.includes(stripDiacritics(n))) score += 100;
  for (const l of city.landmarks) if (haystack.includes(stripDiacritics(l))) score += 60;
  // Romania mention small bonus, but only when paired with a name/landmark hit
  if (haystack.includes('romania') && score > 0) score += 5;
  // Landscape orientation bonus (we'll cover-crop, but landscape is closer)
  if (c.width && c.height && c.width > c.height) score += 10;
  // Minimum size penalty — anything under 1200 wide we'll skip
  if (c.width && c.width < 1200) score -= 50;
  return score;
}

async function findBestForCity(city, usedIds) {
  const queries = [
    `${city.names[0]} Romania unsplash`,
    `${city.names[0]} Romania pexels`,
    `${city.names[0]} Romania pixabay`,
    ...city.landmarks.slice(0, 2).map(l => `${l} ${city.names[0]} Romania`),
  ];
  const all = new Map(); // photoId -> {candidate, score, query}
  for (const q of queries) {
    let results;
    try { results = await ddgSearch(q); } catch (e) { console.warn(`  query "${q}" failed: ${e.message}`); results = []; }
    for (const r of results) {
      if (!isFreeHost(r.image)) continue;
      const id = extractPhotoId(r.image);
      if (usedIds.has(id)) continue;
      const score = scoreCandidate(r, city);
      if (score < 100) continue; // require a real city/landmark mention
      if (score < 0) continue;   // hard rejects (placeholders etc.)
      const prior = all.get(id);
      if (!prior || score > prior.score) all.set(id, { candidate: r, score, query: q });
    }
    await sleep(900);
  }
  if (!all.size) return null;
  const sorted = [...all.values()].sort((a, b) => b.score - a.score);
  return sorted[0];
}

async function downloadResize(url, outPaths) {
  let buf;
  if (url.includes('staticflickr.com')) {
    const got = await fetchFlickrWithFallback(url);
    if (!got) throw new Error('flickr: no size variant available');
    buf = got.buf;
  } else {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'image/*' } });
    if (!r.ok) throw new Error(`download ${r.status}`);
    buf = Buffer.from(await r.arrayBuffer());
  }
  const out = await sharp(buf)
    .resize(TARGET_W, TARGET_H, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
  for (const p of outPaths) fs.writeFileSync(p, out);
  return out.length;
}

const argv = process.argv.slice(2);
const filter = argv.length ? new Set(argv) : null;
const cities = filter ? CITIES.filter(c => filter.has(c.slug)) : CITIES;

const usedIds = new Set();
const manifest = [];
const failures = [];

for (const city of cities) {
  console.log(`\n[${city.slug}]`);
  const pick = await findBestForCity(city, usedIds);
  if (!pick) {
    console.log(`  ✗ no candidate matched (no free-CDN hit mentioned the city by name)`);
    failures.push(city.slug);
    continue;
  }
  const id = extractPhotoId(pick.candidate.image);
  usedIds.add(id);
  const dl = highResUrl(pick.candidate.image);
  console.log(`  ✓ ${pick.score}pt via "${pick.query}"`);
  console.log(`    title: ${(pick.candidate.title || '').slice(0, 80)}`);
  console.log(`    src:   ${dl.slice(0, 100)}`);
  const outs = OUT_DIRS.map(d => path.join(d, city.slug + '.jpg'));
  try {
    const bytes = await downloadResize(dl, outs);
    console.log(`    wrote ${(bytes / 1024 | 0)}KB → ${outs.length} dirs`);
    manifest.push({
      slug: city.slug,
      photoId: id,
      score: pick.score,
      title: pick.candidate.title,
      sourcePage: pick.candidate.url,
      cdnUrl: pick.candidate.image,
      downloadUrl: dl,
      query: pick.query,
    });
  } catch (e) {
    console.log(`    ✗ download/resize failed: ${e.message}`);
    failures.push(city.slug);
  }
  await sleep(1200);
}

fs.writeFileSync('scripts/refresh-city-images.manifest.json', JSON.stringify(manifest, null, 2));
console.log(`\n=== summary ===`);
console.log(`success: ${manifest.length} / ${cities.length}`);
if (failures.length) console.log(`failed: ${failures.join(', ')}`);
console.log(`manifest: scripts/refresh-city-images.manifest.json`);
