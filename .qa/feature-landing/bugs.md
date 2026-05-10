# Bug Report — `feature-landing` QA Pass

End-to-end QA campaign on the TGE landing app (`apps/landing`). Format mirrors `.qa/feature-reveria/bugs.md`. Each bug gets a unique `BUG-###` id assigned in order of discovery.

**Severity rubric:**
- **Blocker** — merge unsafe; data loss, auth broken, migration failure, brand-isolation leak
- **Critical** — golden path broken for a major surface
- **Major** — feature works but with visible defect
- **Minor** — cosmetic, edge-case, non-default locale
- **Trivial** — typos, console warnings

---

<!-- Bugs appended below as they are discovered -->

### BUG-001 — Landing has no `.env` / `.env.local` and api-client default points at the wrong port (`:3333` ≠ `PORT=4000`) — **FIXED 2026-05-09**
- **Severity:** Critical
- **App/Area:** landing (env config) + packages/api-client (default fallback)
- **Phase:** D-0
- **Environment:** local, commit 9f408a1, pnpm 10.13.1, Node v24.x
- **Steps to reproduce:**
  1. Fresh checkout, no env tweaks.
  2. Start API: `cd apps/api && pnpm dev` — API binds to `PORT=4000` (per `apps/api/.env:6`).
  3. Start landing: `pnpm --filter @tge/landing dev` — landing serves on `:3050`.
  4. Open `http://localhost:3050/ro/properties` (server-side fetch path).
- **Expected:** SSR fetches the `/properties` collection from the running API and renders the property grid.
- **Actual:** every SSR fetch is sent to `http://localhost:3333/api/v1/...` (the api-client fallback in `getApiBase()`); the running API is on `:4000`. Connection refused → empty grid + error markers in the rendered HTML (`grep -oE '404|error|Error'` over the response body matches). Cross-app proof: `curl -H 'X-Site: TGE_LUXURY' http://localhost:4000/api/v1/properties?limit=3` returns 24 luxury properties; `curl http://localhost:3050/ro/properties` shows zero `"slug"` strings in the markup.
- **Suspected cause:** two-part config drift —
  1. `apps/landing/` has **no `.env` file at all** (cf. `apps/admin/.env:1` which sets `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1`, and `apps/academy/.env.local`). Landing is the only app with no env.
  2. `packages/api-client/src/client.ts:78` falls back to `http://localhost:3333/api/v1` when the env var is unset — but `apps/api/.env:6` pins API on `4000`, and `apps/api/src/main.ts:118` has its own default of `3333`. The default-port story is split three ways across the repo.
- **Evidence:**
  ```
  $ grep -nR "3333" apps/api/.env apps/api/src/main.ts packages/api-client/src/client.ts
  apps/api/src/main.ts:118: const port = configService.get<number>('PORT', 3333);
  packages/api-client/src/client.ts:78:   return "http://localhost:3333/api/v1";

  $ grep -nR "4000" apps/api/.env apps/admin/.env
  apps/api/.env:6:    PORT=4000
  apps/api/.env:42:   NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
  apps/admin/.env:1:  NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
  ```
- **Suggested fix:** create a checked-in `apps/landing/.env.example` (and add a `.env.local` for dev) with `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1`, mirroring `apps/admin/.env`. Optionally align the api-client fallback in `packages/api-client/src/client.ts:78` with the API's actual default port (or remove the fallback entirely and force apps to declare `NEXT_PUBLIC_API_URL`). Note: this campaign created `apps/landing/.env.local` locally to unblock QA execution; that file is gitignored.
- **Fix applied:**
  - `.gitignore:36-39` — added `!.env.example` + `!.env.local.example` exceptions so example envs can be tracked.
  - `apps/landing/.env.example` (new, checked in) — documents `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1`.
  - `packages/api-client/src/client.ts:69-92` — dev fallback aligned to `:4000` (matching `apps/api/.env`); first invocation prints a one-shot `console.warn` pointing devs at the env var. Production still throws.

