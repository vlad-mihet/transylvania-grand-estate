# Handoff — City hero images (TGE + Adorys), local + prod

**For:** Claude Code, running inside the TGE monorepo.
**Goal:** get a hero image live for each city on both platforms — TGE (`tge`) and Adorys (`revery`) — in local, then prod.
**Author:** prep done in Cowork (mapping, sourcing, reverse-search, repo recon). This brief is implementation-ready; read the three decisions first — one of them may need a schema change.

---

## Inputs (in `orase-mapping/` next to this file)

- **`orase-images-manifest.json`** — the machine-readable payload. 27 cities, 35 image slots (8 cities have both `tge` and `revery`). Per slot: `whatsapp_file`, `original_copyright`, `final_plan`, `final_asset_url`, `final_license`, `note`.
- `orase-platforme-mapping.xlsx` — original WhatsApp images with thumbnails + quality flags (context).
- `orase-surse-imagini.xlsx` — curated high-res sources per city/brand (the vetted replacements).
- `orase-origini-reverse.xlsx` — reverse-search provenance + copyright per image.
- **`renamed/`** — 35 slug-named copies of Claudiu's original WhatsApp images (e.g. `tge_cluj-napoca.jpg`, `adorys_buzau.jpg`). **Low resolution — first-pass seed only, not final assets.**

---

## Repo facts (verified — don't re-derive)

**Model** (`packages/types/src/schemas/city.ts`, `apps/api/prisma/schema.prisma`)
- `City` has a single `image String` field. Keyed by unique `slug`, scoped to a `county` (FK `countyId`).
- Brand membership is a join table `city_brands` (`CityBrand`, enum `Brand { tge, revery }`). A city can be tagged `tge`, `revery`, or both.
- **There is NO per-brand image column.** One image per city, shared across brands. (See Decision 1.)

**Storage** (`apps/api/src/uploads/`)
- Local: `STORAGE_TYPE=local` → files under `apps/api/uploads/cities/<uuid>.<ext>`, served at `/uploads/cities/...`.
- Prod: `STORAGE_TYPE=r2` → Cloudflare R2 bucket `tge-uploads`, key `cities/<uuid>.<ext>`, public URL `${R2_PUBLIC_URL}/cities/...`.
- Constraints: ≤ 5 MB, `image/jpeg|png|webp|avif`, **no SVG**.

**Seed** (`apps/api/prisma/seed.ts`, data in `packages/data/src/cities.ts`)
- 41 county-seat cities are seeded statically. Each row already points `image` at **`/images/cities/<slug>.jpg`** (a *static* frontend-public path, NOT the `/uploads` R2 path).
- Cities upsert by slug (non-destructive); `image` is updated on every seed run. Brand membership seeded idempotently.
- Run (local): `cd apps/api && pnpm prisma migrate deploy && pnpm prisma db seed`
- Run (prod, manual): `fly ssh console -a tge-api -C 'cd /app && npx prisma db seed'`

**Environments**
- Local: Postgres in Docker (`postgresql://postgres:password@localhost:5435/tge_dev`), `STORAGE_TYPE=local`.
- Prod: Fly.io apps + Neon Postgres + Cloudflare R2. Env that changes: `DATABASE_URL`, `STORAGE_TYPE`, `R2_*`, `NEXT_PUBLIC_API_URL`.

---

## Decisions to confirm with Vlad BEFORE building

### Decision 1 — Per-brand images (schema gap)
Claudiu explicitly wanted **different images per platform** for 8 cities (`cluj-napoca, bistrita, oradea, arad, sibiu, targu-mures, craiova, sighisoara`). The schema stores **one image per city**, so this can't be honored as-is.

- **Option A — ship one image per city (recommended now).** For the 8 dual cities, pick one. The aerial/premium frame reads well on both, so default to the `tge` image where a city has both, else the `revery` image. No schema change. Claudiu's differentiation is deferred.
- **Option B — honor per-brand (follow-up).** Add `image String?` to `CityBrand` (per-brand-membership image), fall back to `City.image` when null. Cleanest per-brand model; needs a migration, API/DTO change, admin form change, and read-path change in `landing` + `revery`. Disproportionate for now unless Claudiu insists.

Recommendation: **A now, B later if it actually matters.**

### Decision 2 — Which assets feed the seed
- **Phase 1 (go live today):** seed with the `renamed/` WhatsApp copies so both platforms render end-to-end immediately. Low quality, but unblocks everything.
- **Phase 2 (quality):** swap per `orase-images-manifest.json` → `final_asset_url`. `final_plan` tells you how: `use_free_original` (download free from Pixabay/Wikimedia — 6–8 cities), `use_curated_free` (free Unsplash/Pexels/Wikimedia replacement), `buy_stock` (Vlad purchases; ~10 slots). **Do not auto-download paid stock or the copyright-gray romaniatourism/news originals.**

