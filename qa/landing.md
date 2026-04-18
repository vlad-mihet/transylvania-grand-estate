# Landing — Findings

_All page-level HTTP smoke checks pass._

## Blocker
_none_

## Critical
_none_

## Major

### [Major] Luxury property seed data has no Romanian diacritics
**Where:** `packages/data/src/properties.ts` (source) + the current DB's `Property.description.ro` / `title.ro` / `shortDescription.ro` fields.
**Repro:**
```
curl -s -H "X-Site: TGE_LUXURY" "http://localhost:3333/api/v1/properties?limit=1" \
  | python -c "import sys,json; print(json.load(sys.stdin)['data'][0]['description']['ro'][:200])"
```
returns text like `"Un domeniu magnific la poalele Muntilor Carpati, langa Brasov, oferind o combinatie extraordinara de arhitectura traditionala transilvaneana si lux contemporan..."` — no `ă/â/î/ș/ț`.
**Expected:** `"Un domeniu magnific la poalele Munților Carpați, lângă Brașov, oferind o combinație extraordinară de arhitectură tradițională transilvăneană și lux contemporan..."`
**Scale:** 97 ASCII-Romanian token hits in `packages/data/src/properties.ts`, 5 in `developers.ts`, 4 in `testimonials.ts`, 3 in `articles.ts`. 24 luxury properties, 3 shown on landing home — every Romanian visitor to a Landing property detail page sees misspelled Romanian.
**Counter-evidence that this is *data* drift, not a coding issue:**
- `apps/api/prisma/seed.ts` for the Reveria inline inventory uses proper diacritics: `"Piața Unirii"`, `"lângă"`, `"construcție"`, `"Brașov"`, `"îngrijit"` — so new data is policy-compliant.
- `packages/data/src/cities.ts` has been corrected too (`"Așezat la poalele Munților Carpați"` in source).
- Only the `packages/data/src/properties.ts` (and a handful of other `@tge/data` files) still use ASCII Romanian.
**Notes:** Per the saved memory `feedback_diacritics.md`: "Always use ă, â, î, ș, ț in Romanian text, never ASCII." This applies to seed data as well — Landing renders this content verbatim in `ro` locale. Fix is mechanical: pass all ro strings in `packages/data/src/properties.ts` + `developers.ts` + `testimonials.ts` + `articles.ts` through a diacritic restorer, spot-check, commit.

## Minor

### [Minor] Stale DB: cities' ro description is ASCII even though source has diacritics
**Where:** Running DB.
**Repro:**
```
curl -s "http://localhost:3333/api/v1/cities?limit=1" \
  | python -c "import sys,json; print(json.load(sys.stdin)['data'][0]['description']['ro'])"
```
returns `"Asezat la poalele Muntilor Carpati, oferind un trai de lux alpin cu farmec medieval."`
but `packages/data/src/cities.ts:48` has `"Așezat la poalele Munților Carpați, oferind un trai de lux alpin cu farmec medieval."`
**Cause:** seed was run before the diacritics fix; `SEED_RESET=true` hasn't been re-run against the dev DB.
**Fix (ops):** `cd apps/api && SEED_RESET=true npx prisma db seed`.
**Notes:** Not a code bug — purely a local-dev-DB staleness. Production/staging data needs a one-shot update script if those environments were seeded similarly.

## Trivial
_none_

## UI-UNVERIFIED (requires human browser pass)

- Splash overlay first-visit / sessionStorage skip-on-return.
- Leaflet maps: markers render, popups open, cluster behaviour on `/cities/:slug` + `/properties/:slug`.
- Filter UX on `/properties` — price, bedrooms, county, text search, URL sync.
- Inquiry form submission flow (form was moved to `@tge/ui`): bad-email inline error, success card, rate-limit UX at 6th submit/min.
- Similar-properties sidebar on a detail page.
- Mobile responsive at <375px, 375–767px, tablet, desktop.
- Developer templates — Atelier / Prestige / Sovereign three-template pattern renders correctly.

## Passed

- Page HTTP 200: `/en`, `/en/properties`, `/en/cities`, `/en/developers`, `/en/about`, `/en/contact`, `/en/transylvania`.
- 404 on `/en/properties/does-not-exist-zzz`, `/en/cities/does-not-exist-zzz`, `/en/developers/does-not-exist-zzz`.
- Cross-tier lookup correctly 404s: Landing requesting a Reveria affordable slug → 404.
- Image-less property no longer crashes `PropertyCard` (was Blocker #1 on 2026-04-17; now fixed — placeholder renders).
- i18n key parity en↔ro at 339 keys each in `apps/landing/messages/`.
- No lint errors in the landing app (lint errors all localized to reveria — see `qa/reveria.md`).
