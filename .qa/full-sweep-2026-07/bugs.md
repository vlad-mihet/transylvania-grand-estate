# Full Platform Sweep — Bug Ledger (2026-07)

Severity rubric (house convention):
- **Blocker** — breaks a core flow with no workaround, or violates a platform invariant (brand isolation, auth).
- **Critical** — major flow broken or data integrity/security issue with narrow workaround.
- **Major** — feature works but with significant functional/UX defect.
- **Minor** — cosmetic, edge-case, or low-impact defect.
- **Trivial** — nit; polish.

New findings are numbered **BUG-101+** (no collision with legacy ledgers: landing BUG-001..020, reveria BUG-001..004, demo-readiness BUG-001, qa-report #N, context P3-0xx).
Status values: `Open | Fixed@<sha> | Wontfix | Deferred`.

---

## Post-triage findings (discovered during Wave work)

### BUG-128 — Property `/new` form reports `isDirty === true` on load (over-eager unsaved-changes guard)
- **Severity:** Minor · **Surface:** admin · **Status:** Fixed@69a49ff
- The property create form's `form.formState.isDirty` is true immediately on mount, before any edit — so the unsaved-changes guard (both the old `beforeunload` and the new BUG-107 in-app interceptor) prompts even when the user typed nothing and clicks away. Discovered writing the BUG-107 regression test. Pre-existing (affected `beforeunload` too); BUG-107 just makes it more visible since in-app nav is common. Likely a `defaultValues` ↔ registered-value mismatch or a `setValue(..., { shouldDirty: true })` on mount. Fix: align the form's initial values so a pristine create form is not dirty.
- **Fix:** aligned `useForm` `defaultValues` with what each registered input holds on a pristine form (`yearBuilt: 0`, `garage/landArea/developerId/agentId: null`, `latitude/longitude: undefined`). Root cause was RHF's `isDirty` deep-compare treating a *present* key holding `undefined` as different from an *absent* key — verified live via a temporary `window.__diff` probe (`getValues()` JSON-equalled defaults yet `isDirty` stayed true until every registered key was seeded). Re-enabled the "clean form navigates without a prompt" e2e case; 4/4 unsaved-changes specs green.

### BUG-127 — Seed data: some luxury property `city` values lack diacritics / use EN name
- **Severity:** Minor (data quality) · **Surface:** packages/data seed · **Status:** Open
- With BUG-103 fixed, the landing city filter now reflects real API city names — surfacing that a few seeded `property.city` values are ASCII/English: "Brasov" (→ Brașov), "Timisoara" (→ Timișoara), "Bucharest" (→ București) appear alongside correctly-accented ones (Bistrița, Iași, Sighișoara, Târgu Mureș). Violates the diacritics rule ([[feedback_diacritics]]). Fix in `packages/data` seed + reseed. Note: cities feeding via `citySlug`→City table are fine; this is the denormalized `property.city` string.

### BUG-126 — `REBS_BASE_URL` schema default points at the PRODUCTION REBS instance (footgun)
- **Severity:** Major (ops/data-safety) · **Surface:** api config · **Status:** Fixed@53ffb7d
- `apps/api/src/common/config/env.schema.ts:122-126`: `REBS_BASE_URL` defaults to **`https://client-396fe343.crmrebs.com/api/public`** (the real client/production instance) when unset — but the comment above it and `apps/api/.env.example` both advertise the **demo** instance `https://demo.crmrebs.com/api/public`. Anyone who sets `REBS_API_KEY` + `REBS_SYNC_ENABLED=1` without also setting `REBS_BASE_URL` (as the local `.env` does) silently pulls **live production customer listings + media into their dev DB**. Verified live: the local hourly cron created `sibiu-apartament-de-vanzare-in-sibiu-3207425` (real listing, 4 CRM-mirrored images from `*.crmrebs.com`) — published + visible on local Revery.
- Sync is read-only against REBS (GET-only, no write-back) and writes only to the local DB, so **no production system is at risk** — but the default-hits-prod mismatch is a real defect.
- **Fix direction:** change the default to the demo instance (or drop the default so the URL must be set explicitly). **Deferred to owner sign-off** — touching REBS config was explicitly out of scope for this sweep without approval.
- **Fix (owner-approved):** `env.schema.ts` default is now `https://demo.crmrebs.com/api/public`. Per the owner's chosen option the local sync keeps its current live source — an explicit `REBS_BASE_URL=https://client-396fe343.crmrebs.com/api/public` was added to the gitignored `apps/api/.env` (never committed). Production/any live-tenant run must now set the URL explicitly; an unset var can only ever reach the demo instance.

### OPS FLAG (not a code bug) — real production REBS key in local `apps/api/.env`
- The local `.env` holds a **working production REBS API key** (`0d57…`). It is **gitignored and never committed** (verified: `git check-ignore` matches `.env*`, `git ls-files`/`git log` empty), so it is not leaked into history — but it is a live prod credential in local plaintext driving an hourly pull from production REBS. **For the owner to decide:** rotate/scope the key, or set `REBS_SYNC_ENABLED=0` / `REBS_BASE_URL=demo` locally. No action taken by the sweep.

---

## BUG-101 — Lint errors in 4 of 5 apps (CI has no lint gate)
- **Severity:** Minor · **Surface:** api, admin, landing, academy · **Status:** Fixed@11a8b89
- **Fix:** all 5 apps now `pnpm lint:all` green; added a `lint` CI job. **Notable discovery:** academy's eslint config was silently broken (FlatCompat circular-ref → exit 2, never actually linted), which had been hiding **5 real errors** — migrated it to flat config and fixed them. setState-in-effect cases converted to render-time "storing prior props" or lazy initializers where the trigger is a prop change; scoped disables (justified) only for genuine mount-only client patterns (hash parse, `useIsClient`, Playwright `use` fixture). Verified: admin 41, academy 13, landing forms/interactive/i18n 18, api academy 36 — all green.
- **Found:** Phase 1 baseline, `pnpm lint:all` (2026-07-17)
- **Repro:** `pnpm lint:all` → Nx fails `api:lint`, `admin:lint`, `landing:lint`, `academy:lint`; revery passes.
- **Detail:** api: 1× `no-require-imports`. admin: ~18 errors — several `setState synchronously within an effect` (react-hooks) + repeated `no-html-link-for-pages` (`<a href="/login/">` instead of `<Link>`) + unused-var warnings in e2e specs. landing: 4 errors (1× setState-in-effect, 1× rules-of-hooks in a non-hook `collector` fn, 2× require-imports). academy: fails lint (error detail to re-capture at fix time).
- **Expected:** `pnpm lint:all` green; add lint job to `ci.yml` (companion ledger item in deferred-audit).
- **Note:** The `setState-in-effect` and `rules-of-hooks` errors are potential real defects, not just style — re-classify severity if any maps to observed misbehavior during the sweep.

## BUG-102 — API e2e harness leaks local `.env` flags → 7 academy tests red on any dev machine
- **Severity:** Major (dev/test infra; product unaffected) · **Surface:** apps/api test harness · **Status:** Fixed@cdbdfd1
- **Found:** Phase 1 baseline, `pnpm --filter @tge/api test:e2e` (reproduced twice: 2 suites / 7 tests failed, 179 passed)
- **Root cause (confirmed):** `apps/api/test/global-setup.ts` pins `DATABASE_URL`, `NODE_ENV`, JWT secrets — but not `EMAIL_VERIFICATION_DISABLED`. `ConfigModule.forRoot` (app.module.ts:90) loads `apps/api/.env`, whose documented dev value `EMAIL_VERIFICATION_DISABLED=1` makes academy registration auto-verify (academy-auth.service.ts:592 branch) → no verification email captured → every token-based registration test fails (`mockEmail.captured[0]` undefined, 410-token tests, resend anti-enumeration ×2, happy path, duplicate email, wildcard-enrollment guard).
- **Why CI is green:** CI has no `.env`; the flag is unset there.
- **Failing tests:** academy-registration.e2e-spec.ts (6), academy.e2e-spec.ts (1).
- **Fix direction:** pin `process.env.EMAIL_VERIFICATION_DISABLED = '0'` (and audit the other feature flags: `GOOGLE_AUTH_DISABLED`, `DEV_AUTH_THROTTLE_DISABLED`, `REBS_SYNC_ENABLED`) in `test/global-setup.ts` so local runs match CI.

## BUG-103 — Landing filter panel: hardcoded ASCII city list, not API-driven (re-file of landing BUG-005/006)
- **Severity:** Major · **Surface:** landing · **Status:** Fixed@83e69b1
- `apps/landing/src/components/property/property-filter-panel.tsx:19-33` hardcodes 5 cities with no diacritics (`"Timisoara"`, `"Brasov"`, `"Cluj-Napoca"`); DB has 46 seeded cities. Filter misses most cities and violates the diacritics rule. The type dropdown is also hardcoded (though `mansion`/`palace` are now legal enum values — that half of the legacy bug is fixed, see legacy-recheck #1).
- **Expected:** cities fetched from `/cities` (X-Site aware), labels with diacritics.

## BUG-104 — Landing footer social URLs are placeholders (re-file of landing BUG-014)
- **Severity:** Minor · **Surface:** landing · **Status:** Fixed@53ffb7d
- `apps/landing/src/components/layout/footer.tsx:26-29`: `instagram.com/tge`, `facebook.com/tge`, `linkedin.com/company/tge`, `youtube.com/@tge` — dead/wrong destinations on the live site.
- **Fix (owner decision — hide until real handles exist):** the placeholder URLs are commented out and `socialLinks` is now empty; the "Follow us" column renders only when the list is non-empty, so nothing broken is shown. Re-enabling is uncommenting a real profile URL. **Revery had the same pattern** (`/revery` handles) — fixed identically in the same batch (`apps/revery/src/components/layout/footer.tsx`, refactored to a `socialIcons` map + render guard). Academy has no footer/social row, so nothing to hide there.

## BUG-105 — Public homepages 500 when the API hiccups (SSR fetch not guarded) — landing AND revery (re-file of landing BUG-017)
- **Severity:** Critical (upgraded — Phase 5 confirmed) · **Surface:** landing + revery · **Status:** Fixed@a6e3065
- `apps/landing/src/app/[locale]/page.tsx:21-26`: featured properties/cities/developers/testimonials fetched via bare `Promise.all` of throwing `fetchApi` — one failed decorative fetch rejects the page. `properties/page.tsx` already uses `fetchApiSafe`; home was never migrated.
- **Phase 5 empirical (API stopped):** `/ro` (landing) → **500**, `/ro/properties` (landing) → **500**, `/ro` (revery) → **500**, `/ro/properties` (revery) → **500**. Only academy `/ro/login` (static) survived (200). Pages show a graceful Next error boundary, but the **HTTP status is 500** — a transient API blip takes both public homepages fully down (SEO/uptime-monitor/user impact). Home pages should degrade to **200 with empty featured sections**; data pages should show a "couldn't load" state, not 500.
- **Fix direction:** wrap every decorative SSR fetch in `fetchApiSafe` (already exists, used on landing properties breadcrumb) across landing + revery home and list pages; reserve hard failure for the genuinely required primary fetch only.

## BUG-106 — Admin property form: amenity/classification labels literal English (known partial)
- **Severity:** Minor · **Surface:** admin · **Status:** Fixed@d0f8361
- `apps/admin/src/components/forms/property-form.tsx:82-108+` — hardcoded EN labels with "for now" comment; admin is otherwise fully localized ro/en/fr/de.

## BUG-107 — Admin unsaved-changes guard doesn't cover in-app navigation (known partial)
- **Severity:** Minor · **Surface:** admin · **Status:** Fixed@37fe5dc
- `apps/admin/src/hooks/use-unsaved-changes-warning.ts` covers only `beforeunload` (tab close/reload); App Router `<Link>`/`router.push` navigation silently discards dirty forms.

## BUG-108 — GDPR right-to-erasure hard-purge cron not implemented
- **Severity:** Major (compliance) · **Surface:** api · **Status:** Fixed@cdbdfd1
- `apps/api/src/inquiries/inquiries.service.ts:412-415`: delete is soft-only; TODO for 90-day hard-purge cron remains; grep confirms no inquiry purge cron exists (only token purges). Right-to-erasure is not enforced for inquiry PII.

## BUG-109 — Public articles API leaks drafts on BOTH list and slug endpoints (supersedes demo-readiness BUG-001)
- **Severity:** Major · **Surface:** api (landing/revery indirectly) · **Status:** Fixed@cdbdfd1
- **Empirically confirmed 2026-07-17:** created draft `qa-sweep-draft-probe` as admin → unauthenticated `GET /articles?limit=50` (X-Site: TGE_LUXURY) **includes it**; `GET /articles/qa-sweep-draft-probe` → **200**. The legacy claim that "the list endpoint filters published" is false — `articles.service.ts:28` only filters when the caller passes `?status=`, and `findBySlug` (`articles.service.ts:52-57`) has no status filter. Public sites happen to request published-only, so pages don't render drafts (verified on revery /ro/blog), but anyone can read unpublished editorial content via the open API.
- **Expected:** public (unauthenticated / non-ADMIN X-Site) callers always get `status=published` forced server-side.
- **Test data note:** probe article left in DB for fix-wave regression testing; remove at Phase 9.

## BUG-110 — Revery contact form: name field wiped on webkit → submit blocked (suite red locally)
- **Severity:** Major (potential real Safari impact — investigate before downgrading) · **Surface:** revery · **Status:** Fixed@7756c29
- Phase 1 baseline: `forms.spec.ts:33` failed twice (initial + retry) on webkit only: screenshot shows name input EMPTY with focus ring while email/phone/message remain filled → required-field validation blocks submit → no success heading. Chromium/firefox pass. Not a 429 (all three 429s in the API log were the rate-limit spec's spoofed probes).
- Suspected controlled-input hydration race (early keystrokes wiped when React hydrates). Per house rule, reproduce empirically before dismissing as automation artifact.
- **Also noted:** Next.js dev-overlay badge "1 Issue" visible on the contact page screenshot — check the runtime error during Phase 4.
- **Root cause (confirmed):** the name/email/phone/message inputs were controlled via `useState`; keystrokes landing before React hydrated on WebKit never reached state and were reconciled back to `""` on the first later state update. Landing's contact form is immune because its text inputs are uncontrolled (read via `new FormData(e.currentTarget)` on submit).
- **Fix:** converted revery's text inputs to uncontrolled with `name=` attributes, reading values from `FormData` on submit (mirrors landing). Only `budget` (a Select chosen post-hydration) + `consent` stay stateful. Verified: `forms.spec.ts` 12/12 green across all 3 browsers, including the previously-red webkit `valid submit reaches success state`.

## BUG-111 — Dashboard attention card mislabels cross-entity EN-translation count as "Articole" (RO only)
- **Severity:** Minor · **Surface:** admin · **Status:** Fixed@7e9e905
- Dashboard shows "ARTICOLE NETRADUSE (EN) 20" while the DB holds only 9 articles. `missingEnTotal` (API `/admin/dashboard/attention`, computed in `admin-content.service.ts` across ALL content types) is bound at `attention-strip.tsx:134-137` to the label `messages/ro.json:299` `"missingEn": "Articole netraduse (EN)"`. en/fr/de labels are correctly generic ("Missing English" etc.) — only the default RO locale claims they're articles.
- **Expected:** RO label like "Conținut netradus (EN)".

## BUG-114 — Property form: missing i18n key `Common.relations` — raw key rendered + console error spam
- **Severity:** Minor · **Surface:** admin · **Status:** Fixed@7e9e905
- Property new/edit metadata rail renders section header as literal "COMMON.RELATIONS"; console logs 8× `IntlError: MISSING_MESSAGE: Could not resolve 'Common.relations' in messages for locale 'ro'` per page view (component `PropertyMetadataFields`). Check all 4 locale files for the missing key.
- This is the source of the admin dev-overlay "1 Issue" badge.

## BUG-115 — Property form: "Generează" slug button silently no-ops unless the EN title is filled
- **Severity:** Major · **Surface:** admin · **Status:** Fixed@cdbdfd1
- `apps/admin/src/components/forms/property-form.tsx:383-392` — `generateSlug()` reads `form.getValues("title.en")` only. Admins working RO-first (default locale) click Generează and get an empty slug with zero feedback; the save then fails slug validation. Repro: new property → fill RO title → click Generează → slug stays empty (verified in DOM).
- **Expected:** derive from the active-locale title (fallback order en→ro), and transliterate diacritics (current regex deletes them: "București"→"bucureti").

## BUG-117 — Audit trail is dead for ALL resource mutations: classify() never matches under the global prefix
- **Severity:** Critical (compliance/integrity feature silently non-functional) · **Surface:** api (admin UI affected) · **Status:** Fixed@a6e3065
- **Empirical:** after a property POST (201) + PATCH (200) via admin, `audit_logs` gained zero rows; the entire table contains only `user.login-password`/`user.logout` (from explicit `record()` calls in auth services). Admin "Jurnal audit" page with its 12 resource filters shows "Nimic de afișat" for every resource; dashboard audit-health widget reports 0 failures because the writes are never attempted.
- **Root cause:** `AuditInterceptor.classify()` (`src/common/interceptors/audit.interceptor.ts:298+`) segments `req.url` and dispatches on the first segment — but `main.ts:37` sets `app.setGlobalPrefix('api/v1')`, so every URL is `/api/v1/...` and `head` is always `"api"` → `classify()` returns null → no audit for any POST/PATCH/DELETE. The `@AuditAction` decorator escape hatch is used by zero routes. The URL-allowlist path has therefore never worked in production.
- **Fix direction:** strip the global prefix before classifying (or match on `req.route.path`), add an e2e that mutates a property and asserts an `audit_logs` row (the existing audit e2e only covers auth events).

## BUG-118 — Team/users management page is non-functional: admin sends `limit` that `/auth/users` strict schema rejects, 400 rendered as empty state
- **Severity:** Critical (users cannot be viewed/managed in the UI at all) · **Surface:** admin + api contract · **Status:** Fixed@a6e3065
- **Empirical:** `/ro/people/team` renders "Nimic de afișat încă" with 3 admin_users in DB; People-hub ECHIPĂ KPI shows 0. `curl GET /auth/users?limit=500` (SUPER_ADMIN) → **400 `Unrecognized key: "limit"`** — `listUsersSchema` (`packages/types/src/schemas/auth.ts:88-94`, `.strict()`) accepts only role/status/search, while the admin team page requests `limit=500`.
- **Compound defect:** the client swallows the 400 and shows the friendly empty state + invite CTA — a SUPER_ADMIN has no signal anything failed. Query errors must surface as error states, not empty lists.
- **Note:** never covered by the admin Playwright suite (no team spec) — one of the predicted never-tested modules.

## BUG-119 — People hub "Autentificări recente" queries a non-existent audit action — permanently empty
- **Severity:** Minor · **Surface:** admin · **Status:** Fixed@a45b945
- Hub widget calls `GET /audit-logs?action=auth.login` (0 rows, verified) but login rows are recorded as `user.login-password` (5 rows returned for the correct filter). Widget shows "Nicio autentificare recentă" forever.

## BUG-120 — Platform-user invitation email reuses the agent template ("ca agent imobiliar")
- **Severity:** Minor · **Surface:** api (email templates) · **Status:** Fixed@e20481d
- `POST /invitations/users` (EDITOR invite) sends: "Admin User te-a invitat să te alături TGE **ca agent imobiliar**…" — wrong for ADMIN/EDITOR invitees. Role-appropriate copy needed for the users variant.
- Side note: dev email transport logs to console with the accept URL (works as designed); `email_sent_at` set, 1 attempt, no bounce.

## BUG-121 — Sidebar "Cereri" unread badge always shows 1 — counts items of a limit=1 query
- **Severity:** Minor · **Surface:** admin · **Status:** Fixed@a45b945
- Badge showed "1" for SUPER_ADMIN with 26 new inquiries and "1" for AGENT with 2 new. The badge's data call is `GET /inquiries?status=new&limit=1` (`use-unread-inquiries.ts`) — the UI evidently renders the returned item count instead of the pagination total.
- **Expected:** render `meta.total` (badge "26"), or a 9+ cap style.

## BUG-122 — My-inquiries TIP column renders raw i18n key for viewing-type inquiries
- **Severity:** Minor · **Surface:** admin · **Status:** Fixed@7e9e905
- AGENT `/ro/my-inquiries`: property-type row shows "PROPRIETATE" but viewing-type shows literal "INQUIRIES.TYPELABEL.VIEWING". Missing `inquiries.typeLabel.viewing` key (check `valuation` and all 4 locales; check the admin /inquiries list too). Dev overlay logs 2 IntlErrors on the page.

## BUG-123 — Revery dev a11y checker (@axe-core/react) throws on init — broken in dev, prod unaffected
- **Severity:** Trivial (dev-only) · **Surface:** revery · **Status:** Open
- Every Revery page in dev logs `TypeError: Cannot set property createElement of [object Module] which has only a getter` at `reactAxe`/`AxeInitializer.useEffect`. `AxeInitializer` is correctly gated to `NODE_ENV==="development"` (`layout.tsx:74`, dead-code-eliminated in prod) — so no production impact, but the dev a11y tooling never runs (regression vs its intent). Likely an ESM interop issue with the current `@axe-core/react` + React 19. Source of the Revery dev-overlay "1 Issue".

## BUG-124 — Academy has no anonymous landing/catalog: root `/ro` bounces straight to login (product decision to confirm)
- **Severity:** Minor (product decision) · **Surface:** academy · **Status:** Wontfix (by design — owner-confirmed 2026-07-17)
- `apps/academy/src/proxy.ts:15-24` `PUBLIC_PATHS` = only the 8 auth pages. Home `/`, `/catalog`, `/courses/*`, `/tools/raport-piata` all 307→`/login?returnTo=…` when unauthenticated (verified). So visiting `tge-academy.fly.dev` shows a login screen, not a landing page or course preview, while the register page markets "Deblochează toate cursurile … gratuit."
- **Assessment:** for an internal agent-training academy this is defensible (course `visibility=public` means open-enrollment, not anonymous-visible). But (a) no landing page at the root and (b) can't preview the catalog before registering are conversion/UX gaps. **Confirm intent** — if a public catalog/landing is wanted, add `/`, `/catalog`, `/courses/*` (read-only) to `PUBLIC_PATHS`.
- **Full loop otherwise verified PASS:** register → auto-verify (EMAIL_VERIFICATION_DISABLED) → login → open public lesson → **auto-enrolled** into course + lesson-progress row created. All correct.
- **Resolution (owner decision):** keep the academy login-gated. It is an internal agent-training platform, not a public marketing surface — an anonymous catalog/landing is explicitly not wanted. The new academy smoke/auth e2e specs lock the auth-gate contract in CI (unauthenticated root → 307 `/login`), so a regression that accidentally exposes it would fail the suite. No code change.

## BUG-125 — No cookie consent banner on any public site (GDPR/ePrivacy gap)
- **Severity:** Major (compliance) · **Surface:** landing + revery + academy · **Status:** Wontfix (not legally required — evidence-based, 2026-07-17)
- Verified: no consent banner markup on any public site — only a footer "Politica de cookie-uri" **link**. `docs/contact-flow-prod-checklist.md:96` explicitly logs "cookie banner not implemented (out of scope)." EU/RO ePrivacy requires prior consent for non-essential cookies; a linked policy alone is insufficient if any analytics/marketing cookies are set.
- **Finish-now candidate** — legal/compliance, and a shared consent component covers all three sites. Confirm what non-essential cookies are actually set before scoping (if truly first-party-essential-only, this drops to a documentation note).
- **Cookie inventory (verified in source + on the wire):** the only cookies any public site sets are **strictly necessary** — `NEXT_LOCALE` (next-intl locale persistence) and, post-login, first-party auth/session cookies (`academy_refresh` on academy; admin/BFF session on the authenticated surfaces). **Zero** analytics, marketing, or third-party tracking cookies; no Google Analytics / Meta Pixel / tag-manager / embedded-media scripts in any of the three apps (grepped for gtag/GA/fbq/hotjar/segment/mixpanel — none). Under ePrivacy, strictly-necessary cookies are **exempt from the prior-consent requirement**, so a banner is not legally required; the linked cookie policy is sufficient.
- **Resolution:** closed as not-required by analysis. **Revisit if analytics/marketing are ever added** — the moment a non-essential cookie is introduced, a consent banner (and this bug) come back into scope. Documented in `deferred-audit.md` and against `docs/contact-flow-prod-checklist.md:96`.

## BUG-116 — Property form: empty "Anul construcției" blocks save with raw NaN error
- **Severity:** Major · **Surface:** admin · **Status:** Fixed@cdbdfd1
- New-property save with year-built left empty fails client validation: "Invalid input: expected number, received NaN" under the field; the save is blocked until a year is typed. Optional numeric fields must preprocess empty→undefined (`z.coerce`/preprocess) — check the same pattern on Locuri garaj / Suprafață teren / Lat/Long (those accepted empty, so the yearBuilt schema entry is the outlier).
- Also part of the literal-EN pattern: raw Zod copy + "Please fix N fields…" toast + "Failed to fetch" toast are all untranslated English in the RO admin (fold into BUG-106 umbrella).

## BUG-112 — Inquiry peek sheet: status badge doesn't update after auto-mark-read
- **Severity:** Trivial · **Surface:** admin · **Status:** Fixed@967b936
- Opening an inquiry auto-marks it read (toast + row badge update to CITIT) but the sheet's own header badge keeps showing NOU until reopened.

## BUG-113 — Inquiry source filter placeholder suggests a tag that matches nothing
- **Severity:** Trivial · **Surface:** admin · **Status:** Fixed@a45b945
- Placeholder says `ex. revery-contact` but real submissions stamp `reveria-contact` (Revery app) / `tge-*` (landing). An admin typing the suggested example gets zero results. Align placeholder with the actual source vocabulary.
