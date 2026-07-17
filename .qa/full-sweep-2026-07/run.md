# Full Platform Sweep — Run Log (2026-07)

Branch: `qa/full-sweep-2026-07` · Plan: full end-to-end sweep of admin + all public sites + API, document-first-then-fix.
Ledger files: `bugs.md` (new findings, BUG-101+), `legacy-recheck.md`, `deferred-audit.md`, `admin-matrix.md`.

---

## Phase 0 — Environment bring-up + seed (2026-07-17)

- Branched `qa/full-sweep-2026-07` from `fix/hide-demo-credits-public` (HEAD bbaff00).
- Postgres: docker `tge-postgres-1` on :5435, already running.
- `pnpm install` clean; built `@tge/types`, `@tge/data`, `@tge/locale`.
- **Finding (env, not a product bug):** local `tge_dev` had all 32 tables but **no `_prisma_migrations` table** — DB was created via `prisma db push` at some point, so `prisma migrate dev` demanded a reset. With user consent ran `prisma migrate reset --force`: **all 53 migrations replayed clean** (doubles as a migration-chain smoke) + auto-seed.
- Seed results (SEED_RESET=1, SEED_FORCE_FIXTURES=1, known sweep passwords): admin/editor/agent fixture users created; 4 developers, 9 agents, 42 counties, 46 cities, 113 neighborhoods, 72 properties + 24 Revery affordable, 4 testimonials, 8 articles, 4 academy courses (16 lessons), site config, **56 city-brand memberships (63 candidates)**, 34 per-brand city images, bank rates, financial indicators.
- **Note:** stale `apps/api/dev-api.log` (untracked) shows the REBS sync cron actively syncing in a prior local session (`fetched=1 … updated=1` hourly) — i.e. `REBS_API_KEY` + `REBS_SYNC_ENABLED` are set in the local `.env`. Memory/docs said key "not yet issued". Verify what feed this hits during Phase 6 (REBS audit). The synced listing was wiped by the reset (expected).
- Dev servers: all 5 up in ~65s (api :4000, landing :3050, admin :3051, revery :3052, academy :3053). `GET /health/ready` → ok.
- Fixture logins verified via `POST /auth/login` (X-Site: ADMIN): admin / editor / agent all **201**.
- `city_brands` = 63 rows — populated ✔ (brand-scoped queries safe).
- AGENT-pass test data: fixture agent `elena-popescu` owns **6 properties** (mixed luxury/affordable). Seed creates **0 inquiries**, so created 2 realistic ones via the public API (`type` must be lowercase enum — first attempt with `PROPERTY` 400'd, correct values: general|property|developer|viewing|valuation): 1× TGE_LUXURY viewing on `modern-villa-andrei-muresanu`, 1× REVERY property on `revery-studio-centru-cluj`, both status `new`.

**Phase 0 exit criteria: ALL MET** — 5 ports up, 3 roles log in, brand memberships seeded, agent test data in place.

---

## Phase 1 — Automation baseline (2026-07-17)

API restarted with `DEV_AUTH_THROTTLE_DISABLED=1` (CI parity for Playwright; the local `.env` ships it commented out).

| Suite | Result | Notes |
|---|---|---|
| api Jest e2e (22 specs, testcontainers) | **179/186 pass, 7 fail** (×2 runs, deterministic) | All 7 = academy registration/verification. Root-caused: local `.env` `EMAIL_VERIFICATION_DISABLED=1` leaks into the Jest app (global-setup doesn't pin it); CI green because no `.env`. → **BUG-102** |
| landing Playwright (desktop+mobile) | **143 pass / 17 skip / 0 fail** | Matches historical baseline exactly |
| revery Playwright (3 browsers × 4 locales) | **701 pass / 1 fail / 3 skip** | Fail: contact form success state, webkit only, both retries — name input wiped pre-submit (screenshot). NOT a 429 (verified in API log). → **BUG-110**. The formerly "locked-red" fr/de i18n tests no longer fail (appear among skips) |
| admin Playwright (chromium) | **41 pass / 0 fail** (re-run) | First run 401'd at auth.setup — caused by the qa-smoke password rotation (gotcha below), not the app |
| qa-smoke.sh | **88 pass / 1 fail / 2 warn (known)** | The 1 fail = "Login did not 429 within 7 attempts" — self-inflicted: API runs with `DEV_AUTH_THROTTLE_DISABLED=1`. Env conflict between qa-smoke (wants throttle ON) and Playwright/CI parity (wants it OFF); not a product bug. Cross-tier leak checks all green |
| qa-matrix.sh | **skipped (logged, not silent)** | Hardcodes `PASS="QaPass123!"` from `prisma/qa-reset.ts` fixtures — incompatible with sweep seed passwords; role×tier coverage redundant with Jest `permissions-page-guards`/tier-scope specs + qa-smoke F.2 |
| lint:all | **FAIL — 4/5 apps** (revery passes) | CI has no lint gate. → **BUG-101** |
| typecheck (api+admin, CI parity) | **clean** | |

**Tooling gotcha (run-order):** `qa-smoke.sh` silently resets the super-admin password to `QaTest123!` by direct DB UPDATE (`RESET_PASSWORD=1` default) — it broke the subsequent admin suite's `SEED_ADMIN_PASSWORD` login (401). Admin password for the rest of the sweep: `QaTest123!` (editor/agent remain on the seeded sweep password). Run qa-smoke LAST or with `QA_RESET_PASSWORD=0` in future baselines.

**Draft-probe artifacts (Phase 2 spillover):** article `qa-sweep-draft-probe` (draft) + 2 inquiries created — keep until Phase 9 cleanup.

**Environment note (mid-Phase-3):** the dev API (`nest start --watch`) fell into a phantom file-change restart loop (~every 3s, "Found 0 errors" each cycle, never rebinding :4000) — OneDrive file-event churn suspected (repo lives under OneDrive; see prior OneDrive incidents). Replaced for the remainder of the sweep with a watchless run: `nest build` + `node dist/apps/api/src/main.js` (same env). If contributors hit dev-API 503/"Failed to fetch" mid-session, this loop is the likely cause — consider moving the repo off OneDrive (standing recommendation).

**Phase 1 exit: baseline recorded.** New reds ledgered as BUG-101 (lint), BUG-102 (e2e env leak), BUG-110 (webkit form). Automation-covered behaviors (to skip in manual phases): landing routes/forms/i18n/visual/interactive, revery routes/calculators/a11y/seo/responsive/rate-limit/not-found/property flows, admin auth/properties/agents/articles/inquiries/academy/data-sources/localized-editor/command-palette smokes, api invitation/password-reset/refresh-rotation/tier-scope/draft-leak(properties)/permission-guard invariants.

---

## Phase 3 — Admin manual sweep (2026-07-17), browser-driven

Full matrix + AGENT pass in `admin-matrix.md`. Every planned module reached. Coverage: Tier A (properties create/edit/tier→brand/agent-assign, inquiries kanban+sheet+filters+archive, people team+invitations, academy courses/lessons), Tier B (dashboard, bank rates, indicators, testimonials, developers, counties, cities+per-brand heroes, brand visibility, articles, audit logs), full AGENT parallel pass.

**Passing / verified working:** property create→edit round-trip (tier=affordable→REVERY, agent assigned, per-locale RO/EN blobs persisted, edit PATCH 200); inquiry sheet + source filter + archive; **city per-brand hero override UI (base + TGE + Adorys images)**; academy workspace (4 courses, lesson table/reorder/stats/export); bank rates + indicators (calculator inputs) render with real data; developers/testimonials/counties/cities lists; brand-visibility panels; ADMIN/EDITOR invitation flow (`POST /invitations/users` 201, accept-invite page reachable); **AGENT security fully intact** (nav scoped, 6/6 forbidden URLs→403, foreign property 404/write-403, own write 200).

**New findings BUG-111 → BUG-122 (12).** Headline:
- **BUG-117 Critical** — audit trail dead for ALL resource mutations (classify() never matches under `/api/v1` global prefix); only auth events logged.
- **BUG-118 Critical** — team/users mgmt page non-functional (admin sends `limit` param that `/auth/users` `.strict()` schema 400s; client swallows → empty state); a never-tested module.
- Major: BUG-115 (slug button no-ops without EN title), BUG-116 (empty year-built blocks save w/ raw NaN).
- Minor/Trivial: BUG-111 (RO dashboard mislabel), BUG-112/113 (inquiry sheet badge + filter placeholder), BUG-114 (missing `Common.relations` key → 4.5k console errors + "1 Issue" overlay), BUG-119 (people-hub logins widget wrong action filter), BUG-120 (user-invite email uses agent copy), BUG-121 (unread badge counts limit=1), BUG-122 (raw `inquiries.typeLabel.viewing` key). BUG-106 (literal-EN property labels) reconfirmed.
- Confirmed BUG-107 (in-app nav guard gap) — beforeunload dialog fires on full nav, but sidebar Link nav discards dirty forms silently.

**Env:** switched API to watchless `node dist` mid-phase (BUG-noted watch-loop). Admin password now `QaTest123!` (qa-smoke rotation). Test artifacts in DB: 1 property (`qa-sweep-apartment-in-cluj-napoca`), 1 draft article, 2 inquiries, 1 pending EDITOR invite — cleanup at Phase 9.

**Phase 3 exit: complete.** Admin is functionally solid on the happy paths; the two Criticals are both "feature silently non-functional" (audit, user list), not crashes.

---

## Phase 4 — Public sites sweep (2026-07-17)

**Landing (TGE luxury):** home video hero + featured sections render (demo cards honestly labeled "EXEMPLU — NU O PROPRIETATE REALĂ"), 72 properties, property detail full w/ diacritics, footer legal links present (BUG-009 fixed). **Contact form round-trip verified**: POST 201 → "Mulțumim!" → DB row `TGE_LUXURY / landing / tge-contact / new`. Confirmed live: **BUG-103** (ORAȘ dropdown = 5 hardcoded ASCII cities: Cluj-Napoca/Oradea/**Timisoara**/**Brasov**/Sibiu, while properties exist in Satu Mare/Arad/etc.), **BUG-104** (footer socials = instagram.com/tge etc.). No console errors on home/detail.

**Revery (Adorys affordable):** purple/white theme, home + search render. **Tier isolation end-to-end confirmed**: the QA-created affordable property (56.000 EUR, created+edited in admin) appears on Revery's Cluj-Napoca list (4 results) and NOT on luxury landing. City filter here IS real (`?city=` param works) — contrast with landing's hardcoded dropdown. Mortgage calculator correct (120k→714 EUR/mo, bank-rate chips from admin data, amortization chart). New: **BUG-123** (dev-only @axe-core/react crash, prod-safe).

**Academy:** **full loop PASS** — register → auto-verify (EMAIL_VERIFICATION_DISABLED) → login → open public lesson → **auto-enrolled** + lesson-progress row. Lesson content renders fully (diacritics, Adorys branding). New: **BUG-124** (everything behind login; no anonymous landing/catalog — product decision to confirm).

**Academy e2e suite created (plan's file-writing exception):** `apps/academy/playwright.config.ts` (chromium, port 3053) + `tests/e2e/{smoke,auth}.spec.ts` (13 tests: auth-gate contract, public auth pages × ro/en, form validation). Added `@playwright/test` devDep + `test:e2e` script. **13/13 green.** Added `playwright-academy` job to `.github/workflows/ci.yml` (closes the academy CI gap). YAML validated.

**Phase 4 exit: complete.** All three public sites functionally sound; the real defects are the landing filter panel (BUG-103, Major) and content/UX minors. Academy now has its first regression net.

---

## Phase 5 — API + cross-cutting invariants (2026-07-17)

Full detail in `api-invariants.md`. **Brand isolation ✅** (cross-brand→404, missing→404, bogus→400), **realm isolation ✅** (academy↔admin token rejection), **uploads ✅** (qa-report #5 fixed — /uploads serves 200/404 correctly). **API-down failure mode ❌**: both landing + revery 500 on home AND properties (only static academy login survives) → **BUG-105 upgraded to Critical** and broadened to revery. Jest-covered invariants (tier-scope, refresh rotation, permission guards, draft-leak) not re-run per anti-duplication rule.

**Phase 5 exit: complete.** One new Critical severity upgrade (BUG-105); every platform security invariant (brand + realm isolation) holds on the live stack.
