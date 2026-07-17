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
