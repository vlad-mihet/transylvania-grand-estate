# Admin — Findings

## Blocker
_none_ — `proxy.ts` export rename (was Blocker #14 on 2026-04-17 re-run) is fixed. Admin is fully reachable.

## Critical
_none_

## Major
_none_

## Minor

### [Minor] `apps/admin/messages/{fr,de}.json` missing 47 keys — all `BankRateForm.*`
**Where:** `apps/admin/messages/fr.json` (238 keys) and `de.json` (238 keys) vs. `en.json`/`ro.json` (285 keys each).
**Repro:** diff keys between files; all 47 missing keys are under the `BankRateForm` namespace (e.g. `BankRateForm.bankName`, `.rate`, `.maxTermYears`, `.insuranceRateHint`, ...).
**Expected:** next-intl fallback or completed translation.
**Actual:** Admin officially supports `en/ro/fr/de` (`packages/i18n/src/constants.ts: export const locales = ["en", "ro", "fr", "de"]`). A user switching admin to French or German will see English fallback (or raw keys) on the new bank-rates CRUD screens.
**Notes:** Bank-rates is the new section added on this branch. Translations for fr/de likely need a pass before admin is fully usable in those locales. If fr/de aren't actually surfaced in the admin locale switcher UI, this is even lower priority — confirm in browser.

## Trivial
_none_

## UI-UNVERIFIED (requires human browser pass)

The smoke suite only validates HTTP-level routing/redirects. Every visual/interactive flow below needs a human pass. The `docs/qa-runbook.md` Phase C covers them with explicit checklists:

- Login → session → protected-route access.
- **Every CRUD entity** (Properties, Developers, Agents, Cities, Testimonials, **Bank Rates**, Site Config):
  - List view at 1440px and 375px.
  - Inline featured/active toggles persist + invalidate list query.
  - Create flow: inline Zod errors via `useApiFormErrors`.
  - Edit preloads and PATCH persists.
  - Delete confirmation dialog + list refetch.
  - Image upload (sidecar POST) — toast.warning on fail, entity still saves.
- Property form specifics:
  - Terrain type hides bedrooms/bathrooms/floors/yearBuilt.
  - Slug auto-generates from title.
  - `yearBuilt ≥ 1800` enforced for non-terrain.
  - Flat `latitude` / `longitude` inputs compose into nested `coordinates` on submit.
  - Async developer/agent dropdowns populate.
  - `ImageGalleryManager` reorder / alt / hero toggle.
- Settings page: bilingual inputs (en/ro/fr/de), `useFieldArray` socialLinks, BNR manual-sync button.
- i18n switcher: EN ↔ RO round-trip on every page; Romanian diacritics render (they're already in the JSON; visual is a human task).

## Passed

- Admin boot + auth redirect: `GET /en/dashboard` with no cookie → 307 → `/en/login` (verified).
- `proxy.ts` correctly wires the Next 16 middleware pipeline (compiled to `.next/dev/server/middleware.js` from `INNER_MIDDLEWARE_MODULE => "[project]/apps/admin/src/proxy.ts [middleware]"`).
- All admin entity validators present: `agent.ts`, `bank-rate.ts` (new), `city.ts`, `developer.ts`, `property.ts`, `site-config.ts`, `testimonial.ts`.
- Property form validator extends the shared Zod schema correctly: strips nested `coordinates`, re-declares flat `latitude/longitude`, adds non-terrain `yearBuilt ≥ 1800` refinement.
- Bank-rate form validator (new) has sensible ranges: `rate ∈ [0,100]`, `maxLtv ∈ [0,1]`, `maxTermYears ∈ [1,40]`, `notes` max 500 chars.
- i18n key parity en↔ro at 285 keys each.
- Lint: no errors in `apps/admin/` (all lint failures localized to `apps/reveria/` — see `qa/reveria.md`).
- Build: `pnpm build:all` succeeds for all 5 projects including admin.
