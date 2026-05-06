#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const API_BASE_URL =
  process.env.API_BASE_URL ?? "https://tge-api.fly.dev/api/v1";
const MANIFEST_PATH =
  process.env.CITY_IMAGE_MANIFEST ??
  "docs/revery-city-images.manifest.json";
const DOWNLOAD_DIR =
  process.env.CITY_IMAGE_DOWNLOAD_DIR ?? ".codex-dev-logs/city-images";

const args = new Set(process.argv.slice(2));
const mode = args.has("--apply")
  ? "apply"
  : args.has("--discover")
    ? "discover"
    : "dry-run";
const replaceExisting = args.has("--replace-existing");
const clearUnapprovedExisting = args.has("--clear-unapproved-existing");
const selectedSlugs = new Set(
  (process.env.CITY_IMAGE_SLUGS ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean),
);

const ALLOWED_LICENSE = /\b(cc0|public domain)\b/i;
const PLACEHOLDER_RE = /\/images\/cities\/placeholder\.jpg|\/uploads\/placeholder-city\.png/i;
const HIDDEN_SLUGS = new Set(["reghin", "tarnaveni"]);
const MANUAL_REJECT_SLUGS = new Set([
  "alexandria",
  "miercurea-ciuc",
  "vaslui",
  "zalau",
]);
const REQUEST_DELAY_MS = Number(process.env.WIKIMEDIA_REQUEST_DELAY_MS ?? 1250);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function usage() {
  console.log(`Usage:
  node scripts/populate-revery-city-images.mjs --discover
  node scripts/populate-revery-city-images.mjs
  node scripts/populate-revery-city-images.mjs --apply [--replace-existing] [--clear-unapproved-existing]

Environment:
  API_BASE_URL              defaults to ${API_BASE_URL}
  CITY_IMAGE_MANIFEST       defaults to ${MANIFEST_PATH}
  CITY_IMAGE_DOWNLOAD_DIR   defaults to ${DOWNLOAD_DIR}
  CITY_IMAGE_SLUGS          optional comma-separated slug allowlist
  ADMIN_ACCESS_TOKEN        bearer token for --apply
  ADMIN_EMAIL               used with ADMIN_PASSWORD for --apply login
  ADMIN_PASSWORD            used with ADMIN_EMAIL for --apply login

Policy:
  Manifest-approved images are uploaded. Use --replace-existing when replacing
  existing R2 city images during a curation pass.
`);
}

if (args.has("--help") || args.has("-h")) {
  usage();
  process.exit(0);
}

async function fetchJson(url, init, attempt = 1) {
  await sleep(REQUEST_DELAY_MS);
  const res = await fetch(url, {
    ...init,
    headers: {
      "User-Agent": "TGE-Revery-city-image-populator/1.0 ops-contact=admin@transylvaniagrandestate.ro",
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 429 && attempt <= 4) {
    const retryAfter = Number(res.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter)
      ? retryAfter * 1000
      : REQUEST_DELAY_MS * attempt * 4;
    process.stderr.write(`rate limited; retrying in ${Math.round(waitMs / 1000)}s\n`);
    await sleep(waitMs);
    return fetchJson(url, init, attempt + 1);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} from ${url}: ${text}`);
  }
  return res.json();
}

async function fetchCities(site = "REVERY") {
  const url = `${API_BASE_URL}/cities?limit=200&sort=name_asc`;
  const json = await fetchJson(url, { headers: { "X-Site": site } });
  return Array.isArray(json) ? json : (json.data ?? []);
}

function commonsFileUrlToTitle(imageValue) {
  return `File:${imageValue.replace(/^File:/i, "")}`;
}

async function findWikidataEntity(city) {
  const query = `${city.name} Romania`;
  const url =
    "https://www.wikidata.org/w/api.php?" +
    new URLSearchParams({
      action: "wbsearchentities",
      search: query,
      language: "en",
      format: "json",
      limit: "5",
    });
  const data = await fetchJson(url);
  return (data.search ?? []).find((candidate) => /^Q\d+$/.test(candidate.id));
}

async function getEntityImage(entityId) {
  const data = await fetchJson(
    `https://www.wikidata.org/wiki/Special:EntityData/${entityId}.json`,
  );
  const entity = data.entities?.[entityId];
  const claim = entity?.claims?.P18?.[0];
  return claim?.mainsnak?.datavalue?.value ?? null;
}

async function getCommonsImageInfo(fileTitle) {
  const url =
    "https://commons.wikimedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      titles: fileTitle,
      prop: "imageinfo",
      iiprop: "url|mime|size|extmetadata",
      iiurlwidth: "1600",
      format: "json",
      formatversion: "2",
    });
  const data = await fetchJson(url);
  const page = data.query?.pages?.[0];
  return page?.imageinfo?.[0] ? { page, image: page.imageinfo[0] } : null;
}

