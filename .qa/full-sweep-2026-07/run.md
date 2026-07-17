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
