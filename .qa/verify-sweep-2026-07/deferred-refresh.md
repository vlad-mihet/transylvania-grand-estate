# Deferred-Items Refresh — verify-sweep-2026-07 (Phase 6)

Base: `.qa/full-sweep-2026-07/deferred-audit.md`. Re-verified 2026-07-17 — all deferrals still correctly deferred, no leakage/drift.

| Item | Prior state | This sweep check | Result |
|---|---|---|---|
| Licensed city images Phase 2 (`docs/city-hero-images-phase2.md`) | external-blocked (owner purchases) | doc present, 24 pending/placeholder refs; no new unlicensed additions | ⏳ unchanged — still deferred |
| Academy phases 4–6 (quizzes/certs/discussions) | designed, not built | grep for quiz/certificate/discussion/forum UI in `apps/academy/src` → **0 hits** | ✅ clean deferral, no half-wired leakage |
| TGE logo lockups | ready, not wired (client decision) | `header.tsx` still renders text "Grand Estate" wordmark; floating-diamond anchor unchanged; no osim-mark img | ✅ text wordmark intact |
| Revery fr/de human translation | deferred (translator) | Phase 4 fr/de routes 200, no raw key leaks; copy-quality drift persists | ⏳ unchanged — translator task |
| REBS CRM sync go-live (`docs/rebs-sync-go-live.md`) | owner-reconcile (key/flags) | schema default = `https://demo.crmrebs.com/api/public` (BUG-126 holds); sync flag disabled for sweep; local `.env` still carries live key via explicit `REBS_BASE_URL` | ⏳ owner decision (rotate/scope key, flip prod flags) |
| Contact-flow prod checklist (`docs/contact-flow-prod-checklist.md`) | owner tasks | 3 open owner rows remain (Fly secrets / DNS / Resend domain / legal review) | ⏳ owner tasks |
| BUG-127 prod reseed (seed diacritics) | open, owner-gated | local half done (Phase 0 diacritics PASS); prod pending — gated at Phase 7 | ⏳ Phase 7 gate |

## Owner-decision list (final version → PR body)
1. **BUG-127 prod reseed** — bump tge-api VM to 1GB, run seed detached, verify diacritics, restore memory. User pre-approved, gated re-confirm at Phase 7.
2. **REBS CRM prod intent** — local `.env` carries a live production REBS key with sync historically enabled; decide whether to rotate/scope the key and whether to flip prod sync flags on. Schema default is safely the demo tenant.
3. **Contact-flow go-live** — Fly secrets, DNS, Resend domain verification, legal review of `/privacy` remain owner tasks before public contact email delivery works in prod.
4. **Licensed city images Phase 2** — ~9 buy-stock + ~24 free-final slots pending owner purchases; copyright-gray stopgaps still live.
5. **Revery fr/de translation** — human translator pass for fr/de copy (ro/en are primary).
6. **Product decisions surfaced by this sweep** (see bugs.md): EDITOR access to inquiries (BUG-208) and audit trail (BUG-209) — grant or hide; year-built required-by-design blocks land-plot listings (BUG-206).