### BUG-002 — Global `InquiryModal` (`@tge/ui`) bypasses `useInquirySubmission`; `source` + `sourceUrl` never stamped on submissions — **FIXED 2026-05-09**
- **Severity:** Critical
- **App/Area:** packages/ui (used by landing + revery + admin marketing surfaces)
- **Phase:** D-1
- **Environment:** local, commit 9f408a1
- **Steps to reproduce:**
  1. Open any landing CTA backed by `<InquiryTrigger>` (homepage CTA banner, header "Schedule Viewing", property detail "Request Info", developer detail, etc.).
  2. Submit the modal form.
  3. `curl -H 'X-Site: TGE_LUXURY' http://localhost:4000/api/v1/inquiries | jq '.data[-1]'`.
- **Expected:** new inquiry has `source: "tge-contact"` (or context-specific equivalent) and `sourceUrl` set to the originating page, mirroring what the Contact-page form (`useInquirySubmission`) produces. Reveria's run.md confirms that `source` is the analytics attribution key the API expects.
- **Actual:** the modal posts a body with only `{type, name, email, message, entityName, entitySlug}` — no `source`, no `sourceUrl` (`packages/ui/src/components/inquiry/inquiry-modal.tsx:80-89`). The API stores the row with `source = NULL`. Every inquiry generated through the global modal — which is the **dominant** lead-capture surface across the homepage, header, property detail, developer detail, and CTA banners — is unattributable.
- **Suspected cause:** the modal pre-dates the shared `useInquirySubmission` hook and wasn't migrated. The Contact page form uses the hook (which auto-stamps source via `getBrand().key`), but the modal still calls `mutateApi("/inquiries", ...)` directly.
- **Evidence:** `packages/ui/src/components/inquiry/inquiry-modal.tsx:73-95` (raw `mutateApi` call, no source) vs `packages/hooks/src/use-inquiry-submission.ts:60-70` (stamps `source: ${getBrand().key}-${sourceSuffix}` and `sourceUrl: window.location.href`).
- **Suggested fix:** refactor `InquiryModal` to consume `useInquirySubmission` (passing `type` from `context.type` and an optional `sourceSuffix` per surface). Alternatively, accept `getBrand` as a prop and inline the same stamp logic. After the fix, every inquiry — modal or contact-page — should land with a non-null `source`.
- **Fix applied:** `packages/ui/src/components/inquiry/inquiry-modal.tsx` now imports `useInquirySubmission` from `@tge/hooks`, replaces the local `status`/`errorMessage` state machine with the hook's `{submit, isSubmitting, isSuccess, error, reset}`, and routes the form `onSubmit` through `submit({...payload, type: context.type})`. The hook stamps `source = "${getBrand().key}-contact"` (= `"tge-contact"` on landing) and `sourceUrl = window.location.href`. Verified by `apps/landing/tests/e2e/forms.spec.ts:56` which now asserts `body.source === "tge-contact"` and `body.sourceUrl` matches the originating page URL — passing on the post-fix run.

### BUG-003 — Mobile-nav button hidden in the `lg`–`xl` breakpoint window (1024–1279 px); navigation unreachable — **FIXED 2026-05-09**
- **Severity:** Critical
- **App/Area:** landing layout (header + mobile-nav)
- **Phase:** D-1
- **Environment:** local
- **Steps to reproduce:**
  1. Resize the browser to a width in `[1024, 1279]` px.
  2. Look at the top-right of the header.
