# Reveria — Findings

_All page-level HTTP smoke checks pass. Findings below are code-level issues surfaced by lint + code audit._

## Blocker
_none_

## Critical
_none_

## Major

### [Major] Lint fails on `feature/reveria` (3 errors, 3 warnings)
**Where:** `apps/reveria/` — two `react-hooks/set-state-in-effect` errors plus one unshown error, 3 Next/React-hook warnings.
**Command:** `pnpm lint:all` exits 1.
**Errors:**
- `apps/reveria/src/components/property/property-filter-panel.tsx:60:5` — `setSearch(searchParams.get("search") || "")` called synchronously inside `useEffect`. React 19 lint rule treats this as a cascading-render bug.
- `apps/reveria/src/components/property/use-location-search.ts:21:7` — `setResults(null)` called synchronously inside `useEffect`.
- (1 more error elided by NX output truncation — likely in the same component family.)

**Warnings:**
- `apps/reveria/src/components/property/map-property-popup.tsx:20:11` — `<img>` element instead of `next/image`.
- `apps/reveria/src/components/property/property-map.tsx:275:6` — `useEffect` missing dependency `tMap`.

**Expected:** `pnpm lint:all` exits 0.
**Notes:**
- CI currently only deploys and does not gate on lint (see `.github/workflows/deploy-fly.yml` — runs on push to `main`, not PR). So this is not a release-blocker *today*, but it is a regression vs. the clean-lint baseline and will bite the team when lint gating is turned on.
- The two `set-state-in-effect` errors are real: they can cause double-renders when the searchParams URL state changes. Low user impact but real.

## Minor

### [Minor] `Common.propertyTypes.chalet` exists only in `ro.json`
**Where:** `apps/reveria/messages/ro.json` has the `Common.propertyTypes.chalet` key ("Cabană"); `en.json`, `fr.json`, `de.json` do not.
**Behaviour:** next-intl falls back to the default locale, so an `en` user viewing a chalet listing sees "Cabană" (Romanian) — or raw key "chalet" — depending on fallback strategy.
**Notes:** `docs/qa-runbook.md` calls out an intentional "Cabană" override for Reveria. If intentional, the matching translations should exist for en/fr/de too (`Chalet` / `Chalet` / `Chalet` is the natural rendering in those locales). Low priority if `chalet` is a rare type in Reveria inventory.

### [Minor] `ro.json` has 1 more key than `en.json` (a consequence of the above)
Key count per locale: `en=644, ro=645, fr=643, de=643`. ro=645 includes `Common.propertyTypes.chalet` that others lack.

## Trivial

### [Trivial] 0% interest rate in mortgage calculator returns monthly payment = 0
**Where:** `apps/reveria/src/lib/calculators/mortgage.ts:24`
**Code:** `if (principal <= 0 || annualRate <= 0 || termYears <= 0) return { monthlyPayment: 0, ... }`
**Expected:** At 0% interest, monthly payment = principal / totalMonths (still a meaningful result).
**Actual:** Treats 0% as an input error and returns zeros.
**Impact:** Extremely unlikely in the Romanian market (rates never 0%). Mentioned for completeness only.

## UI-UNVERIFIED (requires human browser pass)

The automated smoke suite validated HTTP 200 on every page. Not covered without a browser:
- Map view at `/properties?view=map` — cluster rendering, pin popup on click.
- Filter bar debouncing + URL sync (city, price, beds 1–6+, amenities).
- Inline contact/inquiry form submit UX — error shaping, 5/min rate-limit message.
- Calculator interactive edge cases: negative inputs, huge numbers, tab-through accessibility.
- Responsive at <375px, 375–767px, ≥1024px.
- Diacritic rendering in browser (files have correct diacritics; visual confirmation is a human task).

## Passed

- 17 page-level routes return HTTP 200: `/en`, `/ro`, `/en/properties`, `/en/properties?view=map`, `/en/cities`, `/en/developers`, `/en/agents`, `/en/blog`, `/en/faq`, `/en/about`, `/en/contact`, `/ro/instrumente`, plus all four `/ro/instrumente/*` calculator pages.
- 404 path handling correct on `/properties/does-not-exist-zzz`, `/cities/…`, `/developers/…`, `/agents/…`, `/blog/…` (was Blocker #2 in 2026-04-17; now fixed).
- Cross-tier slug guard works: Reveria requesting a luxury slug → 404.
- Mortgage math formula is the standard amortization equation (`P*r*(1+r)^n / ((1+r)^n − 1)`), hand-verified against the known answer for €200k/6%/30y ≈ €1,199/mo.
- `X-Site: REVERIA` header is injected by `@tge/api-client` per `apps/reveria/next.config.ts:7` (`NEXT_PUBLIC_SITE_ID: "REVERIA"`). API-side tier scope binds correctly (see `qa/api.md`).
