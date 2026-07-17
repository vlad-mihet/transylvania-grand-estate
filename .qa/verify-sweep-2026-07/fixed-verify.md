# Prior-Stamp Verification — full-sweep-2026-07 dispositions

One row per prior Fixed@/Wontfix stamp. Verification is **empirical** (UI/wire on a fresh
build), not code-reading. `HOLDS` = re-verified working; `REGRESSED→BUG-2xx` = refiled in
bugs.md; `AUTO` = covered by a green suite run in Phase 1 (suite named); `N-V` = not
verifiable this sweep (reason given).

| BUG | Severity | Claim (short) | How verified | Result |
|---|---|---|---|---|
| BUG-101 | Minor | lint clean across 4 apps + CI gate | Phase 1 `pnpm lint:all` — 0 errors / 26 warnings, 5 projects | **HOLDS** (AUTO) |
| BUG-102 | Major | e2e env-leak fixed | Phase 1 API e2e — 25/25 suites, 198/198 | **HOLDS** (AUTO) |
| BUG-103 | Major | landing city filter API-driven w/ diacritics | Phase 2 UI: dropdown = 19 brand-scoped cities from API, full diacritics (Brașov/București/Târgu Mureș…); filter works (Brașov → 6 results, `?city=brasov`) | **HOLDS** |
| BUG-104 | Minor | placeholder socials hidden (both footers) | Phase 2 UI: landing footer has 0 social links + "Credite media" link present; revery footer in Phase 4 | **HOLDS** (landing; revery pending Phase 4) |
| BUG-105 | Critical | public homepages survive API down (SSR guarded) | Kill-API probe (pulled into Phase 1): landing `/ro` 200, revery `/ro` 200 with API stopped | **HOLDS** (literal claim) — but guard doesn't extend to listing pages → **BUG-201** filed (Critical) |
| BUG-106 | Minor | amenity labels localized | Phase 2 UI ro: FACILITĂȚI fully localized w/ diacritics (Terasă, Mașină de spălat, Uși blindate…). One straggler found → BUG-203 ("+ Add feature" EN in RO). en/fr/de spot in Phase 3 | **HOLDS** (with BUG-203 side-finding) |
| BUG-107 | Minor | unsaved-changes guard on sidebar nav | Phase 1 admin PW unsaved-changes spec (dismiss/accept/clean 3/3 green) | **HOLDS** (AUTO) |
| BUG-108 | Major | GDPR hard-purge cron registered | Phase 1 API e2e `inquiry-gdpr-purge` green + `@Cron(EVERY_DAY_AT_3AM) purgeSoftDeleted` + ScheduleModule init in boot log | **HOLDS** (AUTO+boot) |
| BUG-109 | Major | draft article leak closed | Phase 1 API e2e (article-public-visibility) + Phase 3 UI publish/unpublish | pending |
| BUG-110 | Minor | webkit contact form fixed | Phase 1 revery full matrix incl. webkit forms specs — 702/702 | **HOLDS** (AUTO) |
| BUG-111 | Minor | admin i18n minor | Phase 2 console pass | pending |
| BUG-112 | Minor | admin i18n minor | Phase 2 console pass | pending |
| BUG-113 | Minor | admin i18n minor | Phase 2 console pass | pending |
| BUG-114 | Minor | IntlError spam eliminated | Phase 2 console pass (zero IntlError bar) | pending |
| BUG-115 | Major | slug derivation from RO-only title | Phase 2 UI: RO title "Casă de test QA Știință Brașov" → Generează → `casa-de-test-qa-stiinta-brasov` | **HOLDS** |
| BUG-116 | Major | year-built NaN fixed | Phase 2 UI | pending |
| BUG-117 | Critical | audit trail alive under /api/v1 | Phase 1 API e2e (audit-trail) + Phase 2 audit-logs page | pending |
| BUG-118 | Critical | people/team page functional | Phase 2 UI: page renders but list silently EMPTY; network shows `auth/users?limit=100&expand=allLocales` → 400 unrecognized key `expand` | **REGRESSED→BUG-202** (new key, same class; `limit` itself still accepted) |
| BUG-119 | Minor | admin i18n minor | Phase 2 console pass | pending |
| BUG-120 | Minor | (per prior ledger) | Phase 1 suites / Phase 2 | pending |
| BUG-121 | Minor | admin i18n minor | Phase 2 console pass | pending |
| BUG-122 | Minor | admin i18n minor | Phase 2 console pass | pending |
| BUG-123 | Trivial | revery dev axe crash guarded — **ledger says Open, run.md says fixed: reconcile** | Phase 2 dev console | pending |
| BUG-124 | Wontfix | academy login-gate by design | Phase 2 logged-out probes + Phase 4 | pending |
| BUG-125 | Wontfix | cookie banner not required (essential-only cookies) | Phase 2 local + Phase 7 prod cookie inventory | pending |
| BUG-126 | Major | REBS schema default → demo tenant | Phase 6 config check (no live sync this sweep) | pending |
| BUG-127 | Open | seed city diacritics (prod pending reseed) | Phase 0 local SELECT + Phase 7 gated prod reseed | pending |
| BUG-128 | Minor | fresh /new form not dirty | Phase 1 admin PW "a clean form navigates without a prompt" green | **HOLDS** (AUTO) |
