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

_(in progress)_
