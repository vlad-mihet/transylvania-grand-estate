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

## BUG-201 — Public listing pages 500 when the API is unreachable (SSR guard only covers homepages)
- **Severity:** Critical · **Surface:** landing + revery · **Status:** Open
- **Extends:** BUG-105 (full-sweep-2026-07) — that fix guarded the two homepages, which still return 200 with the API down. The listing pages were left unguarded.
- **Repro (deterministic):** stop the API, then GET: landing `/en/cities` → 500, `/en/developers` → 500, `/ro/properties` → 500; revery `/ro/properties` → 500, `/ro/cities` → 500. Homepages (`/ro` both sites) and static pages (`/en/about`) correctly 200.
- **Real-world trigger observed this sweep:** during the Phase-1 landing Playwright run (concurrent with API-e2e testcontainers load), SSR fetches timed out and 6 `[mobile]` cross-locale smoke tests failed with genuine 500s on `cities`/`developers` (en/fr/de). Same URLs 200 once load subsided. In prod (Vercel SSR → Fly API, cross-cloud) transient hiccups are expected; core browse pages should degrade like the homepages do, not 500.
- **Fix direction:** extend the BUG-105 guard pattern (guarded fetch + empty-state shell) to the SSR fetches in landing `cities`/`developers`/`properties` list pages and revery `properties`/`cities` list pages.
- **Automation note:** the 6 landing `[mobile]` reds in Phase 1 are this bug's manifestation, not an independent flake; CI misses it because CI runs `--project=desktop` and is rarely under equivalent load.
