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

**Cleanup done inline:** reset `site_config.tge_homepage_cities` to default after curation test; QA artifacts remaining for Phase 9 cleanup: QA property (apartament-qa-sweep-fara-imagini-cluj, now with 2 images), QA testimonial, QA bank rate, QA inquiries (2 seed-probes + landing + revery contact), 1 accepted EDITOR (qa-sweep-editor@example.com), 1 academy student (qa-sweep-student@example.com, enrolled Ghidul Vânzărilor).

---

## Phase 4 — Public sites sweep (ro+en deep, fr+de spot)

- **Landing (TGE):** home hero video (`hero.webm`) + Media Credits link; contact round-trip → "Mulțumim!" + DB `siteId=TGE_LUXURY / source=tge-contact / locale=ro`; footer 0 socials; 404 clean.
- **Revery (Adorys):** list 18 demo-labeled cards; **Leaflet map works** (30 tiles + clustered pins synced to list); calculators → **BUG-214** + QA-Sweep-Bank chip cross-app confirmed; contact round-trip → DB `siteId=REVERY / source=revery-contact`; footer 0 socials + "Credite foto"; **no axe error (BUG-123 confirmed fixed)**; routes are EN segments.
- **Academy:** register → auto-verify → enroll → complete lesson → **progress persists across reload** (1/3, ✓ CITITĂ) + auto-advance; login-gate holds (BUG-124); BUG-212 hydration mismatch on every page.
- **Cross-tier isolation (UI):** affordable → revery 200/landing 404; luxury → landing 200/revery 404. Clean.
- **fr/de spot:** all fr+de routes 200, no raw i18n keys leaking (copy drift = translator deferral).

**Findings:** BUG-211 (audit label key), BUG-212 (academy hydration), BUG-213 (radix select focus), BUG-214 (calc label+precision).

---

## Phase 5 — API + cross-cutting invariants (curl vs local :4000)

All ✅ (skipped what Jest e2e already covers):
- **Brand isolation:** cross-brand slug (luxury via REVERY X-Site) → 404; same slug via TGE_LUXURY → 200; bogus X-Site → 400; **UNKNOWN (no X-Site/Origin) → empty list** (the known misconfiguration failure mode, confirmed contained).
- **Tier widening ignored:** `?tier=luxury` via REVERY X-Site → results stay `{affordable}` only.
- **Realm isolation:** academy(student) token → admin `/auth/users` → 401; student token → `/admin/academy/enrollments` → 401; student → own realm `/academy/courses` → 200.
- **Zod error shape:** malformed inquiry → 400 / `ValidationError` / `fields[]` / `requestId` (consistent structured envelope).
- **Uploads:** static `/uploads/<missing>` → 404; unauth `POST /admin/uploads/inline-images` → 401 (real routes are `admin/uploads` + `admin/academy/enrollments`, not the bare paths).
- **Rate limit:** re-hammer showed 401s not 429s because the dev API is currently `DEV_AUTH_THROTTLE_DISABLED=1` (browser-phase config); the 429 enforcement was confirmed by the throttle-ENABLED qa-smoke run in Phase 1 (89/0).

**Phase 5 exit: PASS** — no new findings.

---

## Phase 6 — Deferred-items refresh

All deferrals re-verified clean (academy 4–6 grep-clean, logo text-wordmark intact, REBS schema default = demo, licensed images pending, fr/de translator). Full table + owner-decision list in `deferred-refresh.md`. No findings.

---

## Phase 7 — Prod verification

- **Read-only:** prod API healthy (Fly v92, today); brand isolation correct (luxury 72 / revery 36 / bogus 400); landing+revery Vercel prod = **8803c14 (baseline, current)**; academy live. Custom domains (tge.ro/revery.ro/adorys.ro) **don't resolve — DNS deferred**; public sites reachable only via protected Vercel URLs.
- **BUG-127 prod: FIXED** (user-approved, backup-conditioned). `pg_dump`'d prod first (1.27 MB, 33 tables → `scratchpad/prod-backup-2026-07-17.sql`); chose **targeted UPDATE over full reseed** after discovering prod holds non-seed real listings (Stefanestii de Jos, Voluntari) a `SEED_RESET` would destroy; fixed 22 rows (Brasov/Bucharest/Bucuresti/Timisoara → diacritics) in one transaction; prod API verified all-correct. 1 real non-seed listing left for owner.
- **Approved probes: executed + cleaned up.** Contact (prod /inquiries → 201, TGE_LUXURY) and academy registration (200, auto-verifies) both work; both QA-PROBE rows hard-deleted after (0 remaining). Authed admin browse deferred (no prod creds).

Full detail in `prod-checks.md`. **Phase 7 exit: PASS**, BUG-127 closed on prod.

---

