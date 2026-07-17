# Verification Sweep 2026-07 — Findings Ledger

IDs: **BUG-201+** (legacy ledgers own 001–020; full-sweep-2026-07 owns 101–128).
A regression of a prior fix gets a NEW BUG-2xx ID plus a `Regression-of: BUG-1xx` line — never reuse old IDs.

Severity rubric (same as prior sweep):
- **Blocker** — core flow broken or platform invariant violated
- **Critical** — major flow broken, or data-integrity/security defect
- **Major** — works but significant defect
- **Minor** — cosmetic or edge-case
- **Trivial** — nit

Status: `Open | Fixed@<sha> | Wontfix | Deferred`. Every non-Open stamp carries evidence.

---

## BUG-202 — Team page AND Invitations page dead: `expand=allLocales` rejected by strict users + invitations query schemas
- **Severity:** Critical · **Surface:** admin + api · **Status:** Open
- **Blast radius (curl sweep of 15 admin list endpoints with `?limit=10&expand=allLocales`):** exactly two reject it — `auth/users` → 400 (team page silently empty) and `invitations` → 400 (invitations page dead error-card "Something went wrong"). All other list endpoints (inquiries, agents, properties, articles, developers, testimonials, cities, counties, financial-data/indicators, audit-logs, search/history) tolerate it.
- **Regression-of:** BUG-118 (same failure class: admin client query param rejected by `.strict()` schema → team page renders "Nimic de afișat încă" with zero users and no error surfaced). The BUG-118 fix admitted `limit`; the client now also appends `expand=allLocales` and `GET /api/v1/auth/users?limit=100&expand=allLocales` → 400 `Unrecognized key: "expand"`.
- **Empirical isolation (curl, SUPER_ADMIN token):** `?limit=100` → 200; `?limit=100&expand=allLocales` → 400 (`validation.value.unrecognized_keys`).
- **Blast-radius note:** the admin client appends `expand=allLocales` to every list call; `inquiries`, `agents?unlinked=true`, `search/history` all tolerate it (200). Only the users endpoint's schema is strict without it — fix should sweep ALL admin list query schemas for parity with the client's global params, not just patch this one key (that's how BUG-118's fix missed this).
- **Secondary defect, same page:** the 400 is swallowed — UI shows the empty-state ("Nimic de afișat încă") instead of an error state, exactly the silent-failure UX that let this regress unnoticed. Consider surfacing fetch errors on the team list.
- **Coverage gap:** no Playwright spec walks people/team (44/44 admin suite green while the page is broken). Fix wave must add a marker/regression spec asserting ≥3 users render on the seeded DB.
- **Why fresh:** likely `expand=allLocales` was introduced to the shared client after the prior sweep's fix wave (localized-editor/i18n work) without re-walking this page.

## BUG-204 — Inquiries kanban view completely non-functional: requests `limit=200`, schema caps at 100
- **Severity:** Major · **Surface:** admin + api · **Status:** Open
- **Repro:** `/ro/inquiries?view=kanban` → error card "Something went wrong / We couldn't load this"; Reîncearcă re-fails. Network: `GET /api/v1/inquiries?limit=200&expand=allLocales` → 400. Curl isolation: `limit=100` → 200, `limit=101` → 400 (`validation.limit.too_big`, "expected number to be <=100"). List view works (limit=20) — kanban is the only casualty.
- **Same failure class as BUG-202/118:** admin client params drift out of sync with strict query schemas, and the UI degrades to a dead error card. Prior sweep verified kanban working (⚠ with BUG-112/113 notes), so this regressed since — likely a kanban page-size bump past the schema cap, or a schema cap added after.
- **Fix direction:** either raise the schema cap / add kanban pagination, or drop the kanban fetch to ≤100 — plus the same client/schema parity sweep as BUG-202.
- **Secondary:** error-card copy is English ("Something went wrong…", "Retry or refresh") on the RO locale — should use localized messages.

## BUG-203 — Property form "CARACTERISTICI" section: "+ Add feature" button hardcoded English in RO locale
- **Severity:** Minor · **Surface:** admin · **Status:** Open
- **Repro:** `/ro/properties/new` (html lang=ro), scroll to CARACTERISTICI → button label is "+ Add feature" (should be Romanian, e.g. "+ Adaugă caracteristică"). Same family as BUG-106's literal-EN labels; the amenity toggles (FACILITĂȚI) themselves are correctly localized, so this is one straggler key, likely untranslated or hardcoded.
- **Check in fix wave:** grep the property-form feature-list component for other hardcoded strings (empty-state text, remove-button title) across en/fr/de too.

## BUG-201 — Public listing pages 500 when the API is unreachable (SSR guard only covers homepages)
- **Severity:** Critical · **Surface:** landing + revery · **Status:** Open
- **Extends:** BUG-105 (full-sweep-2026-07) — that fix guarded the two homepages, which still return 200 with the API down. The listing pages were left unguarded.
- **Repro (deterministic):** stop the API, then GET: landing `/en/cities` → 500, `/en/developers` → 500, `/ro/properties` → 500; revery `/ro/properties` → 500, `/ro/cities` → 500. Homepages (`/ro` both sites) and static pages (`/en/about`) correctly 200.
- **Real-world trigger observed this sweep:** during the Phase-1 landing Playwright run (concurrent with API-e2e testcontainers load), SSR fetches timed out and 6 `[mobile]` cross-locale smoke tests failed with genuine 500s on `cities`/`developers` (en/fr/de). Same URLs 200 once load subsided. In prod (Vercel SSR → Fly API, cross-cloud) transient hiccups are expected; core browse pages should degrade like the homepages do, not 500.
- **Fix direction:** extend the BUG-105 guard pattern (guarded fetch + empty-state shell) to the SSR fetches in landing `cities`/`developers`/`properties` list pages and revery `properties`/`cities` list pages.
- **Automation note:** the 6 landing `[mobile]` reds in Phase 1 are this bug's manifestation, not an independent flake; CI misses it because CI runs `--project=desktop` and is rarely under equivalent load.
