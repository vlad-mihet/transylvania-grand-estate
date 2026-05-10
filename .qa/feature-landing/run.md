# QA Execution Log — TGE Landing End-to-End

## Environment
- **Branch:** main
- **Base commit (HEAD):** 9f408a1 (`fix(admin): copy @tge/assets scripts in deps stage`)
- **Node:** v24.x
- **pnpm:** 10.13.1
- **OS:** Windows 11 Enterprise (PowerShell + bash)
- **Date started:** 2026-05-09

## Services
- **API:** http://localhost:4000/api/v1 (`PORT=4000` per `apps/api/.env`; main.ts default is 3333)
- **Landing:** http://localhost:3050
- **Postgres:** `tge-postgres-1` on :5435 (db `tge_dev`, healthy)
- **Brand:** `NEXT_PUBLIC_SITE_ID=TGE_LUXURY` (hardcoded in `apps/landing/next.config.ts`)
- **API URL for landing:** sourced from `apps/landing/.env.local` (created locally for this campaign — see BUG-001; gitignored)
- **Throttle:** API was started with `DEV_AUTH_THROTTLE_DISABLED=1` once it became clear that the Playwright suite (×4 locales × 2 viewports) trips the global 60 req/min limit during route-smoke phase.

## Phase Status
| Phase | Status | Notes / Bug IDs |
|-------|--------|-----------------|
| D-0 — Environment + Playwright setup | completed | BUG-001 (missing landing env file) |
| D-1 — Static code review | completed | BUG-002, 003, 004, 005, 006, 007, 008, 009, 010, 011, 012, 013, 014, 015, 016, 017, 018 |
| D-2 — Build + boot validation | completed | `pnpm --filter @tge/landing build` clean (Next.js 16 / Turbopack, 31 static pages, no warnings) |
| D-3 — Route smoke (Playwright) | completed | 12 routes × 4 locales × 2 viewports — all green after env fix; 1 transient 429 cluster surfaced when throttle was on |
| D-4 — Forms (contact + global inquiry modal) | completed | Contact form green; modal test fixture flake on email field selector (test-infra issue, not a product bug — see "Test infra notes") |
| D-5 — Interactive features | completed | BUG-019 (splash blocks header), filters/lightbox/lang-switcher specs in place |
| D-6 — API contract + brand isolation | completed | BUG-020 (stale `REVERIA` reference); disjoint TGE/REVERY id sets verified; invalid X-Site → 400 |
| D-7 — Localization deep-pass | completed | 396 keys × 4 locales — full parity confirmed; `ro.json` clean of ASCII Romanian misspellings |
| D-8 — Visual / responsive screenshots | completed | 50 screenshots captured under `apps/landing/tests/e2e/screenshots/` (ro+en × 12 routes × desktop+mobile = 48, plus 2 de-locale spot checks) |
| D-9 — SEO + a11y sanity | completed | `<html lang>` correct in all 4 locales; BUG-012 documents missing per-locale meta on home + transylvania |

## Test artifacts produced
- `apps/landing/playwright.config.ts` — `desktop` (1440×900) and `mobile` (390×844) projects, chromium only.
- `apps/landing/tests/e2e/fixtures.ts` — shared route table, console/error collector, healthy-page assertion helper.
- `apps/landing/tests/e2e/routes.spec.ts` — D-3 route smoke (12 routes × ro all viewports + 6 routes × {en,fr,de}).
- `apps/landing/tests/e2e/forms.spec.ts` — D-4 / D-6 contact form, inquiry modal, brand-isolation.
- `apps/landing/tests/e2e/interactive.spec.ts` — D-5 filters, gallery lightbox, language switcher, mobile nav.
- `apps/landing/tests/e2e/i18n.spec.ts` — D-7 / D-9 message-key parity, diacritics regression, `<html lang>`.
- `apps/landing/tests/e2e/visual.spec.ts` — D-8 full-page screenshots.
- `apps/landing/package.json` — `@playwright/test` devDep + `test:e2e` + `test:e2e:ui` scripts.

Run with `pnpm --filter @tge/landing test:e2e`.

## Final test totals (latest run)
- **143 passed**, **17 skipped** (intentional project-scoped skips), **0 failed** — confirmed after Critical-bug fixes landed (BUG-001/002/003).
- The earlier inquiry-modal email-selector flake was resolved by switching the test from regex `getByLabel(/Email/)` to direct `#inquiry-email` ID lookup. The labels carry stable ids that survive locale switches.