Recommendation: **do Phase 1 to unblock, then Phase 2 as assets land.**

### Decision 3 — Delivery mechanism
- **Static seed-baked (recommended).** Put final files at `public/images/cities/<slug>.jpg` in the frontend(s), keep `cities.ts` pointing at `/images/cities/<slug>.jpg`, ship with the build. Works identically local + prod, version-controlled, no R2 ops.
- **Dynamic (R2/admin).** Upload each via `POST /cities/{id}/image` or sync to R2 and set `City.image` to the R2 URL. Use only if these images must be CMS-managed at runtime.

Recommendation: **static seed-baked** for a fixed set of 27–35 city heroes.

---

## Implementation plan (assuming A + static seed-baked)

### Step 0 — Locate + reconcile
1. Find where `/images/cities/` is actually served: `grep -rn "images/cities" apps packages --include=*.ts --include=*.tsx | grep -v node_modules`. It's a frontend `public/` path (likely `apps/landing/public/images/cities/` and/or `apps/revery/public/images/cities/`, or a shared assets package). Confirm which app(s) render the city grid and whether they share a public folder.
2. Reconcile our 27 slugs against `packages/data/src/cities.ts`: most are existing county seats. Flag any missing (**`sebes` is a town in Alba, likely NOT a seeded city** — decide: add a `City` record + `county_slug: alba`, or drop). `miercurea-ciuc` slug: match whatever `cities.ts` uses.
3. Confirm brand tags: our `tge` cities should be in the `city_brands` tge set; all 27 should be tagged `revery`. Cross-check `seed.ts` brand seeding against the manifest.

### Step 1 — Local, Phase 1 (WhatsApp fallback, go live)
1. Copy `orase-mapping/renamed/*.jpg` → `public/images/cities/`, renaming to `<slug>.jpg` (drop the `tge_`/`adorys_` prefix; for dual cities apply Decision 1 to pick one).
2. Ensure every one of our 27 slugs has an `image: "/images/cities/<slug>.jpg"` entry in `cities.ts` (add missing cities/rows).
3. `cd apps/api && pnpm prisma migrate deploy && pnpm prisma db seed`
4. Verify: city pages on `landing` (TGE) and `revery` (Adorys) show images; API returns the `/images/cities/...` URL; no broken images / 404s in the console.

### Step 2 — Phase 2 (final assets)
1. For `use_free_original` + `use_curated_free` slots: fetch `final_asset_url`, downscale to ≤ 2560px long edge, re-encode JPEG/WebP ≤ 5 MB, overwrite `public/images/cities/<slug>.jpg`. **Wikimedia CC BY-SA assets require attribution** — collect author + license into a credits list (e.g. a `CREDITS-images.md` or a site credits page) before shipping.
2. For `buy_stock` slots: leave the Phase-1 fallback in place and open a checklist for Vlad with the purchase links. Swap once purchased.
3. Re-run the seed only if any `image` path changed (filenames stayed `<slug>.jpg`, so usually just replacing files + rebuilding the frontend is enough).

### Step 3 — Prod
- **Static path:** commit `public/images/cities/*` + `cities.ts`, deploy the frontends (Fly), then run the prod seed if `image` strings changed: `fly ssh console -a tge-api -C 'cd /app && npx prisma db seed'`. Static images ship with the Next build — **no R2 upload needed** for this approach.
- **If you instead chose dynamic/R2:** batch-upload files to the `tge-uploads` bucket under `cities/`, set each `City.image` to `${R2_PUBLIC_URL}/cities/<key>`, and confirm the CDN in front of R2 serves them. Handle cache-busting on replace.

---

## Open items to inspect (don't assume)
- Exact `public/images/cities/` location + whether `landing` and `revery` share it or each need a copy. (Search found the *paths* in `cities.ts` but not the folder — it may be git-ignored or per-app.)
- Whether static city images are committed to git or expected in R2 in prod (the `/images/cities/` convention implies committed static, but confirm the deployed frontends actually serve `public/` at that path).
- Is a `<City>.image` change enough, or does any CDN/edge cache need purging?
- `sebes` (and any other non-county-seat town) existence as a `City` record.

## Definition of done
- All 27 cities render a hero image on `revery` (Adorys); the `tge`-tagged subset renders on `landing` (TGE) — local and prod.
- No placeholder (`/uploads/placeholder-city.png`) left on any of our cities.
- Wikimedia/CC assets have attribution recorded.
- `buy_stock` slots tracked in a checklist for Vlad (fallback image live meanwhile).