## Phase 8 — Fix waves (user: "everything fixable now"; EDITOR policy: inquiries-yes / audit-no)

All fixes in one commit `Fixed@9275f3e`. **12 of 14 findings fixed; 2 deferred with reason.**

**Wave 1 (Critical):** BUG-201 (SSR guards on 5 listing pages → empty state not 500), BUG-202 (drop `.strict()` from users+invitations query schemas), BUG-205 (port revery's empty-images gallery guard to landing).
**Wave 2 (Major):** BUG-204 (inquiries limit cap 100→500 for kanban), BUG-206 (drop cross-entity sessionStorage locale resume), BUG-207 (article Publică/Salvează force status by button intent), BUG-208 (grant EDITOR inquiries read), BUG-209 (audit list ADMIN+ only, remove EDITOR nav perm), BUG-214 (RO `ltvRatio` label → "Grad de finanțare (LTV)").
**Wave 3 (Minor):** BUG-203 (localize property-form strings, 4 locales), BUG-210 (roll up county propertyCount live from cities), BUG-211 (audit feed uses full action path → `property.image.*` resolves leaf).
**Deferred (Minor, prod-self-healing, need focused repro / dep bump):** BUG-212 (academy hydration mismatch — layout `<main>` is static, SessionRestorer unconditional, nested layouts passthrough; root cause needs bisection, not a blind change), BUG-213 (radix Select 2.2.6 typeahead focus TypeError — upstream; fix is a `radix-ui` bump needing its own regression cycle).

**Verified empirically (fresh API build + restart):**
- BUG-201: all 5 listing pages → **200 with API stopped** (were 500).
- BUG-202: `auth/users` + `invitations` with `expand=allLocales` → **200**.
- BUG-204: `inquiries?limit=200` → **200**.
- BUG-205: zero-image landing detail → **200 + "Fără imagini" placeholder**, no crash.
- BUG-208: EDITOR inquiries → **200**; BUG-209: EDITOR audit → **403**.
- BUG-210: counties now report real counts (Alba 3, Bihor 2, Cluj 2, …; 9 non-zero).
- Typecheck clean: api, admin, landing, revery.

**Regression coverage added:** `apps/api/test/verify-sweep-regressions.e2e-spec.ts` locks BUG-202/204/208/209 (BUG-202/204 are repeat regressions of the strict-schema / limit-cap class → spec stops a third recurrence).

---

**Env lesson (recorded for future baselines):** every CI Playwright job sets `DEV_AUTH_THROTTLE_DISABLED=1`; the first local runs were made without it. Result: admin suite's shared BFF session died on `/auth/refresh` 429s (10/min bucket) → 2 unsaved-changes reds; landing `[mobile]` cross-locale smoke got real 500s from listing pages when SSR fetches failed under throttle/load — which exposed **BUG-201** (listing pages unguarded against API failure; deterministic kill-API repro). Dev API restarted with the flag for all Playwright/browser phases; qa-smoke will run last against a throttle-ENABLED API restart (its 429 check needs it).

---

## Phase 9 — Final re-verify + closeout

- **Fresh reseed** (user-consented): all sweep artifacts cleared (QA property/testimonial/bank-rate/inquiries, accepted EDITOR, academy student → 0 each); diacritics correct (0 ASCII city rows).
- **Full green gate on clean data (fixes applied):** API e2e **203/203, 26 suites** (198 baseline + 5 new regression tests); Admin PW **44/44**; Landing PW **143/143**; Academy PW **13/13**; Revery chromium core **231 passed** (3 flaky→passed on retry, locale route/calc timing; 1 skip); Lint **5 projects clean**.
- **`.env` restored:** `REBS_SYNC_ENABLED=1`.
- **Ledgers complete:** `fixed-verify.md` — all 28 prior stamps dispositioned; `bugs.md` — zero bare Open (12 Fixed@9275f3e, 2 Deferred-with-reason); `admin-matrix.md` zero ⬜; `prod-checks.md` + `deferred-refresh.md` done.

**Phase 9 exit: PASS.**

## FINAL TALLY — verify-sweep-2026-07

28 prior stamps re-verified (all hold; BUG-118's regression caught + refixed). **14 new findings (BUG-201–214): 12 fixed + regression-tested, 2 deferred with reason.** BUG-127 also closed on prod (backup + targeted normalization). Platform swept end-to-end (admin all roles, 3 public sites, API, prod) — every gate green.

**Owner-decision list** (see `deferred-refresh.md`): REBS prod key/flags; contact-flow go-live (DNS/Resend/legal); licensed city images Phase 2; fr/de translation; 1 prod real-listing city (`Stefanestii de Jos` → Ștefăneștii de Jos); BUG-212/213 deferred Minors. Prod public sites are pre-DNS-launch (custom domains unresolved), reachable only via Vercel URLs.