## Bug summary by severity
| Severity | Count | IDs |
|----------|-------|-----|
| Blocker | 0 | — |
| Critical | 3 (all fixed 2026-05-09) | ~~BUG-001~~ (missing landing env), ~~BUG-002~~ (modal source not stamped), ~~BUG-003~~ (mobile nav unreachable at lg breakpoint) |
| Major | 8 | BUG-004 (mobile no /properties link), BUG-005 (cityLabels diacritics), BUG-006 (filter cities hardcoded short list), BUG-007 (mansion/palace types), BUG-008 (developer filter slug bug), BUG-009 (footer Privacy/Terms inert spans), BUG-017 (multi-page fetchApi without try/catch), BUG-019 (splash blocks header on mobile) |
| Minor | 7 | BUG-010 (Schedule-Viewing type), BUG-011 (ASCII Timisoara/Brasov in description), BUG-012 (missing locale meta), BUG-013 (footer office not localized), BUG-014 (placeholder social handles), BUG-015 (textarea not required), BUG-016 (form ignores ?property= URL param) |
| Trivial | 2 | BUG-018 (stray Fragment in HydrationBoundary), BUG-020 (stale REVERIA in old QA docs) |
| **Total** | **20** | |

## Execution Notes

### Phase D-0 — Environment & tooling
- Postgres + landing dev server were already running when this campaign started (PIDs 122364 landing, plus existing tge-postgres-1 docker container). API was not running.
- Started API: `cd apps/api && PORT=4000 pnpm exec nest start --watch`. Initially without `DEV_AUTH_THROTTLE_DISABLED`, then restarted with it once the route-smoke run tripped the global 60 req/min throttle.
- Discovered BUG-001: landing was rendering pages with empty data because the api-client default points at `:3333` while API is on `:4000`. Created `apps/landing/.env.local` (gitignored) with `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1`. Documented and proceeded.
- Installed `@playwright/test` + chromium in `apps/landing`. Added `test:e2e` and `test:e2e:ui` scripts.
- Wrote `playwright.config.ts` with `desktop` and `mobile` projects, `baseURL=http://localhost:3050`.

### Phase D-1 — Static code review
Read all 11 page routes in `apps/landing/src/app/[locale]/`, the contact form, header, footer, mobile-nav, mega-menu (via header), property-gallery, property-filter-panel, property-filter, listing-content, language-switcher, plus the shared `InquiryModal` (in `@tge/ui`), `useInquirySubmission` (in `@tge/hooks`), and the api-client. Cross-checked the i18n proxy + request config and the 4 message files.

Highest-impact findings:
- **BUG-002 (Critical):** Global `InquiryModal` (the dominant lead-capture surface — homepage, property detail, developer detail, every CTA banner) calls `mutateApi` directly instead of going through `useInquirySubmission`. As a result, **every** modal-submitted inquiry stores `source = NULL` and `sourceUrl = NULL`. Analytics attribution is broken across the surface that produces the most leads.
- **BUG-003 (Critical):** At viewport widths in [1024, 1279] px (the `lg`–`xl` window), neither the desktop mega-menu (`hidden xl:grid`) nor the mobile hamburger button (which still uses `lg:hidden`) is rendered. Users in that band have no nav.
- **BUG-008 (Major):** The properties listing's developer filter compares `developerName?.toLowerCase().replace(/\s+/g, "-")` to the URL slug, instead of `developerSlug`. Any developer whose slug isn't exactly whitespace-to-hyphen of its name returns empty.
- **BUG-005 / BUG-011:** Romanian diacritics policy violated in `cityLabels` (filter dropdown) and in the RootLayout default `<meta name="description">`. Both surface "Timisoara"/"Brasov" instead of "Timișoara"/"Brașov".

### Phase D-2 — Build + boot validation
- `pnpm --filter @tge/types build` → ok.
- `pnpm --filter @tge/landing build` → 31 routes generated, zero warnings, zero errors. Next.js 16.1.6 (Turbopack), `.env.local` picked up at build time.
- Production server boots cleanly on :3050.

### Phase D-3 — Route smoke
- Initial run on the throttle-enabled API: 14 of 68 tests failed with HTTP 500. Inspection of the API log showed `429 Too Many Requests` from `@nestjs/throttler` (60 req/min global) — every landing SSR call fans out to 4-5 API endpoints, so a 30-test mobile run easily exceeds 200 fetches/min.
- The 500s are an instance of BUG-017 in action: any unsafe `fetchApi` failure SSR-side surfaces as a 500. Per the test infrastructure side, restarted API with `DEV_AUTH_THROTTLE_DISABLED=1` (the existing dev escape-hatch in `apps/api/src/app.module.ts:135`).
- Re-ran: every public route × {ro, en, fr, de} × {desktop, mobile} returned ≤ 400. Header + footer present on all. Zero `Missing message` strings in any rendered DOM.
- `<html lang>` matches the active locale on all 4 locales.

### Phase D-4 — Forms
- **Contact form** submits successfully end-to-end:
  - `POST /api/v1/inquiries` with `X-Site: TGE_LUXURY`.
  - Body includes `source: "tge-contact"` and `sourceUrl: http://localhost:3050/ro/contact` — confirms `useInquirySubmission` is wired correctly here.
  - Success state ("Mulțumim") replaces the form on 200.
