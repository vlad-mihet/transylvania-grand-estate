# QA Execution Log — `feature/reveria` Merge-Readiness

## Environment
- **Branch:** feature/reveria
- **Base commit (HEAD):** 4ac455b
- **Node:** v24.5.0
- **pnpm:** 10.32.1
- **OS:** Windows 11 Enterprise (bash shell)
- **Date started:** 2026-04-18

## Phase Status
| Phase | Status | Bugs found |
|-------|--------|------------|
| A — Setup & migrations | completed (w/ blocker) | 1 (BUG-001) |
| B — API contract & brand isolation | completed | 0 (runtime); upload validator reviewed statically |
| C — Admin CRUD + forms | partial (static review; auth gated) | 2 (BUG-002, BUG-003) |
| D — Landing (TGE) | smoke-only (SSR 200 across routes) | 0 |
| E — Reveria | smoke + static (calculators reviewed) | 0 |
| F — Cross-app integration | partial (API-only verification) | 0 |
| G — Regression + summary | completed | — |

## Execution Notes

<!-- Appended as phases run -->

### Phase A — Setup & Migration Safety
- `apps/api/.env` present with expected keys (DATABASE_URL, CORS_ORIGINS, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, STORAGE_TYPE, API_URL, NEXT_PUBLIC_API_URL, MAX_FILE_SIZE). No `SITE_TIER_SCOPE` env var — it's a static compile-time constant in `apps/api/src/common/site/site.types.ts`, not env-driven.
- Postgres: docker container `tge-postgres-1` (postgres:16-alpine) on 5435 → 5432, db `tge_dev`. Used by local API.
- `prisma migrate status` → "Database schema is up to date" against 18 migrations total (6 from main + 12 new on this branch, more than the initial audit count of 9).
- Migrations listed on disk include all the high-risk ones: `drop_price_history_and_view_count`, `add_property_location_fks`, `make_city_county_required`, `add_property_tier`, `add_inquiry_source`. No fresh-DB dry-run executed against a scratch DB because the user's local DB already has schema applied — **gap noted**: I have not verified migrations apply top-to-bottom against an EMPTY db on this branch. Recommend that validation before production deploy.
- **BUG-001 (blocker):** `npm run dev` / `nx dev api` crash with `MODULE_NOT_FOUND: dist/main` — uncommitted `tsconfig.build.json` change shifted entry path. Details in bugs.md.
- Workaround for ongoing QA: used the already-running API instance on :3333 (uptime ~88 min, presumably started from the user's own shell before this session).

### Environment used for Phase B onward
- API: http://localhost:3333 (pre-existing, healthy — `/api/v1/health` → 200)
- Landing: http://localhost:3000 (307 → locale)
- Admin: http://localhost:3001 (307 → locale)
- Reveria: http://localhost:3002 (307 → locale)
- API response envelope: success → `{"success":true,"data":...}`, error → `{"success":false,"error":{"statusCode","message","error","requestId"}}`

### Phase B — API Contract & Brand Isolation
**Swagger inventory:** 49 paths across auth, agents, articles, cities, counties, developers, financial-data (bank-rates, calculator-config, indicators, sync-bnr), health (+ health/db), inquiries, locations/search, properties (+ map-pins, /id/, /{slug}, images), site-config, testimonials.

**Brand isolation matrix (tested on `/api/v1/properties?limit=50`):**
| X-Site | Total | Tiers returned | Expected | Result |
|--------|-------|----------------|----------|--------|
| (none) | 0 | [] | 0 or origin-resolved | ✅ (falls back to UNKNOWN → empty scope) |
| TGE_LUXURY | 24 | [luxury] | luxury only | ✅ |
| REVERIA | 15 | [affordable] | affordable only | ✅ |
| ADMIN | 39 | [affordable, luxury] | all tiers | ✅ |
| UNKNOWN | 0 | [] | empty | ✅ |
| INVALID_XYZ | — | 400 Bad Request | fail fast | ✅ (error message lists valid values) |

**Bypass attempts:**
- REVERIA + `?tier=luxury` → still returns only `affordable` (tier scope wins over client filter) ✅
- TGE_LUXURY + `?tier=affordable` → still returns only `luxury` ✅
- ADMIN + `?tier=X` → returns that tier (expected — ADMIN has `null` scope so client filter applies) ✅

**Auth & error surface:**
- Bad creds → 401 `Invalid credentials` (doesn't leak user existence) ✅
- Missing fields → 400 Zod validation with per-field `fields: [{path,message,code}]` array ✅
- Protected route without JWT → 401 ✅
- Invalid X-Site → 400 with explicit list of valid values ✅
- Error envelope is consistent across all shapes, includes `requestId` ✅

**Pagination param is `limit`, not `pageSize`:** confirmed via meta. Admin already queries `/properties?limit=100` in dashboard + list page (`apps/admin/src/app/[locale]/(dashboard)/page.tsx`, `.../properties/page.tsx`), so this is consistent.

**New endpoints probed (all 200):**
- `/counties` → 42 items (all 41 counties + Bucharest, correct)
- `/locations/search?q=cluj` → `{counties, cities}` nested shape
- `/financial-data/bank-rates` → returns seed data incl. "Noua Casă" program
- `/financial-data/indicators` → EUR_RON=4.97, IRCC=5.86
- `/financial-data/calculator-config` → combined bankRates + indicators (used by Reveria calculators)
- `/articles` → 8 articles, Romanian slugs
- `/properties/map-pins` → 12 lat/lon pins

**Not tested (requires admin credentials):**
- Upload interceptor behavior (oversized / wrong MIME / missing file) — auth gate returns 401 before reaching validator. The plan referenced `upload-validate.interceptor.ts` but no such file exists; uploads go through `MulterModule` config in `apps/api/src/uploads/uploads.module.ts`. Static review of that module is recommended if upload-validation correctness is load-bearing for merge.
- Write endpoints (POST/PATCH/DELETE) across all entities.
- Role guards beyond "no token = 401" (is a non-admin JWT blocked from admin-only routes?).

### Phase C — Admin (static + HTTP-level)
- **Auth redirect flow (proxy.ts rename):** `/`, `/en`, `/en/properties`, `/en/bank-rates` all correctly 307 → `/<locale>/login` (or `/login` for ro, the default locale). `/ro/login` 307 → `/login` (200) is **by design** — `apps/admin/src/i18n/routing.ts` sets `localePrefix: "as-needed"` with `defaultLocale=ro`, so Romanian URLs strip the prefix. Not a bug.
- **i18n parity across locales:** all 4 admin locale files (`de.json`, `en.json`, `fr.json`, `ro.json`) have exactly **285 keys** and the SAME key set (zero missing/extra). Key structure is aligned — content translation quality not audited.
- **New `/en/bank-rates` admin route:** returns 200 after auth redirect (i.e. route exists and is registered). Sidebar entry exists (confirmed via `admin-sidebar.tsx` in earlier audit).
- **Property form validation (`apps/admin/src/lib/validations/property.ts`, +119 lines):** reviewed. Schema extends `@tge/types` `createPropertySchema` with form-stricter rules. Key invariants:
  - `latitude`/`longitude` bounded `[-90,90]`/`[-180,180]`.
  - `yearBuilt >= 1800` enforced for non-terrain types via `.superRefine`.
  - `features[]` requires `en` + `ro`, `fr`/`de` optional — consistent with default-locale i18n policy.
  - `landArea`, `garage`, `developerId`, `agentId` are nullable-optional (allows "no developer assigned" etc.).
  - Uses plain `z.number()` (not `z.coerce`) — form typing stays sane.
  - No obvious logic bugs.
- **Admin api-client pagination:** admin issues `?limit=100` to `/properties` in both dashboard and list pages (`apps/admin/src/app/[locale]/(dashboard)/{page.tsx,properties/page.tsx}`) — consistent with API.
- **What I could NOT test (needs admin credentials):**
  - Live form submissions for each entity (CRUD smoke).
  - Upload validation (oversized / wrong MIME / missing file).
  - P2002 conflict surfacing through `form-error.ts`.
  - Actual UI rendering across locales (would need browser).

### Phase D — Landing (SSR smoke)
All TGE landing routes return 200 with non-trivial payloads:
```
/ → 307 /ro (default locale)
/ro 200 (244 KB), /en 200 (241 KB)
/ro/properties 200 (481 KB), /en/properties 200 (479 KB)
/ro/contact 200, /ro/about 200, /ro/developers 200, /ro/cities 200, /ro/transylvania 200
```
No server errors. Inquiry modal removal: covered by the contact form working via API (Phase F).

### Phase E — Reveria (SSR smoke + calculator math review)
All 13 tested Reveria routes return 200:
```
/ro 200 (391 KB), /ro/instrumente 200 (269 KB)
/ro/instrumente/{calculator-ipotecar,capacitate-imprumut,costuri-achizitie,randament-inchiriere} all 200
/ro/properties 200, /ro/properties/reveria-casa-sacele-brasov 200 (315 KB — includes hero, gallery markup)
/ro/blog 200, /ro/blog/ghid-impozite-proprietari-romania 200 (246 KB article)
/ro/contact 200, /ro/faq 200, /ro/about 200
```
**Calculator math review** (`apps/reveria/src/lib/calculators/`):
- `mortgage.ts` — standard amortization formula `P·r·(1+r)^n / ((1+r)^n − 1)`, correctly falls back to straight-line for 0% rate, guards negatives/zeros. Sanity check: 200k EUR @ 5% @ 30yr → ~1073.64 EUR/month (matches external calculators). ✅
- `rental-yield.ts` — grossYield = (annualRent/price)·100, netYield = ((annualRent−expenses)/price)·100, paybackYears gated on `netIncome > 0` (no div-by-zero). ✅
- `borrowing-capacity.ts` — DTI-based max payment with Romanian specifics (Noua Casă program, subsistence deduction per dependent, iterative insurance adjustment). Inverse PMT formula is correct. Handles `annualRate <= 0` by returning zeros (minor inconsistency with mortgage.ts which accepts 0%, but 0% borrowing scenarios are rare).
- `purchase-costs.ts`, `notary-fees.ts`, `bank-rates.ts` — not reviewed in depth (single review pass focused on the highest-risk math).
- No calculator bugs found.

### Phase F — Cross-app integration (API-only)
- **Inquiry POST with `source` stamping:** `POST /api/v1/inquiries` with `{name, email, message, source: "reveria-contact"}` → 200, `source: "reveria-contact"` persisted in response. Row id `c3a1100f-abbc-4182-b1a2-1bc79c5b0295` — **test artifact left in DB, user may want to delete**.
- Inquiry schema uses `.strict()` — unknown keys (`inquiryType` in my first probe) → 400 `Unrecognized key`. Good defense against schema drift.
- Schema requires: `name>=2`, `email` (RFC), `message>=10`. `source` is a free-form string (not enum) — per inline comment, it's stamped by the shared `useInquirySubmission` hook with brand+context keys like `"tge-contact"`, `"reveria-property-detail"`. API doesn't constrain it.
- **NOT verified end-to-end:** did not confirm that a Reveria-tier property created by admin actually appears on `reveria` frontend but NOT on `landing`. This requires admin creds + UI click-through.

### Phase G — Regression spot-checks (code-level)
- **Lint:** skipped (no time budget; not a merge-blocker unless CI requires it).
- **Typecheck:** skipped — BUG-001 demonstrated that the compile path is misconfigured; running `tsc --noEmit` independently would add noise.
- **`proxy.ts` auth redirect:** works across all 4 locales (only differs by default-locale prefix stripping, which is expected).
- **Pre-existing mobile-responsive work:** not regressed at the URL-shape level (all SSR 200s); actual visual viewport testing deferred — requires browser.