- **Expected:** either the desktop mega-menu is visible, or the hamburger trigger is. One of the two should always render.
- **Actual:** desktop nav wrapper renders only at `xl` (`apps/landing/src/components/layout/header.tsx:131` — `hidden xl:grid`). Mobile wrapper renders below `xl` (`header.tsx:185` — `flex xl:hidden`). Inside the mobile wrapper, the `<MobileNav>` `SheetTrigger` button uses `lg:hidden` (`apps/landing/src/components/layout/mobile-nav.tsx:48` — `className="lg:hidden ..."`). Net effect: at `lg` ≤ width < `xl`, the parent renders but the trigger inside hides itself, leaving the user with no nav button at all (just the centered logo). Also affects the bottom-bar CTA spacer.
- **Suspected cause:** copy-paste drift — the breakpoint was originally `lg` and was tightened to `xl` on the parent wrapper without updating the inner button.
- **Evidence:**
  ```
  apps/landing/src/components/layout/header.tsx:131:        <div className="hidden xl:grid grid-cols-[1fr_auto_1fr] ...">
  apps/landing/src/components/layout/header.tsx:185:        <div className="flex xl:hidden items-center justify-between ...">
  apps/landing/src/components/layout/mobile-nav.tsx:48:            className="lg:hidden text-cream hover:text-copper ..."
  ```
- **Suggested fix:** change `mobile-nav.tsx:48` from `lg:hidden` to `xl:hidden`, matching the parent wrapper.
- **Fix applied:** `apps/landing/src/components/layout/mobile-nav.tsx:48` — `lg:hidden` → `xl:hidden`; also added `aria-label="Menu"` so the button is reachable by screen readers and selectable in tests by accessible name.

### BUG-004 — Mobile nav "For Sale" expandable section has no direct "View All Properties" link
- **Severity:** Major
- **App/Area:** landing layout (mobile-nav)
- **Phase:** D-1
- **Steps to reproduce:**
  1. Open landing on mobile (< xl).
  2. Tap hamburger → tap "For Sale".
- **Expected:** users can navigate to `/properties` (the unfiltered listing) directly, mirroring the desktop mega-menu's "View All Properties" link (`header.tsx:228-230`).
- **Actual:** the expanded section lists property types and cities only; no link to the bare listing. Mobile users can only reach `/properties` indirectly by selecting a type filter (which pre-applies `?type=...`) or by way of a deep-link.
- **Suspected cause:** mobile-nav.tsx mirrors the desktop forSale columns partially — it copies type + city links but omits the "Featured Section" column.
- **Evidence:** compare `header.tsx:228-237` (desktop) vs `mobile-nav.tsx:94-123` (mobile).
- **Suggested fix:** add a top-level link to `/properties` either as a new "Properties" entry in the mobile nav, or as a "View All" row inside the For Sale collapse.

### BUG-005 — `cityLabels` in `PropertyFilterPanel` ships ASCII Romanian city names "Timisoara" / "Brasov"
- **Severity:** Major
- **App/Area:** landing (`property-filter-panel.tsx`)
- **Phase:** D-1
- **Steps to reproduce:**
  1. Open `/ro/properties`.
  2. Click the "City" Select.
- **Expected:** dropdown shows "Timișoara" and "Brașov" with proper Romanian diacritics — per the standing diacritics policy from CLAUDE.md memory and seeded data which uses correct forms ("Sătmărel", "Țară", etc.).
- **Actual:** `apps/landing/src/components/property/property-filter-panel.tsx:30-31` hardcodes:
  ```ts
  timisoara: "Timisoara",
  brasov: "Brasov",
  ```
- **Suspected cause:** the labels are hardcoded English-spelling fallbacks rather than translated or sourced from `/cities`.
- **Suggested fix:** either (a) change the literals to "Timișoara" / "Brașov" (still locale-agnostic but correct in Romanian), or — better — (b) drop the static `cityLabels` map and source the dropdown from the same `/cities` API call already used by Header/MobileNav (so labels follow the locale). Note: the same labels surface in `listing-content.tsx:148-152` via `cityLabels[cityValue]` for active-filter chips, so any fix must update both sites.

### BUG-006 — `PropertyFilterPanel` hardcoded city list (5 entries) is far smaller than the seeded property cities; many cities ungated by filter
- **Severity:** Major
- **App/Area:** landing
- **Phase:** D-1
- **Steps to reproduce:**
  1. `curl -s -H 'X-Site: TGE_LUXURY' http://localhost:4000/api/v1/properties?limit=100 | jq -r '.data[].location.city' | sort -u | wc -l` → 24 cities (e.g., "Satu Mare", "Suceava", "Ploiești", "Arad", "Cluj-Napoca", "Brașov" …).
  2. Open `/ro/properties`, expand the "City" Select.
