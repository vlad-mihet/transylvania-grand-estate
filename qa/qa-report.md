# QA Report — `feature/reveria`

**Branch:** `feature/reveria`
**Date:** 2026-04-18
**Tester:** Lead QA (Claude agent)
**Method:** Ran `scripts/qa-smoke.sh` (90 assertions), plus code-level audits for UI flows no agent can click through (forms, maps, responsive, calculators). Cross-referenced with `docs/qa-report-2026-04-17.md`.

Everything that could be tested from a CLI against the running dev stack was tested. Everything that needs a human in a browser is flagged **UI-UNVERIFIED** in the per-app files and in `docs/qa-runbook.md` Phases C–F.

---

## Recommendation

### ✅ MERGE WITH CAVEATS

The branch has moved substantially since the 2026-04-17 evening report. Both blockers that were open then are fixed. **No P0 item fails.** The three real issues today are:

1. **[Major] Luxury property seed data has no Romanian diacritics** — user-visible misspelled Romanian on every Landing luxury detail page. Fix is mechanical (restore diacritics in `packages/data/src/properties.ts` + `developers.ts` + `testimonials.ts` + `articles.ts`) but it is definitely a policy violation per `feedback_diacritics.md`.
2. **[Major] Lint fails** — 3 errors + 3 warnings, all in `apps/reveria/src/components/property/`. Two confirmed `react-hooks/set-state-in-effect` errors. CI does not currently gate on lint, so this is not a release blocker *today* — but it is a real regression that will bite when gating turns on.
3. **[Major] Static `/uploads/` serving still returns 404 in dev** — carried from 2026-04-17 (Major #5, still open). Admin-uploaded images won't display in dev until the `ServeStaticModule` rootPath is corrected.

Plus Minors: missing fr/de translations on the new bank-rates admin screens; stale DB diacritics in city descriptions; one intentional `Common.propertyTypes.chalet` asymmetry in Reveria locales.

**If (1) lands before merge: REVERIA READY TO MERGE.** (2) and (3) are acceptable follow-ups if team accepts the tradeoffs.

---

## Summary

| App     | Blocker | Critical | Major | Minor | Trivial |
|---------|---------|----------|-------|-------|---------|
| admin   | 0       | 0        | 0     | 1     | 0       |
| api     | 0       | 0        | 1 ᵏ   | 1 ᵏ   | 1       |
| landing | 0       | 0        | 1     | 1     | 0       |
| reveria | 0       | 0        | 1     | 2     | 1       |
| **Total** | **0** | **0**  | **3** | **5** | **2**   |

ᵏ = already tracked as "known" in `docs/qa-report-2026-04-17.md`. Not new this pass.

Per-app detail in:
- `qa/admin.md`
- `qa/api.md`
- `qa/landing.md`
- `qa/reveria.md`

---

## Coverage caveat

The tester is a CLI agent without a browser. **UI-dependent tests** (visual rendering, map interactions, click-through form submission, responsive layout, splash overlay, Leaflet popups, calculator tab-through) are audited at the **code level** only and flagged `UI-UNVERIFIED` — they require a human to click through in Chrome/Firefox. Everything that is API-, build-, type-, lint-, file-, or schema-testable has been exercised directly.

The repo's `docs/qa-runbook.md` Phases C through F enumerate the UI checks that remain for a human pass.

---

## P0 release gate

| # | Check | Outcome |
|---|-------|---------|
| 1 | API boots on fresh DB | **SKIPPED** — live DB; not safe to nuke without explicit user OK. `prisma migrate status` says all 18 migrations applied clean. |
| 2 | API boots on existing DB | **PASS** — API live on :3333 with 694s uptime when probed; `/api/v1/health` → 200. |
| 3 | Seed runs clean | **SKIPPED** — DB already seeded; a `SEED_RESET=true` re-run would fix the stale city diacritics but was out of scope for the agent to take unilaterally. |
| 4 | All 4 apps start without errors | **PASS (HTTP)** — landing:3000, admin:3001, reveria:3002 all return correct redirects; api:3333/api/v1/health → 200. Console-level errors remain **UI-UNVERIFIED**. |
| 5 | middleware→proxy rename orphan check | **PASS** — Next.js 16.1.6 natively supports `proxy.ts`. Admin auth guard works. Landing/Reveria locale routing works. Confirmed at the compiled-middleware level (`.next/dev/server/middleware.js` wraps `apps/admin/src/proxy.ts`). |
| 6 | Brand tier isolation enforced | **PASS** — `X-Site: TGE_LUXURY` → 24 luxury only; `REVERIA` → 15 affordable only; `ADMIN` → 39 both. `FAKESITE` → 400. Client-side tampering `?tier=luxury` on REVERIA still returns only affordable. `X-Site-Resolved` header matches per request. |
| 7 | Landing shows only luxury; Reveria only affordable | **API PASS / UI-UNVERIFIED** — Origin-based resolution works for all three dev origins. Actual DOM rendering requires browser. |
| 8 | Admin login / refresh / logout round-trip | **PASS** — `scripts/qa-smoke.sh` B.3 exercises the full flow with a valid token. Bad creds → 401, bogus token → 401, refresh with valid token → new access token, refresh with garbage → 401. |
| 9 | Property CRUD round-trip | **PASS** — B.6 creates a property, hits duplicate-slug 409, PATCHes non-existent UUID → 404, deletes with valid ID. All asserted green. |

---

## Delta vs 2026-04-17 evening report

| # | Original severity | Status 2026-04-17 | Status **today (2026-04-18)** |
|---|---|---|---|
| #1 Blocker (landing image-less crash) | Blocker | Fixed | ✅ still fixed |
| #2 Blocker (Reveria 200-instead-of-404) | Blocker | Fixed | ✅ still fixed |
| #3 Critical (SVG upload via lied MIME) | Critical | Fixed | ✅ still fixed |
| #4 Critical (inquiry source dropped) | Critical | Fixed | ✅ still fixed |
| #5 Major (static `/uploads/` 404) | Major | Open | ❌ still open |
| #6 Major (Windows backslash in upload URL) | Major | Fixed | ✅ still fixed |
| #7 Major (`maxBedrooms` silently dropped) | Major | Fixed | ✅ still fixed |
| #8 Major (no `/health` endpoint) | Major | Fixed | ✅ still fixed |
| #9 Minor (login password length leak) | Minor | Fixed | ✅ still fixed |
| #10 Minor (middleware.ts → proxy.ts) | Minor | Partial → spawned #14 | ✅ fully fixed |
| #11 Minor (DELETE non-UUID → 404 not 400) | Minor | Fixed | ✅ still fixed |
| #12 Minor (unknown X-Site silent) | Minor | Open (as-designed) | ❌ still open (as-designed) |
| #13 Cosmetic (Swagger no top-level tags) | Cosmetic | Partial | (not re-verified; controllers tagged) |
| **#14 Blocker (admin proxy export wrong name)** | Blocker (new) | Open | ✅ **FIXED** — `export function proxy(req)` now in `apps/admin/src/proxy.ts:9` |
| **#15 Blocker (Reveria /en/blog 500)** | Blocker (new) | Open | ✅ **FIXED** — `/en/blog` → 200, 8 articles render. Other Reveria routes all 200. |

**Progress since yesterday:** 2 blockers resolved, 0 regressions in the previously-fixed set, 3 new Majors spotted (2 are cross-cutting code quality / data quality; one is the known static-uploads carry-over).

---

## Findings summary (detailed in per-app files)

### Majors

| Where | Issue | Fix sketch |
|---|---|---|
| `packages/data/src/{properties,developers,testimonials,articles}.ts` | ASCII-Romanian in seed data (97 hits in properties alone); DB serves it verbatim on Landing luxury detail pages | Run seed strings through a diacritic restorer; re-seed dev DB with `SEED_RESET=true` |
| `apps/reveria/src/components/property/*` | Lint fails with `react-hooks/set-state-in-effect` errors in `property-filter-panel.tsx:60` and `use-location-search.ts:21`, plus 1 more | Move the `setState` out of effect body; use derived values or event handlers |
| `apps/api/src/app.module.ts:34-38` | Static `/uploads/` returns 404 (rootPath depth wrong) | Use `path.resolve(process.cwd(), 'uploads')` or app's known path |

### Minors

- Admin `fr.json` / `de.json` missing 47 `BankRateForm.*` keys (`qa/admin.md`).
- Stale DB: city `description.ro` is ASCII even though source is correct — re-seed fixes (`qa/landing.md`).
- Reveria `Common.propertyTypes.chalet` exists only in `ro.json` (possibly intentional — `qa/reveria.md`).
- Unknown `X-Site` silently returns 0 rows (as-designed per team, tracked 2026-04-17 — `qa/api.md`).

### Trivials

- Port labels in `apps/api/src/main.ts:22` comment are swapped vs. actual dev scripts (`qa/api.md`).
- `calculateMortgage` treats 0% interest as error and returns 0 — unrealistic market edge case (`qa/reveria.md`).

---

## Reproducing this pass

```bash
# Assumes docker compose postgres is already up on :5435.
bash scripts/qa-smoke.sh            # 90 assertions, ~45s, exit 0 on clean
pnpm lint:all                        # currently exits 1 — 3 errors in reveria
pnpm build:all                       # currently exits 0 — all 5 projects build
```

Then consult `docs/qa-runbook.md` Phases C–F for the remaining UI checks that need a human driver. Every item flagged **UI-UNVERIFIED** in the per-app reports here maps to a line in that runbook.
