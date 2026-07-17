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

## BUG-205 — Landing property detail 500s for a property with zero images (`images[0].src` unguarded)
- **Severity:** Critical · **Surface:** landing (+admin pipeline) · **Status:** Open
- **Repro:** created `apartament-qa-sweep-fara-imagini-cluj` via admin with no images (admin allows it; detail page shows "Încă nu există imagini."). Landing `/ro/properties/<slug>` → **500**, page source shows `TypeError: Cannot read properties of undefined (reading 'src')`. Seeded image-ful property → 200.
- Legacy Blocker #1 territory (zero-image rendering) — either never covered for the landing detail template or regressed. Revery detail template should be checked for the same pattern in the fix wave.
- **Fix direction:** guard the hero/gallery `images[0]` access with a placeholder (empty-gallery state), or block publishing image-less properties (product call) — but the public page must never 500 either way.

## BUG-206 — Property /new form: default values fail the form's own validation; sticky cross-entity locale can silently mis-file content
- **Severity:** Major · **Surface:** admin · **Status:** Open
- **Trap 1 (defaults invalid):** a fresh form initializes `Anul construcției = 0` → save blocked with "Year built must be at least 1800"; clearing to empty ALSO fails (year is de-facto mandatory). Untouched `Cartier` similarly failed once registered ("Too small: expected string to have >=1 characters" — empty string vs optional). A minimal listing cannot be saved without hand-fixing fields the form itself pre-filled.
- **Trap 2 (sticky locale):** the localized editor's `?loc=` persists across unrelated entity forms — after editing a testimonial's EN tab, `/ro/properties/new` opened with **EN active**; typing filled the EN locale while RO (required) stayed empty. Silent content mis-filing; fresh forms should open on the default locale.
- **Also:** year-required-by-design makes no-year listings impossible via UI (awkward for land plots) — product question, noted not filed separately.

## BUG-207 — Article editor "Publică" button doesn't publish: saves with current Status-select value and toasts success
- **Severity:** Major · **Surface:** admin · **Status:** Open
- **Repro:** article in Ciornă (draft) → click **Publică** → toast "Articol actualizat", but DB status stays `draft` and public blog page stays 404. Reproduced twice (PATCH 200 each time, status unchanged). Setting the **Status select** to Publicat and clicking "Salvează schiță" DOES publish (status=published, public 200) — so the button pair semantics are inverted/overlapping: "Publică" doesn't set status, and "Salvează schiță" saves whatever the select says (including published).
- **Impact:** an editor clicking the obvious publish CTA believes the article went live (success toast) while it remains draft — silent publish failure.
- **Fix direction:** "Publică" must force `status: published` in its payload (and "Salvează schiță" arguably should force draft, or the Status select should be the single source with one Save button).
- **Side note (BUG-109 context):** draft articles correctly 404 publicly and disappear from `/blog` list — the leak fix holds; this is a new authoring defect, not a leak.

## BUG-204 — Inquiries kanban view completely non-functional: requests `limit=200`, schema caps at 100
- **Severity:** Major · **Surface:** admin + api · **Status:** Open
- **Repro:** `/ro/inquiries?view=kanban` → error card "Something went wrong / We couldn't load this"; Reîncearcă re-fails. Network: `GET /api/v1/inquiries?limit=200&expand=allLocales` → 400. Curl isolation: `limit=100` → 200, `limit=101` → 400 (`validation.limit.too_big`, "expected number to be <=100"). List view works (limit=20) — kanban is the only casualty.
- **Same failure class as BUG-202/118:** admin client params drift out of sync with strict query schemas, and the UI degrades to a dead error card. Prior sweep verified kanban working (⚠ with BUG-112/113 notes), so this regressed since — likely a kanban page-size bump past the schema cap, or a schema cap added after.
- **Fix direction:** either raise the schema cap / add kanban pagination, or drop the kanban fetch to ≤100 — plus the same client/schema parity sweep as BUG-202.
- **Secondary:** error-card copy is English ("Something went wrong…", "Retry or refresh") on the RO locale — should use localized messages.

## BUG-203 — Property form "CARACTERISTICI" section: "+ Add feature" button hardcoded English in RO locale
- **Severity:** Minor · **Surface:** admin · **Status:** Open
- **Repro:** `/ro/properties/new` (html lang=ro), scroll to CARACTERISTICI → button label is "+ Add feature" (should be Romanian, e.g. "+ Adaugă caracteristică"). Same family as BUG-106's literal-EN labels; the amenity toggles (FACILITĂȚI) themselves are correctly localized, so this is one straggler key, likely untranslated or hardcoded.
- **Broadened during Phase 3 — all hardcoded-EN strings found on admin RO pages:** "+ Add feature" (CARACTERISTICI); "Find address" label + "Search an address to fill coordinates..." placeholder; validation messages ("Year built must be at least 1800", "Too small: expected string to have >=1 characters"); save toast "Please fix N fields before saving — check the highlighted fields."; error-card copy "Something went wrong / We couldn't load this. Retry or refresh the page." (invitations page + kanban, noted in BUG-204).
- **Check in fix wave:** grep the property-form feature-list component for other hardcoded strings (empty-state text, remove-button title) across en/fr/de too.

## BUG-201 — Public listing pages 500 when the API is unreachable (SSR guard only covers homepages)
- **Severity:** Critical · **Surface:** landing + revery · **Status:** Open
- **Extends:** BUG-105 (full-sweep-2026-07) — that fix guarded the two homepages, which still return 200 with the API down. The listing pages were left unguarded.
- **Repro (deterministic):** stop the API, then GET: landing `/en/cities` → 500, `/en/developers` → 500, `/ro/properties` → 500; revery `/ro/properties` → 500, `/ro/cities` → 500. Homepages (`/ro` both sites) and static pages (`/en/about`) correctly 200.
- **Real-world trigger observed this sweep:** during the Phase-1 landing Playwright run (concurrent with API-e2e testcontainers load), SSR fetches timed out and 6 `[mobile]` cross-locale smoke tests failed with genuine 500s on `cities`/`developers` (en/fr/de). Same URLs 200 once load subsided. In prod (Vercel SSR → Fly API, cross-cloud) transient hiccups are expected; core browse pages should degrade like the homepages do, not 500.
- **Fix direction:** extend the BUG-105 guard pattern (guarded fetch + empty-state shell) to the SSR fetches in landing `cities`/`developers`/`properties` list pages and revery `properties`/`cities` list pages.
- **Automation note:** the 6 landing `[mobile]` reds in Phase 1 are this bug's manifestation, not an independent flake; CI misses it because CI runs `--project=desktop` and is rarely under equivalent load.
