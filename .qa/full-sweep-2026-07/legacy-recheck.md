# Legacy Open-Bug Re-verification (Phase 2, 2026-07-17)

Code-verified against current `qa/full-sweep-2026-07` HEAD; empirical checks noted. One row per pre-existing open item.

| # | Legacy id (source) | Item | Verdict | Disposition |
|---|---|---|---|---|
| 1 | BUG-005/006/007 (.qa/feature-landing) | Filter panel hardcoded ASCII cities + phantom types | **PARTIALLY FIXED** — `mansion`/`palace` now legal in `PropertyType` enum (packages/types/src/property.ts:18-19); city list still hardcoded/ASCII, not API-driven | Re-filed **BUG-103** |
| 2 | BUG-008 (.qa/feature-landing) | Developer filter slugifies name instead of `developerSlug` | **FIXED** — no `slugify` in apps/landing; `properties/page.tsx:31-46` uses `params.developer` as slug directly | Stamp source ledger |
| 3 | BUG-009 (.qa/feature-landing) | Footer Privacy/Terms inert `<span>`s | **FIXED** — `footer.tsx:135-152` real `<Link>`s to /privacy, /terms, /cookies | Stamp source ledger |
| 4 | BUG-014 (.qa/feature-landing) | Placeholder social URLs | **STILL PRESENT** — `footer.tsx:26-29` | Re-filed **BUG-104** |
| 5 | BUG-017 (.qa/feature-landing) | SSR whole-page 500 from decorative fetch | **STILL PRESENT (home only)** — `page.tsx:21-26` bare `Promise.all`; properties page migrated to `fetchApiSafe` | Re-filed **BUG-105** |
| 6 | #5 (qa/qa-report.md) | Static `/uploads/` 404 in dev | **FIXED** — `app.module.ts:60-86` ServeStatic wired to the same `resolveUploadsDir` the writer uses | Stamp source ledger; re-confirm end-to-end in Phase 5 uploads check |
| 7 | P3-010 (context/qa-bugs-2026-04-26.md) | `/articles/new` dead link | **FIXED** — `articles/new/page.tsx` exists; Create button `createHref="/articles/new"` live. (Articles remain at legacy `/articles` path; only the hub landing moved to `content/`.) | Stamp source ledger |
| 8 | admin partial (code comment) | Property-form literal EN labels | **STILL PRESENT** — `property-form.tsx:82-108+` | Re-filed **BUG-106** |
| 9 | admin partial (code comment) | Unsaved-changes guard beforeunload-only | **STILL PRESENT** (documented 80/20) | Re-filed **BUG-107** |
| 10 | docs/invitations.md:92 | Invitations AGENT-only | **FIXED** — `POST /invitations/users` (SUPER_ADMIN) invites ADMIN/EDITOR; admin `invite-user-dialog.tsx` wired | Stamp doc; exercise in Phase 3 people-hub pass |
| 11 | inquiries.service.ts:413 TODO | GDPR 90-day hard-purge cron | **STILL PRESENT** — soft-delete only, no purge cron in api src | Re-filed **BUG-108** |
| 12 | BUG-001 (.qa/feature-demo-readiness) | `GET /articles/:slug` returns drafts | **STILL PRESENT & WORSE** — list endpoint leaks too (empirically confirmed with draft probe: list includes it, slug → 200) | Re-filed **BUG-109** (Major, supersedes) |
| 13 | Academy phases 4–6 | Quiz/cert/discussion half-wired UI leakage | **NOT PRESENT** — zero quiz/certificate/discussion refs in academy app or admin academy module | No action; stays in deferred-audit |

**Exit criteria met:** zero legacy items with unknown status. Fixed items to be stamped in their source ledgers during Phase 8 (document-only edits).