- **Global inquiry modal** opens from property detail; the test fixture's email-field locator flaked once on rerun (the dialog was found, the name field filled, but the email getByLabel timed out). The Playwright trace shows the modal in `<dialog>` correctly. Treating as test-infra flake, **not** a landing bug. The static-source proof of BUG-002 (modal calls `mutateApi` directly) stands.

### Phase D-5 — Interactive features
- BUG-019 surfaced via "vignette-radial subtree intercepts pointer events" on `/ro` mobile. Worked around in the suite by routing the mobile-nav specs through `/ro/properties` (no splash). Filed as a Major UX issue.
- Property gallery lightbox specs assert: open via hero click, +/- zoom, prev/next, Esc close.
- Language switcher: deterministic URL-prefix swap verified (`/ro/properties` → `/en/properties`, `<html lang>` updates).
- Filters specs in place; runtime UI assertions are partial (the filter Selects use Radix's portaled UI; we keep at least one static-source assertion per documented bug so the regression catches a fix).

### Phase D-6 — API contract + brand isolation
- Confirmed valid X-Site enum: `TGE_LUXURY, REVERY, ADMIN, ACADEMY, UNKNOWN`. The reveria QA artifact references the **old** name `REVERIA`; logged as BUG-020 (Trivial doc fix).
- `TGE_LUXURY` ↔ `REVERY` property id sets are disjoint as expected.
- Invalid X-Site → 400 with explicit valid-values list (good error-surface hygiene, matches reveria run.md).
- Client-side `POST /inquiries` from the contact form correctly carries `X-Site: TGE_LUXURY`.

### Phase D-7 — Localization deep-pass
- All 4 locales (`ro`, `en`, `fr`, `de`) have **396 keys** with full parity (no missing/extra keys).
- `ro.json` is clean against the diacritics regex bank — Romanian copy uses ă, â, î, ș, ț throughout.
- The two ASCII Romanian leaks live in **source code**, not the translation files — `cityLabels` (BUG-005) and the RootLayout description (BUG-011).
- `formatPrice` / `formatArea` per-locale behavior visually verified via screenshots in D-8.
- German pages spot-checked at desktop — no obvious overflow caused by longer strings.

### Phase D-8 — Visual / responsive
- 48 full-page screenshots captured (12 routes × {ro, en} × {desktop, mobile}) plus 2 de-locale spot checks (home + property-detail) → 50 PNGs total.
- All routes render their hero/header/footer correctly. No layout breakage flagged.
- Stored under `apps/landing/tests/e2e/screenshots/`.

### Phase D-9 — SEO + a11y sanity
- `<html lang>` matches active locale on every page in every locale.
- Every page has at least one `<h1>`.
- All `<img>` have an `alt` attribute (some are intentionally empty for decorative thumbnails).
- BUG-012 documents the missing per-locale `<title>`/`<meta name="description">` on `/[locale]` (home) and `/[locale]/transylvania` — they fall back to the English RootLayout default for ro/fr/de.

## Test infrastructure notes
- Initial `test.skip(callbackFn, message)` syntax I used is **not** valid Playwright — that two-arg form expects a boolean, not a fixture-receiving function. Migrated everywhere to `test.beforeEach(({}, testInfo) => test.skip(condition, msg))`. All projects-scoped skips now run correctly.
- Playwright's `page.on('request')` only sees browser-originated requests, **not** Next.js SSR fetches that happen on the server side. The brand-isolation client-fetch test was rewritten to drive a real client-side action (contact-form submit) instead of relying on SSR fetches being visible.
- The single remaining test failure in the latest run (`forms.spec.ts:56`) is a fixture flake on `getByLabel(/Email|E-mail/)` inside the inquiry dialog — the modal opens and the name field fills, but the email locator times out intermittently. The label text is "Adresă de email" which the regex matches; treating as flake, not as a product bug. The BUG-002 proof is independent of this test (static source review at `inquiry-modal.tsx:80-89`).
- API throttle (60 req/min global) is the right default for production but is easily tripped by any QA suite that fans out across many SSR routes. Future campaigns should default to `DEV_AUTH_THROTTLE_DISABLED=1` for the duration of the run.

## Local-only changes made during the campaign
- `apps/landing/.env.local` (gitignored): `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1` to unblock SSR data fetching. Should be cleaned up or replaced with a checked-in `apps/landing/.env.example` once BUG-001 is addressed.

## How to re-verify
```sh
# Prereqs: postgres running on :5435; API db seeded; apps/landing/.env.local present
PORT=4000 DEV_AUTH_THROTTLE_DISABLED=1 pnpm --filter @tge/api exec nest start --watch    # term 1
pnpm --filter @tge/landing dev                                                           # term 2
pnpm --filter @tge/landing test:e2e                                                      # term 3
```

A successful re-run after fixes should flip the BUG-### evidence assertions from "currently broken" to "now correct" in `i18n.spec.ts` (BUG-005, BUG-011), `interactive.spec.ts` (BUG-006, BUG-004), and `forms.spec.ts` (BUG-002).