- **Expected:** dropdown shows every city represented in the listing, in the active locale.
- **Actual:** dropdown lists only `cluj-napoca, oradea, timisoara, brasov, sibiu` (`property-filter-panel.tsx:19-25`). Properties in any other city (the majority of seeded data) cannot be filtered by city. Selecting a hardcoded city like `brasov` matches by `citySlug` (good), but `satu-mare`, `suceava`, etc. are unreachable through the UI.
- **Suspected cause:** snapshot of an early curated city list never updated as the data set grew.
- **Suggested fix:** populate the dropdown from `/cities` (already fetched in `[locale]/layout.tsx:57`) — pass it down via props or React Query. As a stop-gap, expand the static list to cover all cities currently in the seed.

### BUG-007 — `PropertyFilterPanel` `propertyTypes` includes `mansion` + `palace` types that don't exist in the schema
- **Severity:** Major
- **App/Area:** landing
- **Phase:** D-1
- **Steps to reproduce:**
  1. Open the type filter dropdown.
  2. Select "Mansion" or "Palace".
- **Expected:** dropdown shows the same property-type taxonomy used elsewhere — `apartment, house, villa, terrain, penthouse, estate, chalet` — and selecting any one returns matching listings.
- **Actual:** `apps/landing/src/components/property/property-filter-panel.tsx:35-45` adds `mansion` + `palace`. The header / mobile-nav lists exclude both (`header.tsx:18-26`, `mobile-nav.tsx:15-23`). The `Common.propertyTypes` translations probably do not include `mansion`/`palace` keys either, so `tTypes("mansion")` will fall back to the key string. Selecting them filters to zero results.
- **Suggested fix:** trim the array to the same 7 types used in header/mobile-nav. If "mansion" / "palace" are aspirational types, add them to the schema first (and to Common.propertyTypes translations across all 4 locales).

### BUG-008 — Properties listing developer filter compares **slugified developer name** to URL slug instead of `developerSlug`
- **Severity:** Major
- **App/Area:** landing (`listing-content.tsx`)
- **Phase:** D-1
- **Steps to reproduce:**
  1. Visit `/ro/properties?developer=verdalis-residence` (or any other slug from `/developers`).
  2. Observe the grid.
- **Expected:** grid filters to properties whose developer matches the URL `developer=` param.
- **Actual:** filter logic at `apps/landing/src/app/[locale]/properties/listing-content.tsx:60-67` compares `developerName?.toLowerCase().replace(/\s+/g, "-") === developer`. This is a poor-man's slugifier — it loses diacritics, hyphens-from-original-slug differences, and any character normalization the API does. For developers whose slug is not a literal whitespace-to-hyphen of the name (e.g. "Atrium Boutique" → slug `atrium-boutique` happens to match, but "Carpathia Imobiliare" with diacritics or capitalization quirks may not), the filter returns empty. The DTO already has `developerSlug` available alongside `developerId`/`developerName`.
- **Suggested fix:** change the comparison to `p.developerSlug === developer`. Verify `Property` (`@tge/types`) exposes `developerSlug`; if not, plumb it through `mapApiProperty`.

### BUG-009 — Footer "Privacy" + "Terms" are static `<span>`s, not links — visually clickable, functionally inert
- **Severity:** Major
- **App/Area:** landing (`footer.tsx`)
- **Phase:** D-1
- **Steps to reproduce:**
  1. Scroll to footer of any landing page.
  2. Hover or click "Privacy" / "Terms".
