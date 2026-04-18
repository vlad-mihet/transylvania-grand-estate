# API — Findings

_Severity: Blocker / Critical / Major / Minor / Trivial_

All P0 API invariants hold. 90 assertions from `scripts/qa-smoke.sh` pass. Only one known issue remains carrying over from 2026-04-17.

## Blocker
_none_

## Critical
_none_

## Major

### [Major] Static `/uploads/` serving returns 404 (KNOWN — Major #5 from 2026-04-17 report)
**Where:** `apps/api/src/app.module.ts:34-38`
**Repro:** `curl -i http://localhost:3333/uploads/` → 404 with `ENOENT ... dist\apps\uploads\index.html`.
**Expected:** 200 (or 403) — `ServeStaticModule` should map to `apps/api/uploads/`.
**Actual:** `rootPath: join(__dirname, '..', '..', 'uploads')` resolves to `apps/api/dist/apps/uploads/` which doesn't exist in dev (nest compiles to `dist/apps/api/` on some toolchains — path depth is wrong).
**Notes:** Admin-uploaded property images are written to `apps/api/uploads/` correctly but are not servable in dev. Production may or may not be affected depending on the deployed layout.
**Status vs 2026-04-17:** unchanged — not fixed in this branch.

## Minor

### [Minor] Unknown `X-Site` values silently fall back to UNKNOWN (KNOWN — #12, as-designed)
**Where:** `apps/api/src/common/site/site.middleware.ts:39-42`
**Behaviour:** `X-Site: HAX0R` → middleware logs a dev-mode warn, resolves site to UNKNOWN, returns 0 rows.
**Observation:** The response does set `X-Site-Resolved: UNKNOWN` (useful for dev), so this is observable. Team explicitly flagged this as "won't fix" in 2026-04-17 report.

## Trivial

### [Trivial] Inverted port comment in `main.ts`
**Where:** `apps/api/src/main.ts:22`
**Expected:** Comment reads `admin:3001, landing:3000, reveria:3002`.
**Actual:** Reads `admin:3000, landing:3001, reveria:3002`. Actual dev ports (per each app's `package.json > scripts.dev`): `landing` = 3000 (default), `admin` = 3001 (explicit `--port`), `reveria` = 3002 (explicit `--port`). The CORS fallback values on the same lines use the correct ports — only the written labels are swapped.
**Impact:** Doc rot — will mislead future devs.

## Passed

- All 10 sub-phases of `scripts/qa-smoke.sh` (B.1–B.10, C, D, E, F.1, F.2) pass: 90 assertions, 2 warnings (Major #5 above + a transient admin-token refresh cleanup).
- Brand tier isolation is correctly server-enforced. Confirmed:
  - `X-Site: TGE_LUXURY` → 24 luxury only.
  - `X-Site: REVERIA` → 15 affordable only.
  - `X-Site: ADMIN` → 39 both tiers.
  - `X-Site: REVERIA + ?tier=luxury` client tampering still returns only affordable.
  - Origin-based resolution works for dev origins (localhost:3000/3001/3002).
  - Unknown origins resolve to `UNKNOWN` and return 0 rows.
- Auth/RBAC: bad creds → 401, bogus token → 401, valid token → 200, refresh works, unauth mutations → 401.
- Zod validation shape stable: `{ fields: [{ path, message, code }] }` — admin's `useApiFormErrors` hook depends on this.
- Rate limiting: 5/min on `/auth/login`, 5/min on `/inquiries`, 10/min on `/auth/refresh`. All fire 429 after burst.
- Prisma errors: duplicate slug → 409, PATCH non-existent UUID → 404, DELETE non-UUID → 400 (ParseUUIDPipe).
- File uploads: MIME filter rejects SVG (even when MIME is lied as `image/jpeg`), 6MB payload → 413.
- CORS: preflight from `localhost:3000` → `Access-Control-Allow-Origin`; preflight from `evil.com` → no allow header.
- Swagger: `/api/docs` renders; `/api/docs-json` has 49 paths.
- Health: `GET /api/v1/health` → 200 (previously Major #8, now fixed).
- Inquiry source roundtrip: `source` field persists and is returned (previously Critical #4, now fixed).
