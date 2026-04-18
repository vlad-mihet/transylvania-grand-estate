# QA runbook — TGE / Reveria monorepo

A re-runnable record of the exploratory QA performed on 2026-04-17 against the `feature/reveria` branch. Use this to reproduce the same coverage against any future revision, or to smoke-check a staging deploy.

**Companion files:**
- `scripts/qa-smoke.sh` — automated runner for every API-level and page-smoke check described below. Exit 0 = all real assertions passed (known-bug WARNs are allowed). See `scripts/qa-smoke.sh --help`.
- `docs/qa-report-2026-04-17.md` — the bug report from the first run. Numbered issues (Blocker #1, Critical #3, etc.) in this runbook cross-reference that report.

---

## Goal

Surface regressions fast. Priority surfaces (chosen 2026-04-17): admin CRUD + auth, API contracts + brand isolation, landing public flows, Reveria public flows. Deliverable: a prioritized bug report with repro + fix pointers.

---

## Prerequisites

- **Docker** with the `tge-postgres-1` container running (or set `QA_PG_CONTAINER`). Note Postgres is on **:5435** in this project, not the README's :5432.
- **Node.js** (used for JSON parsing and binary file generation; every machine with `pnpm` already has it).
- **curl** on `PATH`.
- **pnpm** workspace installed (`pnpm install` from repo root).
- `@tge/types` built once: `pnpm --filter @tge/types build`.

### Starting the stack

```bash
docker compose up -d                          # Postgres on :5435
pnpm --filter @tge/types build                # required for @tge/api
cd apps/api && npx prisma generate && npx prisma migrate dev && npx prisma db seed && cd ../..

# In four separate terminals (or backgrounded):
pnpm --filter @tge/api dev         # :3333  — API
pnpm --filter @tge/admin dev       # :3001  — admin
pnpm --filter @tge/landing dev     # :3000  — landing (TGE luxury)
pnpm --filter @tge/reveria dev     # :3002  — Reveria
```

All four must be up before the suite runs. `qa-smoke.sh` aborts on preflight if API is unreachable.

### Admin credentials

The seed generates a random admin password unless `SEED_ADMIN_PASSWORD` is set. `qa-smoke.sh` bypasses this by doing a direct `UPDATE admin_users SET password_hash=...` with a pre-computed bcrypt for `QaTest123!`. To use your own password, export:

```bash
export QA_ADMIN_PASSWORD='your-password'
export QA_RESET_PASSWORD=0       # skip the UPDATE
```

---

## Running the automated suite

```bash
bash scripts/qa-smoke.sh                 # everything (~45s)
bash scripts/qa-smoke.sh --only api      # B.1–B.10, skip page smoke
bash scripts/qa-smoke.sh --only pages    # C–F only
bash scripts/qa-smoke.sh --no-uploads    # skip file-upload tests
bash scripts/qa-smoke.sh --verbose       # dump failing bodies
```

**Output legend:**

- `✓ green` — assertion passed.
- `✗ red` — assertion failed (regression or something you should investigate).
- `! yellow` — a **known bug** from the 2026-04-17 report surfaced again. The script annotates each with the bug number so you can confirm it's still-broken rather than re-broken. Once a bug is fixed, the assertion should flip to `✓` automatically.
- `− dim` — skipped (missing dependency or CLI flag).

`exit 0` on all green; `exit 1` on any `✗`. `!` warnings do **not** fail the suite — they're the baseline until the bugs are fixed.

---

## Coverage — what the suite actually checks

The script is grouped by phase. Each phase can be run in isolation by editing the orchestrator at the bottom. For manual re-testing, every check below is a copy-pasteable curl.

### Phase A — Preflight (automated)

- `docker ps` confirms Postgres container is up.
- `curl` each of API / admin / landing / Reveria — all must return 2xx/3xx.
- Admin password reset via `docker exec ... psql`.
- `POST /auth/login` yields an access + refresh token pair.

### Phase B.1 — Brand isolation

The core invariant. `SiteMiddleware` resolves tier scope server-side; the client cannot widen it.

```bash
curl -s "$API/properties?limit=100" -H "X-Site: REVERIA"    | jq '.data | group_by(.tier) | map({tier: .[0].tier, count: length})'
curl -s "$API/properties?limit=100" -H "X-Site: TGE_LUXURY" | jq '.data | group_by(.tier) | map({tier: .[0].tier, count: length})'
curl -s "$API/properties?limit=100" -H "X-Site: ADMIN"      | jq '.data | group_by(.tier) | map({tier: .[0].tier, count: length})'
curl -s "$API/properties?limit=100" -H "X-Site: UNKNOWN"    | jq '.data | length'   # → 0
curl -s "$API/properties?limit=100"                         | jq '.data | length'   # → 0  (missing X-Site)
curl -s "$API/properties?limit=100" -H "X-Site: HAX0R"      | jq '.data | length'   # → 0
```

**Design decision — unknown `X-Site` silent fallback (2026-04-18, won't-fix):** an unrecognized `X-Site` header (e.g. `HAX0R`, `FOO`) resolves to site `UNKNOWN` which scopes queries to zero rows. This is intentional — an unknown brand cannot be allowed to widen scope, and silently returning an empty result set is a safer failure mode than leaking data. For dev debuggability the response carries `X-Site-Resolved: UNKNOWN`, so clients can detect the condition without the server having to 400. Tracked as Minor #12 in `docs/qa-report-2026-04-17.md`; closed as-designed in `qa/qa-report.md` (2026-04-18).

### Phase B.2 — Tampering

Attacker tries to widen tier scope via query params; API must ignore.

```bash
curl -s "$API/properties?tier=luxury" -H "X-Site: REVERIA"          | jq '.data | map(.tier) | unique'   # ["affordable"]
curl -s "$API/properties?maxPrice=50000000" -H "X-Site: REVERIA"    | jq '.data | map(.price) | max'    # < 1,000,000
curl -s "$API/properties?tier=%27%3BDROP" -H "X-Site: REVERIA"      # 400 ValidationError
```

### Phase B.3 — Auth + RBAC

```bash
curl -i -X POST "$API/properties" -H "Content-Type: application/json" -H "X-Site: ADMIN" -d '{}'           # 401
curl -i      "$API/auth/me"       -H "Authorization: Bearer garbage" -H "X-Site: ADMIN"                      # 401
curl -i      "$API/auth/me"       -H "Authorization: Bearer $TOKEN"  -H "X-Site: ADMIN"                      # 200
curl -X POST "$API/auth/login"    -H "Content-Type: application/json" -H "X-Site: ADMIN" \
                                  -d '{"email":"admin@tge.ro","password":"bad-but-long-enough"}'              # 401 "Invalid credentials"
curl -X POST "$API/auth/login"    -H "Content-Type: application/json" -H "X-Site: ADMIN" \
                                  -d '{"email":"admin@tge.ro","password":"x"}'                                # 400 Zod error (Minor #9)
curl -X POST "$API/auth/refresh"  -H "Content-Type: application/json" -d "{\"refreshToken\":\"$REFRESH\"}"    # 200 new access token
curl -X POST "$API/auth/refresh"  -H "Content-Type: application/json" -d '{"refreshToken":"garbage"}'         # 401
```

### Phase B.4 — Zod validation error shape

Empty/bad body must return `400 ValidationError` with `error.fields[]` each containing `{ path, message, code }`. Admin's `useApiFormErrors` hook depends on this shape; changing it breaks every form.

```bash
curl -s -X POST "$API/properties" -H "Content-Type: application/json" -H "X-Site: ADMIN" -H "Authorization: Bearer $TOKEN" -d '{}' \
  | jq '.error | {statusCode, error, fields: (.fields[:3])}'
```

### Phase B.5 — Rate limiting

`@Throttle({ default: { ttl: 60_000, limit: N } })`:

| Endpoint | limit/min |
|---|---|
| POST /auth/login | 5 |
| POST /auth/refresh | 10 |
| POST /inquiries | 5 |
| (global, any IP) | 60 |

Verify by hammering in a loop and confirming the nth response is 429. The automated suite does this LAST so it doesn't poison later tests.

### Phase B.6 — Prisma error mapping

```bash
# Create
curl -X POST "$API/properties" ... -d '{"slug":"qa-prisma-test",...}'   # 201
# Duplicate slug
curl -X POST "$API/properties" ... -d '{"slug":"qa-prisma-test",...}'   # 409 "already exists"
# Non-existent UUID PATCH
curl -X PATCH "$API/properties/00000000-0000-0000-0000-000000000000" ... # 404 RecordNotFound
# Non-UUID DELETE — KNOWN Minor #11 (returns 404 instead of 400)
curl -X DELETE "$API/properties/not-a-uuid" ...                          # 404 (expect 400)
```

### Phase B.7 — Property filters

Every numeric range filter + amenity boolean + geo filter. See `properties.service.ts:34-226` for the complete list.

```bash
curl "$API/properties?minPrice=2000000"         -H "X-Site: TGE_LUXURY"  # all prices ≥ 2M
curl "$API/properties?maxPrice=500000"          -H "X-Site: TGE_LUXURY"  # all prices ≤ 500k
curl "$API/properties?bedrooms=3"               -H "X-Site: TGE_LUXURY"  # all beds === 3
curl "$API/properties?bedrooms=6"               -H "X-Site: TGE_LUXURY"  # 6+ bucket (≥6)
curl "$API/properties?maxBedrooms=5"            -H "X-Site: TGE_LUXURY"  # Major #7 — silently ignored
curl "$API/properties?featured=true"            -H "X-Site: TGE_LUXURY"  # all featured
curl "$API/properties?swLat=45&swLng=25&neLat=46&neLng=26"               # bbox
curl "$API/properties?lat=45.5&lng=25.5&radius=50"                       # radius km
curl "$API/properties/map-pins"                 -H "X-Site: REVERIA"     # lightweight pin data
```

### Phase B.8 — File uploads

Field name is endpoint-specific (`photo` for agents, `logo` for developers, `image` for cities, `files[]` for properties multi-upload). Fixtures: tiny valid JPEG (150 bytes), 6MB padded JPEG, minimal SVG. Script generates them via Node so Windows path mapping works.

```bash
# All against POST /agents/:id/photo with field name "photo"
curl -F "photo=@tiny.jpg;type=image/jpeg"           -> 200       # valid
curl -F "photo=@test.svg;type=image/svg+xml"        -> 400       # SVG rejected by MIME filter
curl -F "photo=@too-big.jpg;type=image/jpeg"        -> 413       # >5MB
curl -F "photo=@test.svg;type=image/jpeg"           -> 201 ← BUG # Critical #3 (accepts SVG with lied MIME)
curl http://localhost:3333/uploads/                 -> 404 ← BUG # Major #5 (static serving broken in dev)
```

### Phase B.9 — CORS + Swagger + /health

```bash
# Preflight from allowed origin → returns Access-Control-Allow-Origin
curl -i -X OPTIONS "$API/properties" -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: GET"
# Preflight from disallowed origin → NO allow-origin header
curl -i -X OPTIONS "$API/properties" -H "Origin: http://evil.com"       -H "Access-Control-Request-Method: GET"
# Swagger
curl -i "http://localhost:3333/api/docs"                    # 200
curl "http://localhost:3333/api/docs-json" | jq '.paths | length'   # > 30
# Health — KNOWN Major #8 (missing endpoint)
curl -i "$API/health"                                       # 404
```

### Phase B.10 — Inquiry source persistence (Critical #4)

```bash
curl -X POST "$API/inquiries" -H "X-Site: REVERIA" \
  -d '{"name":"T","email":"t@t.t","phone":"+40","message":"Probe","source":"qa-reveria-contact"}'
# → 201, returned body has no .data.source field
# → admin GET /inquiries/:id also lacks .data.source → CONFIRMED Critical #4
```

### Phase C — Admin app (smoke)

Browser checks, mostly. The suite covers the HTTP-level behavior (page loads, middleware redirects).

```bash
curl -I "$ADMIN/en/login"                                   # 200
curl -I --max-redirs 0 "$ADMIN/en/dashboard"                # 307 to /en/login
curl -I --max-redirs 0 "$ADMIN/en/properties"               # 307 to /en/login
```

**Not automated (do in a browser):**
- Log in as `admin@tge.ro / QaTest123!`.
- Each CRUD module: Properties, Developers, Agents, Cities, Testimonials, Bank Rates, Site Config.
  - List view renders on desktop (1440px) and mobile (375px).
  - Inline featured/active toggles persist and invalidate the list query.
  - Create flow: required-field Zod errors appear inline (via `useApiFormErrors`).
  - Edit flow: form preloads correctly; PATCH persists.
  - Delete flow: confirmation dialog; list refetches.
  - Image upload (separate sidecar POST): watch for the toast.warning on failure; the entity still saves. **⚠ Blocker #1** — if you save a property without uploading any images, landing `/properties` 500s.
- Property form specifics:
  - Terrain type hides bedrooms/bathrooms/floors/yearBuilt.
  - Slug auto-gens from title.
  - yearBuilt ≥ 1800 enforced for non-terrain.
  - Flat lat/lng form fields transform to nested `coordinates: { lat, lng }`.
  - Async developer/agent dropdowns load.
  - ImageGalleryManager reorder / alt / hero toggle.
- Settings: bilingual fields (en/ro/fr/de), dynamic socialLinks `useFieldArray`, BNR manual sync button.
- i18n: EN ↔ RO switch on every page; Romanian diacritics (`ă â î ș ț`) must render correctly.

### Phase D — Landing (smoke)

Automated HTTP 200 checks on `/en`, `/en/properties`, `/en/cities`, `/en/developers`, `/en/about`, `/en/contact`, `/en/transylvania`.

**Automated 404 checks** — must return HTTP 404 (landing does this correctly):
- `/en/properties/does-not-exist-zzz`
- `/en/cities/does-not-exist-zzz`
- `/en/developers/does-not-exist-zzz`
- `/en/properties/{affordable-slug}` — cross-tier lookup

**Not automated:**
- Filter UX (search, city, type, price bucket).
- Inquiry form flow — submit with bad email → inline Zod error; good email → success card; 5 submits/min → rate-limited UX.
- Similar properties sidebar.
- Responsive.

### Phase E — Reveria (smoke)

Automated HTTP 200 checks on home, properties (list + map view), cities, developers, agents, blog, faq, about, contact, plus all four `/ro/instrumente/*` calculators.

**Automated 404 checks** — **KNOWN Blocker #2**: all return 200 instead of 404 until the `error.tsx` fix lands.

**Not automated:**
- Map view `?view=map` renders pin cluster; clicking a pin opens popup.
- Filter bar (price, bedrooms 1–6+, area, amenities, etc.) URL-syncs and debounces refetch.
- Property detail tier guard: visiting a TGE_LUXURY slug under Reveria must show a not-found page (content-wise it does; status-wise Blocker #2).
- Inline inquiry form submit UX.
- i18n + Romanian diacritics + `"Cabană"` override for `chalet` type labels.
- Responsive.
- Calculator edge cases: zero inputs, negatives, huge numbers.

### Phase F — Cross-app integration

**Automated:**
- Pick one luxury slug + one affordable slug via the API.
- Landing with affordable slug → 404. Reveria with luxury slug → 404 (currently 200 per Blocker #2).
- Landing with luxury slug → 200. Reveria with affordable slug → 200.

**Not automated:**
- Admin creates a luxury property → visible on landing, invisible on Reveria.
- Admin creates an affordable property → visible on Reveria, invisible on landing.
- Edit reflects on both (after React Query cache window).
- Delete disappears on both.
- Submit inquiry on landing → appears in admin `/inquiries` list; status PATCH flows.
- Inquiry source survives the roundtrip (currently doesn't — Critical #4).

---

## Re-running after a fix

1. Check out the fix branch.
2. `docker compose up -d` (if not already up).
3. `pnpm install` (if dependencies changed).
4. Restart the dev servers that were affected by the change.
5. `bash scripts/qa-smoke.sh`.
6. Each `!` warn that corresponds to a bug you fixed should flip to `✓`. Any new `✗` is a regression — investigate before merging.

### Extending the suite

- New API endpoint? Add a curl+assertion in the matching `b*()` function in `scripts/qa-smoke.sh`.
- New page route? Add it to the `page_smoke` loop plus a `not_found_status` entry if it's dynamic.
- New invariant (e.g., "testimonial tier scope")? Add a new `bN_*` function and call it from `run_api`.
- Always prefer `warn` over `fail` when asserting against a known bug — that way the suite only fires `✗` on *new* regressions.

---

## Known bugs tracked by this suite

These stay as `!` warnings until fixed. See `docs/qa-report-2026-04-17.md` for full context.

| # | Severity | Warn string | Fix area |
|---|---|---|---|
| 1 | Blocker | "→ 500 (KNOWN Blocker #1, landing PropertyCard crashes on image-less property)" | `apps/landing/src/components/property/property-card.tsx:20-27` |
| 2 | Blocker | "→ 200 (expected 404 — KNOWN Blocker #2, Reveria [locale]/error.tsx intercepts notFound)" | `apps/reveria/src/app/[locale]/error.tsx` |
| 3 | Critical | "SVG with lied MIME accepted ... KNOWN Critical #3" | `apps/api/src/common/config/upload.config.ts` |
| 4 | Critical | "Inquiry.source dropped on persist (KNOWN Critical #4)" | `apps/api/prisma/schema.prisma` + `inquiries.service.ts` |
| 5 | Major | "Static uploads 404 (KNOWN Major #5 — rootPath wrong)" | `apps/api/src/app.module.ts:34-38` |
| 7 | Major | "maxBedrooms=5 silently discarded (KNOWN Major #7)" | `packages/types/src/schemas/property.ts` |
| 8 | Major | "/health returns 404 (KNOWN Major #8)" | new `HealthController` in api |
| 9 | Minor | "Short password leaks min-length via Zod (KNOWN Minor #9)" | `packages/types/src/schemas/auth.ts` |
| 11 | Minor | "DELETE non-UUID → 404 (KNOWN Minor #11)" | `apps/api/src/properties/properties.controller.ts` |

---

## Re-run findings (2026-04-17, second pass) — NEW

The rerun of this suite surfaced two additional issues that weren't in the initial report:

### 🛑 Blocker #14 (new) — admin `proxy.ts` has wrong export name for Next 16

- **App:** admin.
- **Where:** `apps/admin/src/proxy.ts` — exports `export function middleware(req)` but Next.js 16 requires the export to be named `proxy` (or a default export). Landing and Reveria both use `export default createMiddleware(routing)` and work.
- **Symptom:** every admin request returns HTTP 500 with runtime error: `The file "./src\proxy.ts" must export a function, either as a default export or as a named "proxy" export.`
- **Hot-reload caveat:** admin `/en/login` returned 200 at the very first hit in this session (before Next.js discovered `proxy.ts`). Once Next warmed up, every subsequent request 500s. This explains why the original report didn't catch it.
- **Fix:** rename the export — `export function proxy(req)` — or change to `export default` (and remove the `middleware.ts` file, since both existing triggers the precedence weirdness).
- The automated suite detects this explicitly in `page_smoke()` and warns rather than fails.

### 🛑 Blocker #15 (new) — reveria `/en/blog` returns 500

- **App:** reveria — only `/en/blog` (and likely `/ro/blog`). Other Reveria pages are fine.
- **Where:** `apps/reveria/src/app/[locale]/blog/page.tsx` or a descendant. The API endpoint `GET /articles?status=published&limit=24` returns 200 with 8 seeded articles (all `category=guide` or `market-report`, both of which have i18n translations), so the root cause is client-side — likely a null-field dereference in `ArticleCard` or a missing i18n key somewhere. Needs a server-log inspection to pinpoint.
- **Intermittent behavior:** during the first run of the suite earlier in the session, `/en/blog` returned 200. Dev mode / turbopack may have cold-vs-warm state divergence here.
- **Fix:** start the reveria dev server, open `/en/blog`, grab the runtime error from the terminal/browser, fix the specific throw.

Both new bugs also need entries in the severity-ranked report once they're investigated. The suite currently fails on Blocker #15 (`✗ reveria /en/blog → 500`) and warns on Blocker #14 — adjust when fixed.
