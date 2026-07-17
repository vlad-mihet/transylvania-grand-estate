# Verification Sweep 2026-07 — Run Log

Campaign: full-platform end-to-end verification sweep (admin → websites → API → prod).
Successor to `.qa/full-sweep-2026-07/` (PR #37, closed at 8803c14). This sweep is
**verification-oriented**: prove the platform is done empirically — including that the
prior 26 Fixed@/Wontfix stamps hold on a fresh build — fill prior coverage gaps
(EDITOR column, Tier C, never-matrixed modules), then verify production.

Protocol: document-everything-first, then fix waves (Phase 8). File-writing exceptions
during document phases: failing Playwright marker specs for confirmed findings, and
ledger files themselves. No code fixes before wave approval.

Branch: `qa/verify-sweep-2026-07` off main@8803c14. Started 2026-07-17.

## Ledger files
- `bugs.md` — new findings, BUG-201+ (regressions of prior bugs: new ID + `Regression-of:` line)
- `fixed-verify.md` — disposition of all 26 prior Fixed@/Wontfix stamps
- `admin-matrix.md` — delta coverage matrix (prior ⬜/❌ cells + deep-CRUD + never-matrixed)
- `prod-checks.md` — prod verification (read-only vs owner-gated)
- `deferred-refresh.md` — refreshed deferred-work decisions + owner-decision list

## User-approved scope decisions (2026-07-17)
- REBS sync disabled (`REBS_SYNC_ENABLED=0`) for sweep duration; restore at closeout.
- Prod probes approved: QA-PROBE contact submissions, disposable academy registration,
  authenticated read-only prod-admin browse.
- BUG-127 prod reseed: approved in principle, gated — re-confirm immediately before executing.

---

## Phase 0 — Env bring-up + reseed

- Branch `qa/verify-sweep-2026-07` off main@8803c14; ledger skeleton pushed @9abf62b.
- `REBS_SYNC_ENABLED=0` set in `apps/api/.env` (was 1) — restore at Phase 9. Never echo `.env` (holds live REBS key).
- `tge-postgres-1` up (:5435). Stale dev servers on 3050–3053 killed (fresh starts below); no API running → no Prisma DLL lock.
- `@tge/data` rebuilt → `prisma migrate reset --force` (user consent given in-session per Prisma AI guard): **53 migrations replayed clean + auto-seed**. Seed matches prior baseline exactly: 3 fixture users (pinned passwords: admin `QaTest123!` — chosen to equal qa-smoke's rotation value so the Phase-1 rotation gotcha is a no-op; editor/agent `QaSweep123!`), 4 developers, 9 agents, 42 counties, 46 cities, 113 neighborhoods, 72 luxury + 24 affordable properties, 4 testimonials, 8 articles, 4 academy courses (16 lessons), site config, 56 city-brand memberships (63 candidates), 34 per-brand city images, bank rates, financial indicators.
- **Diacritics check (BUG-127 local half): PASS** — `SELECT DISTINCT city FROM properties` → Brașov, București, Timișoara, Bistrița, Constanța, Iași, Ploiești, Sighișoara, Târgu Mureș, Târnăveni, Zalău all correct.
- Apps: API watchless on :4000 (`node dist` — avoids OneDrive watch-loop), landing :3050 (200), admin :3051 (307→login), revery :3052 (200), academy :3053 (307→login, BUG-124 gate). `health/ready` ok. All 3 fixture logins → 201.
- Agent test data: fixture agent = elena-popescu (6 seeded properties, 3 luxury + 3 affordable). 2 inquiries created via public API: property-type on `modern-villa-andrei-muresanu` (X-Site TGE_LUXURY) + viewing-type on `revery-studio-centru-cluj` (X-Site REVERY); both 201, `site_id` attribution correct in DB. Note: create-inquiry requires `gdprConsent:true` — the 400 without it returned the correct structured Zod error shape (fields[].path/code + requestId), incidental Phase-5 evidence.

**Phase 0 exit: PASS** — 5 ports up, 3 roles authenticate, diacritics in DB, REBS cron quiesced.

---

## Phase 1 — Automation baseline

| Gate | Result |
|---|---|
| Lint (`pnpm lint:all`, 5 projects) | ✅ 0 errors (26 pre-existing warnings) — BUG-101 holds |
| Typecheck (CI-parity: api `tsc --noEmit -p tsconfig.build.json` + admin `tsc --noEmit`) | ✅ both clean. Note: `nx run-many --target=typecheck` runs nothing (no such target); CI does per-app tsc |
| API e2e (testcontainers, `DEV_AUTH_THROTTLE_DISABLED=1`) | ✅ **198/198, 25 suites** (452s) |
| Admin Playwright (chromium) | ✅ **44/44** (was 42+2 red on first run — see throttle note) |
| Landing Playwright (desktop+mobile) | ✅ **143 passed, 17 skipped** — matches prior baseline (first run had 6 `[mobile]` reds = BUG-201 manifestation) |
| Academy Playwright | ✅ **13/13** |
| Revery full matrix (3 browsers × 4 locales) | ✅ **702 passed, 3 skipped, 0 failed** (6.6m) — incl. webkit forms (BUG-110) |
| qa-smoke.sh (throttle-enabled API restart, run last) | ✅ **89 passed, 0 failed, 3 warn (known bugs)** (41s). Password rotation no-op by design (seed password == rotation value) |
| qa-matrix.sh | ⏭ skipped — fixture-password incompatibility unchanged (logged, as prior sweep) |

**Phase 1 exit: PASS** — every gate green under CI-parity env. Two findings filed from first-run reds: BUG-201 (Critical, listing-page SSR guard), BUG-202 (Critical, team page empty — found in Phase 2 but confirms why admin suite can be green while the page is broken: no spec walks it).

---

## Phase 2 — Prior-fix empirical spot-verification

All browser checks via Claude in Chrome with console/network taps. Full dispositions in `fixed-verify.md` — summary: **22/28 dispositioned** (18 HOLDS incl. all i18n minors with zero-IntlError console bar; 1 REGRESSED→BUG-202; BUG-105 holds-with-extension→BUG-201; BUG-123 reconciled + old ledger restamped Fixed@290ba9c; BUG-124/125 Wontfix evidence re-verified). Remaining 6 ride on later phases by design: BUG-109/116/120 (Phase 3), BUG-104 revery half (Phase 4), BUG-126 (Phase 6), BUG-127 (Phase 7).

**New findings this phase:** BUG-202 (Critical — team + invitations pages dead, `expand=allLocales` vs 2 strict schemas; blast-radius curl sweep of 15 endpoints in bugs.md), BUG-203 (Minor — "+ Add feature" EN in RO), BUG-204 (Major — inquiries kanban dead, limit=200 vs cap 100; error card also EN-only).

**Also observed live:** audit trail records logins/PW-suite mutations with brand attribution; inquiry source persistence (REVERY-CONTACT badges + RO locale badge on sourceUrl); unsaved-changes beforeunload guard fired on a real hard-nav (blocked the automation dialog — guard works).

---

## Phase 3 — Admin manual sweep (delta matrix)

Full dispositions in `admin-matrix.md`. **EDITOR column (biggest prior gap) fully walked**, Tier C round-trips all pass, deep-CRUD exercised, never-matrixed hub modules all render, AGENT security re-probe clean.

**8 findings filed:** BUG-202 (Critical, team+invitations dead — BUG-118 regressed), BUG-205 (Critical, zero-image landing 500), BUG-204/206/207/208/209 (Major: kanban dead / form default+locale traps / Publică no-op / EDITOR inquiries dead-but-exposed / EDITOR reads audit trail), BUG-203 broadened + BUG-210 (Minor: EN stragglers / county count=0).

**Verified working:** audit trail live w/ brand attribution (BUG-117), draft leak closed (BUG-109), invite+password round-trips w/ correct RO email copy (BUG-120), brand-visibility curation → landing homepage reorder (cross-app), multi-image upload, AGENT scoping + RBAC (own PATCH 200 / foreign 403 / users 403 / audit 403).

**Cleanup done inline:** reset `site_config.tge_homepage_cities` to default after curation test; QA artifacts remaining for Phase 9 cleanup: QA property (apartament-qa-sweep-fara-imagini-cluj, now with 2 images), QA testimonial, QA bank rate, 2 QA inquiries, 1 accepted EDITOR (qa-sweep-editor@example.com).

---

**Env lesson (recorded for future baselines):** every CI Playwright job sets `DEV_AUTH_THROTTLE_DISABLED=1`; the first local runs were made without it. Result: admin suite's shared BFF session died on `/auth/refresh` 429s (10/min bucket) → 2 unsaved-changes reds; landing `[mobile]` cross-locale smoke got real 500s from listing pages when SSR fetches failed under throttle/load — which exposed **BUG-201** (listing pages unguarded against API failure; deterministic kill-API repro). Dev API restarted with the flag for all Playwright/browser phases; qa-smoke will run last against a throttle-ENABLED API restart (its 429 check needs it).
