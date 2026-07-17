# Triage + Fix-Wave Plan (Phase 7, 2026-07-17)

25 new findings (BUG-101…125). Zero Blockers. Severity tally: **3 Critical · 8 Major · 11 Minor · 3 Trivial.**
Every legacy open bug re-verified (`legacy-recheck.md`): 6 fixed, 7 re-filed into the above.

## Wave 1 — Critical (3) · gate: fix → browser re-verify → regression spec → full automation re-run
| BUG | Title | Fix locus | Size |
|---|---|---|---|
| 117 | Audit trail dead for ALL mutations (classify() never matches under `/api/v1` prefix) | `apps/api/src/common/interceptors/audit.interceptor.ts` | S |
| 118 | Users-mgmt page non-functional (admin sends `limit`, `/auth/users` `.strict()` 400s; client swallows) | `packages/types/schemas/auth.ts` + admin users query + error-state | S–M |
| 105 | Public homepages 500 on API blip (landing + revery, home + list) | landing + revery `page.tsx` → `fetchApiSafe` | M |

## Wave 2 — Major (8) · gate: per-bug re-verify + affected-app suite; full baseline at wave end
| BUG | Title | Fix locus | Size |
|---|---|---|---|
| 102 | API e2e leaks local `.env` flags → 7 academy tests red locally | `apps/api/test/global-setup.ts` | S |
| 103 | Landing filter panel hardcoded ASCII city list, not API-driven | `apps/landing/.../property-filter-panel.tsx` | M |
| 108 | GDPR inquiry hard-purge cron missing | `apps/api/src/inquiries/` new `@Cron` | M |
| 109 | Public articles API leaks drafts (list + slug) | `apps/api/src/articles/articles.service.ts` | S |
| 110 | Revery contact form name wiped on webkit → submit blocked | revery contact form (hydration) | M |
| 115 | Property slug "Generează" no-ops without EN title + strips diacritics | `apps/admin/.../property-form.tsx:383` | S |
| 116 | Property save blocked by empty year-built (raw NaN) | property form numeric preprocess | S |
| 125 | No cookie consent banner (compliance) | shared consent component, 3 sites | M |

## Wave 3 — Minor + Trivial (14) + finish-now deferred
Grouped by theme for efficient fixing:
- **i18n keys/labels:** 106 (property EN labels), 111 (dashboard RO mislabel), 114 (`Common.relations` missing), 122 (`inquiries.typeLabel.viewing`), 120 (invite email agent copy).
- **Admin polish:** 107 (unsaved-nav guard), 112 (sheet badge), 113 (filter placeholder), 119 (logins widget filter), 121 (unread badge limit=1).
- **Landing/misc:** 104 (social URLs — needs real handles), 101 (lint 4 apps), 123 (revery dev axe crash), 124 (academy no landing — product decision, confirm first).
- **Finish-now deferred (from `deferred-audit.md`):** CC-BY hero + Wikimedia city attribution.

## Not fixed here (owner/reconcile, not code bugs)
- REBS prod-flag reconciliation (⚠ running locally).
- Contact-flow prod secrets/DNS/Resend/legal sign-off.
- Keep-deferred: licensed city images, academy phases 4–6, TGE logo, revery fr/de translation.

## Ledger frozen at 25 findings. Post-triage discoveries → `## Post-triage` section in bugs.md.