async function searchCommonsImages(city) {
  const search = `${city.name} Romania -coat -arms -flag -map`;
  const url =
    "https://commons.wikimedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: search,
      gsrnamespace: "6",
      gsrlimit: "20",
      prop: "imageinfo",
      iiprop: "url|mime|size|extmetadata",
      iiurlwidth: "1600",
      format: "json",
      formatversion: "2",
    });
  const data = await fetchJson(url);
  return data.query?.pages ?? [];
}

function textMeta(extmetadata, key) {
  return String(extmetadata?.[key]?.value ?? "").replace(/<[^>]+>/g, " ").trim();
}

function licenseSummary(extmetadata) {
  return [
    textMeta(extmetadata, "LicenseShortName"),
    textMeta(extmetadata, "UsageTerms"),
    textMeta(extmetadata, "License"),
  ]
    .filter(Boolean)
    .join(" | ");
}

function isAcceptableCandidate(info) {
  if (!info?.image?.url) return false;
  if (!/^image\/(jpeg|png|webp)$/i.test(info.image.mime ?? "")) return false;
  return ALLOWED_LICENSE.test(licenseSummary(info.image.extmetadata));
}

function isLikelyPhotoTitle(title) {
  return !/\b(coat|arms|flag|map|location|locator|seal|logo|herb|stema|stadion|stadium|football|fotbal|voința|minerul|progresul|policeman|evacuees|destruction|destroyed|réservoirs|reptiles|zoo|bus)\b/i.test(title);
}

function applyCommonsInfo(entry, info, notes) {
  const license = licenseSummary(info.image.extmetadata);
  entry.sourceUrl = info.image.url;
  entry.downloadUrl = info.image.thumburl ?? info.image.url;
  entry.sourcePage = info.image.descriptionurl ?? null;
  entry.license = license || null;
  entry.author = textMeta(info.image.extmetadata, "Artist") || null;
  entry.width = info.image.width ?? null;
  entry.height = info.image.height ?? null;
  entry.approved = true;
  entry.needsReview = false;
  entry.notes = notes;
}

