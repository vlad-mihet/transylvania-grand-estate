# Phase 5 — API + Cross-Cutting Invariants (2026-07-17)

Live-stack checks beyond what the 22 Jest e2e specs assert in-process.

## Brand isolation (X-Site middleware) — ✅ PASS
| Probe | Expect | Got |
|---|---|---|
| luxury slug + `X-Site: TGE_LUXURY` | 200 | 200 |
| luxury slug + `X-Site: REVERY` | 404 | 404 |
| affordable slug + `X-Site: REVERY` | 200 | 200 |
| affordable slug + `X-Site: TGE_LUXURY` | 404 | 404 |
| luxury slug + no X-Site header | 404 (safe default) | 404 |
| luxury slug + bogus `X-Site: HACKERBRAND` | 400 (rejected) | 400 |

Core platform invariant holds on the running stack (matches `site.middleware.ts` + qa-smoke F.2). No cross-brand leakage.

## Realm isolation (admin vs academy JWT) — ✅ PASS
| Probe | Expect | Got |
|---|---|---|
| academy token → admin `/auth/users` | 401/403 | 401 |
| academy token → admin `/audit-logs` | 401/403 | 401 |
| admin token → `/academy/account` | reject | 404 (not accepted) |
| garbage bearer → `/auth/users` | 401 | 401 |

## Uploads lifecycle (qa-report #5 re-verify) — ✅ FIXED
- `STORAGE_TYPE=local`; `apps/api/uploads/properties/` holds real jpgs.
- `GET /uploads/properties/<real>.jpg` → **200 image/jpeg** (18827 bytes); missing → **404**.
- Admin `_next/image` proxy of `/uploads/...` → 200 (seen in Phase 3).
- qa-report #5 (static /uploads 404) is fixed; ServeStatic writer/reader dir in lock-step.

## API-down failure mode (BUG-105 / legacy BUG-017) — ❌ FAIL → BUG-105 upgraded to Critical
- API stopped, then: landing `/ro` **500**, landing `/ro/properties` **500**, revery `/ro` **500**, revery `/ro/properties` **500**; academy `/ro/login` 200 (static).
- Graceful Next error page but HTTP 500. Home pages must degrade to 200. See BUG-105.

## Draft exposure (BUG-109) — confirmed in Phase 2 (empirical), not re-run here.

## Not re-tested (covered by Jest e2e in-process, per anti-duplication rule)
tier-scope projections, refresh-token single-use rotation, permission-page guards, editor catalog read-only, catalog draft leak (properties), invitation lifecycle/soft-bounce/concurrent-accept, password-reset single-use.
