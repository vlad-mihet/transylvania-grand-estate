# Verification Sweep 2026-07 — Run Log

Campaign: full-platform end-to-end verification sweep (admin → websites → API → prod).
Successor to `.qa/full-sweep-2026-07/` (PR #37, closed at 8803c14). This sweep is
**verification-oriented**: prove the platform is done empirically — including that the
prior 26 Fixed@/Wontfix stamps hold on a fresh build — fill prior coverage gaps
(EDITOR column, Tier C, never-matrixed modules), then verify production.

Protocol: document-everything-first, then fix waves (Phase 8). File-writing exceptions
during document phases: failing Playwright marker specs for confirmed findings, and
ledger files themselves. No code fixes before wave approval.

Branch: `qa/verify-sweep-2026-07` off main@8803c14. Started 2026-07-17.

## Ledger files
- `bugs.md` — new findings, BUG-201+ (regressions of prior bugs: new ID + `Regression-of:` line)
- `fixed-verify.md` — disposition of all 26 prior Fixed@/Wontfix stamps
- `admin-matrix.md` — delta coverage matrix (prior ⬜/❌ cells + deep-CRUD + never-matrixed)
- `prod-checks.md` — prod verification (read-only vs owner-gated)
- `deferred-refresh.md` — refreshed deferred-work decisions + owner-decision list

## User-approved scope decisions (2026-07-17)
- REBS sync disabled (`REBS_SYNC_ENABLED=0`) for sweep duration; restore at closeout.
- Prod probes approved: QA-PROBE contact submissions, disposable academy registration,
  authenticated read-only prod-admin browse.
- BUG-127 prod reseed: approved in principle, gated — re-confirm immediately before executing.

---

## Phase 0 — Env bring-up + reseed

_(in progress)_