async function discoverEntry(city) {
  const entry = {
    slug: city.slug,
    cityName: city.name,
    currentImage: city.image,
    approved: false,
    needsReview: true,
    sourceUrl: null,
    downloadUrl: null,
    sourcePage: null,
    commonsFile: null,
    wikidataEntity: null,
    license: null,
    author: null,
    width: null,
    height: null,
    sha256: null,
    notes: "No CC0/Public Domain Wikidata P18 candidate found.",
  };

  if (HIDDEN_SLUGS.has(city.slug)) {
    entry.needsReview = false;
    entry.notes = "Hidden from public Revery scope; skipped.";
    return entry;
  }
  if (MANUAL_REJECT_SLUGS.has(city.slug)) {
    entry.needsReview = false;
    entry.notes =
      "Skipped: automatic Commons matches were not reliable city/location imagery under the strict license policy.";
    return entry;
  }

  async function applyCommonsSearchFallback(prefix) {
    const pages = await searchCommonsImages(city);
    const accepted = pages.find(
      (page) =>
        isLikelyPhotoTitle(page.title ?? "") &&
        isAcceptableCandidate({ page, image: page.imageinfo?.[0] }),
    );
    if (!accepted) return false;
    entry.commonsFile = accepted.title;
    applyCommonsInfo(
      entry,
      { page: accepted, image: accepted.imageinfo[0] },
      `${prefix} Accepted automatically from Commons search: title passed non-photo filters and metadata explicitly matches CC0/Public Domain.`,
    );
    return true;
  }

  const entity = await findWikidataEntity(city);
  if (!entity) {
    await applyCommonsSearchFallback("No Wikidata entity found.");
    return entry;
  }

  entry.wikidataEntity = entity.id;
  const imageName = await getEntityImage(entity.id);
  if (!imageName) {
    entry.notes = `Wikidata entity ${entity.id} has no P18 image.`;
    await applyCommonsSearchFallback(entry.notes);
    return entry;
  }

  const fileTitle = commonsFileUrlToTitle(imageName);
  const info = await getCommonsImageInfo(fileTitle);
  entry.commonsFile = fileTitle;

  if (!info) {
    entry.notes = `Commons metadata missing for ${fileTitle}.`;
    return entry;
  }

  const license = licenseSummary(info.image.extmetadata);
  entry.sourceUrl = info.image.url;
  entry.downloadUrl = info.image.thumburl ?? info.image.url;
  entry.sourcePage = info.image.descriptionurl ?? null;
  entry.license = license || null;
  entry.author = textMeta(info.image.extmetadata, "Artist") || null;
  entry.width = info.image.width ?? null;
  entry.height = info.image.height ?? null;

  if (isAcceptableCandidate(info)) {
    applyCommonsInfo(
      entry,
      info,
      "Accepted automatically from Wikidata P18: Commons metadata explicitly matches CC0/Public Domain.",
    );
    return entry;
  }

  entry.notes = `Wikidata P18 rejected by strict license gate: ${license || "unknown license"}.`;

  await applyCommonsSearchFallback(entry.notes);
  return entry;
}

async function readManifest() {
  const raw = await readFile(MANIFEST_PATH, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.entries)) {
    throw new Error(`${MANIFEST_PATH} must contain an entries array`);
  }
  return parsed;
}