- **Expected:** navigates to a privacy / terms page (or at least a recognisable href).
- **Actual:** rendered as `<span className="hover:text-copper transition-colors cursor-pointer">{t("privacy")}</span>` (`footer.tsx:130-135`). Hover effect + `cursor-pointer` suggest a link, but no href and no onClick handler — clicks do nothing.
- **Suggested fix:** decide whether `/privacy` and `/terms` pages exist (they don't appear in the route tree). If not, drop the spans or hide them; if planned, scaffold the routes and wire `<Link href="/privacy">` etc.

### BUG-010 — Property detail "Schedule Viewing" submits inquiry as `type: "property"` rather than `type: "viewing"` — semantic loss for triage
- **Severity:** Minor
- **App/Area:** landing (`properties/[slug]/page.tsx`)
- **Phase:** D-1
- **Steps to reproduce:**
  1. Open a property detail page.
  2. Click "Schedule Viewing" → submit the modal.
  3. `curl ...inquiries | jq '.data[-1].type'`.
- **Expected:** `"viewing"` so admin/triage can route differently from generic `"property"` info requests. The `InquiryType` union in `packages/hooks/src/use-inquiry-submission.ts:5-10` explicitly enumerates `"viewing"`.
- **Actual:** at `apps/landing/src/app/[locale]/properties/[slug]/page.tsx:284-294`, the "Schedule Viewing" `<InquiryTrigger>` reuses the same `context={ type: "property", ... }` as the "Request Info" button above it. Both inquiries are indistinguishable to the back-office.
- **Suggested fix:** change the second trigger's context to `{ type: "viewing", entityName, entitySlug }` and verify the global `InquiryModal` writes `type` correctly (already does, see BUG-002).

### BUG-011 — `RootLayout` default description carries ASCII Romanian city names ("Timisoara, Brasov") even though the brand name otherwise uses correct forms
- **Severity:** Minor
- **App/Area:** landing (`app/layout.tsx`)
- **Phase:** D-1
- **Steps to reproduce:**
  1. `view-source:http://localhost:3050/ro` (or `/en`, `/fr`, `/de`).
  2. Inspect `<meta name="description">`.
- **Expected:** city names are spelled with diacritics — "Timișoara", "Brașov" — the standing rule (CLAUDE.md memory) and the form used in seeded data and admin pages.
- **Actual:** `apps/landing/src/app/layout.tsx:12`:
  ```
  "Discover exceptional luxury properties across Romania's most prestigious addresses. Villas, mansions, and estates from €1M+ in Cluj-Napoca, Oradea, Timisoara, Brasov, and Sibiu."
  ```
  Even on `/ro`, this string surfaces (no `generateMetadata` on `[locale]/page.tsx` — see BUG-012).
- **Suggested fix:** change "Timisoara" → "Timișoara" and "Brasov" → "Brașov" in the literal. Even in English copy, Romanian proper nouns retain diacritics in modern usage.

### BUG-012 — Homepage and Transylvania pages have no `generateMetadata` — non-default locales serve the English RootLayout default
- **Severity:** Minor
- **App/Area:** landing (`[locale]/page.tsx`, `[locale]/transylvania/page.tsx`)
- **Phase:** D-1
- **Steps to reproduce:**
  1. Open `/fr`, `/de`, or `/ro`.
  2. Inspect `<title>`.
- **Expected:** locale-specific title (e.g., `Transylvania Grand Estate | Imobile de Lux în România` for `/ro`).
- **Actual:** falls back to RootLayout's default `Transylvania Grand Estate | Luxury Real Estate in Romania` for every locale — no localized title or description. Other routes (`/[locale]/properties`, `/[locale]/contact`, `/[locale]/about`, `/[locale]/cities`, `/[locale]/developers`) do export `generateMetadata`. Only homepage + transylvania are missing.
- **Suggested fix:** add `export async function generateMetadata({ params })` to both pages, reading `HomePage.meta.title|description` (and `TransylvaniaPage.meta.*`) from the namespace. Add the keys to all 4 message files.

### BUG-013 — Footer office location "Cluj-Napoca, Cluj, România" hardcoded in Romanian — surfaces unchanged on `/en`, `/fr`, `/de`
- **Severity:** Minor
- **App/Area:** landing (`footer.tsx`)
- **Phase:** D-1
- **Evidence:** `apps/landing/src/components/layout/footer.tsx:22` (`const MAIN_OFFICE_LOCATION = "Cluj-Napoca, Cluj, România"`) → rendered at line 96 unconditionally.
- **Suggested fix:** move into translations (`Footer.officeLocation`) so each locale can render the localized form. Romanian "România" is correct in `ro`; English page should likely show "Romania".

### BUG-014 — Footer social links use placeholder URLs (`instagram.com/tge`, `facebook.com/tge`, `linkedin.com/company/tge`, `youtube.com/@tge`)
- **Severity:** Minor (verification needed — these may be real handles)
- **App/Area:** landing (`footer.tsx`)
- **Phase:** D-1
- **Evidence:** `apps/landing/src/components/layout/footer.tsx:24-29`. `tge` is a generic three-letter handle and unlikely to belong to Transylvania Grand Estate on every platform.
- **Suggested fix:** confirm the real handles with the brand owner; replace each URL. If the brand has no presence on a given platform, drop that icon.

### BUG-015 — `ContactForm`: message `<Textarea>` lacks `required` despite the API rejecting empty messages with a Zod validation error
- **Severity:** Minor
- **App/Area:** landing (`contact-form.tsx`)
- **Phase:** D-1
- **Steps to reproduce:**
  1. Open `/ro/contact`.
  2. Fill name + email; leave message blank; submit.
- **Expected:** HTML5 reports "Please fill out this field" inline.
- **Actual:** the Textarea has no `required` attribute (`apps/landing/src/components/contact/contact-form.tsx:139-145`). Form posts to the API; the API responds with a Zod error (`message: must be ≥10 characters`); the form surfaces the raw server error in the red strip. Functional, but UX is degraded vs. the inquiry modal which does mark the textarea `required minLength={10}` (`packages/ui/src/components/inquiry/inquiry-modal.tsx:198-206`).
- **Suggested fix:** add `required minLength={10}` to the Textarea, matching the modal.

### BUG-016 — `ContactForm` does not pre-select property when navigated with `?property=<slug>` URL param
- **Severity:** Minor
- **App/Area:** landing (`contact-form.tsx`)
- **Phase:** D-1
- **Steps to reproduce:**
  1. Visit `/ro/contact?property=satmarel-country-estate`.
  2. Inspect the "Property" Select.
- **Expected:** "Property" pre-selects the linked listing — the natural UX for a "Contact about this property" entry-point.
- **Actual:** form ignores URL params; user has to re-pick the property from the long dropdown. The Select state is local-only (`useState("")`).
- **Suspected cause:** the form was authored for the bare contact route and never extended to consume the URL.
- **Suggested fix:** read `useSearchParams().get("property")` on mount and seed `propertySlug`. Optionally also surface a "Pre-filled from listing X" hint above the form.

### BUG-017 — Multiple SSR pages call `fetchApi` (which throws) on parallel data fetches without a guard — single API hiccup on any sub-fetch surfaces as a 500 on the whole page
- **Severity:** Major (per design choice; degrades to error.tsx fallback)
- **App/Area:** landing (homepage, cities listing, developers listing, contact, transylvania)
- **Phase:** D-1
- **Affected files:**
  - `apps/landing/src/app/[locale]/page.tsx:20-25` — 4 parallel fetches (`/properties`, `/cities?featured=true`, `/developers?featured=true`, `/testimonials`).
  - `apps/landing/src/app/[locale]/cities/page.tsx:31-35` — 3 parallel fetches.
  - `apps/landing/src/app/[locale]/developers/page.tsx:23-26` — 2 parallel fetches.
  - `apps/landing/src/app/[locale]/contact/page.tsx:22` — properties fetch (only used to populate a Select; degradation should be empty list).
  - `apps/landing/src/app/[locale]/transylvania/page.tsx:20-25` — 4 parallel fetches.
- **Expected:** non-essential fetches degrade to empty data (use `fetchApiSafe`) so a flaky `/testimonials` doesn't kill the whole homepage. The shared `[locale]/layout.tsx:56-65` already follows this pattern for the nav (try/catch around the joint Promise.all).
- **Actual:** if any one of these endpoints 5xx's or times out, the entire route returns 500 and the user sees the `error.tsx` fallback. The property-detail page (`properties/[slug]/page.tsx:55-68`) does this correctly — try/catch + `notFound()` for primary data, `fetchApiSafe` for the sidebar.
- **Suggested fix:** wrap the `Promise.all` in a try/catch with sensible empty-array defaults, or replace each non-critical fetch with `fetchApiSafe` (`/testimonials`, `/cities?featured=true`, `/developers?featured=true` are all decoration). The contact-page properties fetch should always be `fetchApiSafe` — an empty Select is acceptable; a 500 is not.

### BUG-018 — `PropertiesPage` JSX has a stray `<>` Fragment nested inside `<HydrationBoundary>` (cosmetic but unusual)
- **Severity:** Trivial
- **App/Area:** landing (`properties/page.tsx`)
- **Phase:** D-1
- **Evidence:** `apps/landing/src/app/[locale]/properties/page.tsx:66-116`:
  ```tsx
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
    <>
      ...
    </>
    </HydrationBoundary>
  );
  ```
  Indentation suggests cleanup mid-refactor; the inner Fragment serves no purpose since `HydrationBoundary` accepts an array of children. Renders fine.
- **Suggested fix:** remove the `<>` wrapper and re-indent.

### BUG-019 — Homepage SplashOverlay (`z-[60]`) covers the header on first session visit; mobile users cannot reach the hamburger nav
- **Severity:** Major
- **App/Area:** landing (`splash-overlay.tsx`, `home-hero-with-splash.tsx`)
- **Phase:** D-5
- **Steps to reproduce:**
  1. Open `/ro` in a fresh session (cleared `sessionStorage`).
  2. Resize to a mobile viewport (390×844).
  3. Try to tap the hamburger.
- **Expected:** either the splash declares "click anywhere to enter" (and tapping the hamburger dismisses + opens nav), or the splash leaves the header tappable.
- **Actual:** the splash is `fixed inset-0 z-[60]` (`apps/landing/src/components/layout/splash-overlay.tsx:45`), the header is `z-50` (`header.tsx:85`). The vignette div inside the splash (`splash-overlay.tsx:64` — no z-index) intercepts pointer events across the whole viewport. Until the user finds and taps the central "Enter" CTA, the hamburger and language switcher are unreachable. Discovered via Playwright "vignette-radial subtree intercepts pointer events" failure on `/ro`.
- **Suspected cause:** intentional cinematic intro pattern — but blocking the only nav surface on mobile is a UX trap, especially since the "Enter" button is centered and can be missed.
- **Suggested fix:** options — (a) raise the header above the splash (`z-[70]`) so nav stays reachable, (b) add an `Esc` keyboard handler + click-anywhere dismiss to the splash, or (c) suppress the splash on mobile altogether. The session-storage gating already keeps the splash from being abused on repeat visits; first-touch friction is the issue.

### BUG-020 — Stale X-Site values in `.qa/feature-reveria` artifacts: brand identifier was renamed `REVERIA` → `REVERY`
- **Severity:** Trivial
- **App/Area:** docs / .qa
- **Phase:** D-6
- **Evidence:** the API today rejects `X-Site: REVERIA` with `Invalid X-Site header: "REVERIA". Expected one of: TGE_LUXURY, REVERY, ADMIN, ACADEMY, UNKNOWN`. `.qa/feature-reveria/run.md` (table at L48) still lists `REVERIA`. Confirmed by `packages/branding/src/config.ts:15` (`REVERY`).
- **Suggested fix:** in a future docs sweep, update `.qa/feature-reveria/run.md` to use `REVERY` (or note that the identifier was renamed). Does not change any code — just a stale doc reference.
