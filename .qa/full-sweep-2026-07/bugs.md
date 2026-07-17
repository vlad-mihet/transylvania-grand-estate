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

## BUG-101 — Lint errors in 4 of 5 apps (CI has no lint gate)
- **Severity:** Minor · **Surface:** api, admin, landing, academy · **Status:** Open
- **Found:** Phase 1 baseline, `pnpm lint:all` (2026-07-17)
- **Repro:** `pnpm lint:all` → Nx fails `api:lint`, `admin:lint`, `landing:lint`, `academy:lint`; revery passes.
- **Detail:** api: 1× `no-require-imports`. admin: ~18 errors — several `setState synchronously within an effect` (react-hooks) + repeated `no-html-link-for-pages` (`<a href="/login/">` instead of `<Link>`) + unused-var warnings in e2e specs. landing: 4 errors (1× setState-in-effect, 1× rules-of-hooks in a non-hook `collector` fn, 2× require-imports). academy: fails lint (error detail to re-capture at fix time).
- **Expected:** `pnpm lint:all` green; add lint job to `ci.yml` (companion ledger item in deferred-audit).
- **Note:** The `setState-in-effect` and `rules-of-hooks` errors are potential real defects, not just style — re-classify severity if any maps to observed misbehavior during the sweep.

## BUG-102 — API e2e harness leaks local `.env` flags → 7 academy tests red on any dev machine
- **Severity:** Major (dev/test infra; product unaffected) · **Surface:** apps/api test harness · **Status:** Open
- **Found:** Phase 1 baseline, `pnpm --filter @tge/api test:e2e` (reproduced twice: 2 suites / 7 tests failed, 179 passed)
- **Root cause (confirmed):** `apps/api/test/global-setup.ts` pins `DATABASE_URL`, `NODE_ENV`, JWT secrets — but not `EMAIL_VERIFICATION_DISABLED`. `ConfigModule.forRoot` (app.module.ts:90) loads `apps/api/.env`, whose documented dev value `EMAIL_VERIFICATION_DISABLED=1` makes academy registration auto-verify (academy-auth.service.ts:592 branch) → no verification email captured → every token-based registration test fails (`mockEmail.captured[0]` undefined, 410-token tests, resend anti-enumeration ×2, happy path, duplicate email, wildcard-enrollment guard).
- **Why CI is green:** CI has no `.env`; the flag is unset there.
- **Failing tests:** academy-registration.e2e-spec.ts (6), academy.e2e-spec.ts (1).
- **Fix direction:** pin `process.env.EMAIL_VERIFICATION_DISABLED = '0'` (and audit the other feature flags: `GOOGLE_AUTH_DISABLED`, `DEV_AUTH_THROTTLE_DISABLED`, `REBS_SYNC_ENABLED`) in `test/global-setup.ts` so local runs match CI.

## BUG-103 — Landing filter panel: hardcoded ASCII city list, not API-driven (re-file of landing BUG-005/006)
- **Severity:** Major · **Surface:** landing · **Status:** Open
- `apps/landing/src/components/property/property-filter-panel.tsx:19-33` hardcodes 5 cities with no diacritics (`"Timisoara"`, `"Brasov"`, `"Cluj-Napoca"`); DB has 46 seeded cities. Filter misses most cities and violates the diacritics rule. The type dropdown is also hardcoded (though `mansion`/`palace` are now legal enum values — that half of the legacy bug is fixed, see legacy-recheck #1).
- **Expected:** cities fetched from `/cities` (X-Site aware), labels with diacritics.

## BUG-104 — Landing footer social URLs are placeholders (re-file of landing BUG-014)
- **Severity:** Minor · **Surface:** landing · **Status:** Open
- `apps/landing/src/components/layout/footer.tsx:26-29`: `instagram.com/tge`, `facebook.com/tge`, `linkedin.com/company/tge`, `youtube.com/@tge` — dead/wrong destinations on the live site.

## BUG-105 — Landing home page SSR: unguarded `Promise.all` of 4 throwing fetches (re-file of landing BUG-017)
- **Severity:** Major (upgrade to Critical if Phase 5 API-down test 500s the homepage) · **Surface:** landing · **Status:** Open
- `apps/landing/src/app/[locale]/page.tsx:21-26`: featured properties/cities/developers/testimonials fetched via bare `Promise.all` of throwing `fetchApi` — one failed decorative fetch rejects the page. `properties/page.tsx` already uses `fetchApiSafe`; home was never migrated.

## BUG-106 — Admin property form: amenity/classification labels literal English (known partial)
- **Severity:** Minor · **Surface:** admin · **Status:** Open
- `apps/admin/src/components/forms/property-form.tsx:82-108+` — hardcoded EN labels with "for now" comment; admin is otherwise fully localized ro/en/fr/de.

## BUG-107 — Admin unsaved-changes guard doesn't cover in-app navigation (known partial)
- **Severity:** Minor · **Surface:** admin · **Status:** Open
- `apps/admin/src/hooks/use-unsaved-changes-warning.ts` covers only `beforeunload` (tab close/reload); App Router `<Link>`/`router.push` navigation silently discards dirty forms.

## BUG-108 — GDPR right-to-erasure hard-purge cron not implemented
- **Severity:** Major (compliance) · **Surface:** api · **Status:** Open
- `apps/api/src/inquiries/inquiries.service.ts:412-415`: delete is soft-only; TODO for 90-day hard-purge cron remains; grep confirms no inquiry purge cron exists (only token purges). Right-to-erasure is not enforced for inquiry PII.

## BUG-109 — Public articles API leaks drafts on BOTH list and slug endpoints (supersedes demo-readiness BUG-001)
- **Severity:** Major · **Surface:** api (landing/revery indirectly) · **Status:** Open
- **Empirically confirmed 2026-07-17:** created draft `qa-sweep-draft-probe` as admin → unauthenticated `GET /articles?limit=50` (X-Site: TGE_LUXURY) **includes it**; `GET /articles/qa-sweep-draft-probe` → **200**. The legacy claim that "the list endpoint filters published" is false — `articles.service.ts:28` only filters when the caller passes `?status=`, and `findBySlug` (`articles.service.ts:52-57`) has no status filter. Public sites happen to request published-only, so pages don't render drafts (verified on revery /ro/blog), but anyone can read unpublished editorial content via the open API.
- **Expected:** public (unauthenticated / non-ADMIN X-Site) callers always get `status=published` forced server-side.
- **Test data note:** probe article left in DB for fix-wave regression testing; remove at Phase 9.

## BUG-110 — Revery contact form: name field wiped on webkit → submit blocked (suite red locally)
- **Severity:** Major (potential real Safari impact — investigate before downgrading) · **Surface:** revery · **Status:** Open
- Phase 1 baseline: `forms.spec.ts:33` failed twice (initial + retry) on webkit only: screenshot shows name input EMPTY with focus ring while email/phone/message remain filled → required-field validation blocks submit → no success heading. Chromium/firefox pass. Not a 429 (all three 429s in the API log were the rate-limit spec's spoofed probes).
- Suspected controlled-input hydration race (early keystrokes wiped when React hydrates). Per house rule, reproduce empirically before dismissing as automation artifact.
- **Also noted:** Next.js dev-overlay badge "1 Issue" visible on the contact page screenshot — check the runtime error during Phase 4.