async function writeManifest(entries) {
  const manifest = {
    generatedAt: new Date().toISOString(),
    policy: "Only CC0/Public Domain images are approved. Other free-use licenses are rejected.",
    sourceStrategy: "Wikidata P18 city image, license-checked via Wikimedia Commons imageinfo extmetadata.",
    apiBaseUrl: API_BASE_URL,
    entries,
  };
  await mkdir(join(MANIFEST_PATH, ".."), { recursive: true }).catch(() => {});
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function downloadApproved(entry, attempt = 1) {
  if (!entry.approved || !entry.sourceUrl) return null;
  await mkdir(DOWNLOAD_DIR, { recursive: true });
  const url = new URL(entry.downloadUrl ?? entry.sourceUrl);
  const ext = basename(url.pathname).split(".").pop()?.toLowerCase() || "jpg";
  const filename = `${entry.slug}.${ext === "jpeg" ? "jpg" : ext}`;
  const filepath = join(DOWNLOAD_DIR, filename);
  await sleep(REQUEST_DELAY_MS);
  const res = await fetch(entry.downloadUrl ?? entry.sourceUrl, {
    headers: { "User-Agent": "TGE-Revery-city-image-populator/1.0 ops-contact=admin@transylvaniagrandestate.ro" },
  });
  if (res.status === 429 && attempt <= 4) {
    const retryAfter = Number(res.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter)
      ? retryAfter * 1000
      : REQUEST_DELAY_MS * attempt * 4;
    process.stderr.write(`download rate limited for ${entry.slug}; retrying in ${Math.round(waitMs / 1000)}s\n`);
    await sleep(waitMs);
    return downloadApproved(entry, attempt + 1);
  }
  if (!res.ok) throw new Error(`Download failed for ${entry.slug}: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  await writeFile(filepath, buffer);
  return {
    filepath,
    sha256,
    contentType: res.headers.get("content-type") ?? "image/jpeg",
  };
}

async function getAccessToken() {
  if (process.env.ADMIN_ACCESS_TOKEN) return process.env.ADMIN_ACCESS_TOKEN;
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error("Set ADMIN_ACCESS_TOKEN or ADMIN_EMAIL + ADMIN_PASSWORD for --apply.");
  }
  const data = await fetchJson(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Site": "ADMIN" },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }),
  });
  const token = data?.data?.accessToken ?? data?.accessToken;
  if (!token) throw new Error("Login response did not include an access token.");
  return token;
}

async function uploadCityImage(city, download, token) {
  const blob = new Blob([await readFile(download.filepath)], {
    type: download.contentType,
  });
  const form = new FormData();
  form.set("image", blob, basename(download.filepath));

  const res = await fetch(`${API_BASE_URL}/cities/${city.id}/image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Site": "ADMIN",
    },
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Upload failed for ${city.slug}: ${res.status} ${JSON.stringify(body)}`);
  }
  return body?.data ?? body;
}

async function main() {
  if (mode === "discover") {
    const cities = await fetchCities("REVERY");
    const entries = [];
    for (const city of cities) {
      process.stderr.write(`discover ${city.slug}\n`);
      entries.push(await discoverEntry(city));
    }
    await writeManifest(entries);
    const approved = entries.filter((entry) => entry.approved).length;
    console.log(`Wrote ${MANIFEST_PATH}: ${approved}/${entries.length} entries approved.`);
    return;
  }

  const manifest = await readManifest();
  const cities = await fetchCities("ADMIN");
  const cityBySlug = new Map(cities.map((city) => [city.slug, city]));
  const visible = new Set((await fetchCities("REVERY")).map((city) => city.slug));
  const token = mode === "apply" ? await getAccessToken() : null;
  const results = [];

  for (const entry of manifest.entries) {
    if (selectedSlugs.size > 0 && !selectedSlugs.has(entry.slug)) {
      results.push({ slug: entry.slug, status: "skip", reason: "not selected" });
      continue;
    }
    const city = cityBySlug.get(entry.slug);
    if (!city || !visible.has(entry.slug)) {
      results.push({ slug: entry.slug, status: "skip", reason: "not public Revery city" });
      continue;
    }
    if (!entry.approved) {
      if (clearUnapprovedExisting && city.image && !PLACEHOLDER_RE.test(city.image)) {
        if (mode === "dry-run") {
          results.push({ slug: entry.slug, status: "would-clear", reason: entry.notes ?? "not approved" });
        } else {
          const res = await fetch(`${API_BASE_URL}/cities/${city.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              "X-Site": "ADMIN",
            },
            body: JSON.stringify({ image: "/images/cities/placeholder.jpg" }),
          });
          if (!res.ok) throw new Error(`Clear failed for ${city.slug}: ${res.status}`);
          results.push({ slug: entry.slug, status: "cleared", reason: entry.notes ?? "not approved" });
        }
        continue;
      }
      results.push({ slug: entry.slug, status: "skip", reason: entry.notes ?? "not approved" });
      continue;
    }
    if (city.image?.includes("r2.dev/cities/") && !replaceExisting) {
      results.push({ slug: entry.slug, status: "skip", reason: `already has R2 image ${city.image}` });
      continue;
    }
    if (!replaceExisting && city.image && !PLACEHOLDER_RE.test(city.image)) {
      results.push({ slug: entry.slug, status: "skip", reason: `already has non-placeholder image ${city.image}` });
      continue;
    }

    const download = await downloadApproved(entry);
    entry.sha256 = download.sha256;
    if (mode === "dry-run") {
      results.push({ slug: entry.slug, status: "would-upload", source: entry.sourcePage, sha256: download.sha256 });
      continue;
    }

    const updated = await uploadCityImage(city, download, token);
    results.push({ slug: entry.slug, status: "uploaded", image: updated.image, sha256: download.sha256 });
  }

  if (mode === "apply" || mode === "dry-run") await writeManifest(manifest.entries);
  console.table(results);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
