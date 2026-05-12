# QA Execution Log — Pre-Demo Admin Readiness

End-to-end gate before live demo. Hybrid approach: this manual checklist covers visual / polish / cross-app propagation; the Playwright suite at `apps/admin/tests/e2e/` covers the binary did-it-write/read-back paths.

## Environment
- **Branch:** feat/contact-flow-prod-readiness (or whatever the demo branch is)
- **Date started:** 2026-05-10
- **Scope:** demo-critical only — TGE listings, Reveria listings, courses, lessons, articles, agents, inquiries
- **Out of scope:** Bank Rates, Testimonials, Developers, Cities, Brand Visibility, Users management, Audit Logs, AGENT-role parallel pass, staging
- **OS:** Windows 11 Enterprise (PowerShell + bash)

## Services (local dev)
| Service | URL | Start command |
|---|---|---|
| API (NestJS)    | http://localhost:4000/api/v1 | `pnpm dev:api` |
| Admin (Next.js) | http://localhost:3051        | `pnpm dev:admin` |
| Landing         | http://localhost:3050        | `pnpm dev` |
| Revery          | http://localhost:3052        | `pnpm nx dev revery` |
| Academy         | http://localhost:3053        | `pnpm dev:academy` |
| Postgres        | docker `tge-postgres-1` :5435 | (already running per dev convention) |

If the Playwright suite trips the global 60 req/min throttle, restart API with `DEV_AUTH_THROTTLE_DISABLED=1` (existing escape hatch in `apps/api/src/app.module.ts`).

---

## Phase 0 — Pre-flight

### 0.1 Env files
Each app needs `.env.local` (gitignored). Examples shipped at `apps/<app>/.env.example`. Minimum:

```
# apps/admin/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
API_URL=http://localhost:4000/api/v1

# apps/landing/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1

# apps/revery/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1

# apps/academy/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

API env (`apps/api/.env`) needs the standard local-dev block (DATABASE_URL, JWT secrets, etc.).

### 0.2 Database reset + seed
Wipes property tables, reseeds with the canonical demo data + admin/editor/agent fixture users:

```powershell
$env:SEED_RESET="true"
$env:SEED_FORCE_FIXTURES="true"
$env:SEED_ADMIN_PASSWORD="demo-pass-123"
pnpm --filter @tge/api exec prisma db seed
```

Bash equivalent:
```bash
SEED_RESET=true SEED_FORCE_FIXTURES=true SEED_ADMIN_PASSWORD=demo-pass-123 \
  pnpm --filter @tge/api exec prisma db seed
```

### 0.3 Login credentials (after seed)
| Role | Email | Password |
|---|---|---|
| Super-Admin | `admin@transylvaniagrandestate.ro` | `$SEED_ADMIN_PASSWORD` |
| Editor | `editor@transylvaniagrandestate.ro` | (printed once on seed if not pinned) |
| Agent | `agent@transylvaniagrandestate.ro` | (printed once on seed if not pinned) |

Tip: pin all three by setting `SEED_ADMIN_PASSWORD`, `SEED_EDITOR_PASSWORD`, `SEED_AGENT_PASSWORD` if the seed supports them — otherwise scroll the seed output for the random ones.

### 0.4 Health-check URLs (open after `pnpm dev:*` per app)
- API: `curl http://localhost:4000/api/v1/properties?limit=1 -H 'X-Site: TGE_LUXURY'` → JSON envelope with at least one property
- Admin: http://localhost:3051/ → redirects to `/ro/login`
- Landing: http://localhost:3050/ro → renders home, no error markers
- Revery: http://localhost:3052/ro → renders home
- Academy: http://localhost:3053/ro → renders home

### 0.5 Playwright suite (smoke first, then manual)
With all 5 dev servers running and DB freshly seeded:
```powershell
$env:SEED_ADMIN_PASSWORD="demo-pass-123"
pnpm --filter @tge/admin test:e2e
```
Expect 6 specs green. Any red spec is a Critical bug — fix before continuing manual phase.

---

## Phase 1 — Manual checklist (per domain)

Walk these in order. Each box is a click. Log issues into `bugs.md` with severity.

### Domain A: Properties — TGE Luxury tier

- **Admin URL:** http://localhost:3051/ro/properties
- **Pre-state:** seed creates ~24 luxury properties

#### Create
- [ ] Click "New property" → form opens at `/ro/properties/new`
- [ ] Fill: title (ro + en), price (>1M EUR for luxury), city (pick from seeded list), tier=luxury, status=available
- [ ] Upload a hero image (any landscape JPG; `apps/landing/tests/e2e/screenshots/` has reusable ones)
- [ ] Submit → toast "Property created", redirect to detail page
- [ ] Detail page shows the uploaded hero, all fields, agent picker
- [ ] **Verify on Landing:** http://localhost:3050/ro/properties → new property visible in grid (refresh after up to 60s for SSR cache)
- [ ] Open detail on landing: hero image renders, price formatted, agent sidebar populated
- [ ] **Brand isolation:** http://localhost:3052/ro/properties → property must NOT appear on Revery

#### Edit
- [ ] Open admin detail → Edit
- [ ] Change `title.ro` and `price`; save → toast "Updated"
- [ ] Verify on landing detail page (refresh after 60s) → both fields updated
- [ ] Switch admin to `en` (locale switcher), set `title.en` to a distinct value, save
- [ ] Open `http://localhost:3050/en/properties/<slug>` → English title rendered

#### Status transitions
- [ ] PATCH status to `reserved` → admin badge updates
- [ ] PATCH status to `sold` → admin badge updates
- [ ] Verify on landing: `?status=available` filter excludes the sold property

#### Delete
- [ ] Bulk-select the test property → Delete → confirm dialog → "Deleted" toast
- [ ] Landing list refreshes (60s) → property gone

**Known gotchas:**
- 60s passive revalidation — patient refresh, not a bug if it shows up after one minute
- Image pipeline writes to `apps/api/uploads/` locally; if the consumer detail shows a broken image, check the image URL transform in `packages/api-client`
- Brand tier is server-enforced via `X-Site` middleware (`apps/api/src/common/site/site.middleware.ts`); a luxury property *cannot* leak to Revery

---

### Domain B: Properties — Reveria affordable tier

- **Admin URL:** http://localhost:3051/ro/properties (same surface — tier picker decides destination)
- **Pre-state:** seed creates affordable Reveria properties

#### Create
- [ ] New property, tier=affordable, price <1M EUR, fill all fields, hero image, save
- [ ] **Verify on Revery:** http://localhost:3052/ro/properties → visible (60s)
- [ ] **Brand isolation:** http://localhost:3050/ro/properties → must NOT appear on Landing
- [ ] Reveria detail page renders cleanly (hero, price, agent, gallery)

#### Edit + status + delete
- [ ] Same flow as Domain A but verify on Revery instead of Landing
- [ ] Switch tier from `affordable` → `luxury` and back (if UI allows). Verify the property migrates between Landing and Revery (60s wait each)

**Known gotchas:**
- Reveria filter UI is at `apps/revery/src/components/property/property-filter-bar.tsx` (currently modified per git status — confirm filter still works)

---

### Domain C: Agents

- **Admin URL:** http://localhost:3051/ro/agents

#### Create direct
- [ ] New agent, name + email + phone, upload photo, status=active, save → toast
- [ ] **Verify on Landing:** http://localhost:3050/ro/agents → visible (60s)
- [ ] **Verify on Revery:** http://localhost:3052/ro/agents → also visible (agents are cross-brand)
- [ ] Open agent detail on landing → photo + bio + property list

#### Invite flow
- [ ] /ro/agents/invite → enter email → submit → "Invitation sent" toast
- [ ] Resend invite from agent detail → "Resent" toast (no error if no SMTP — mock email service should log it)
- [ ] In dev with no SMTP, find the invite URL in the API console output

#### Active toggle
- [ ] Set agent to inactive → admin badge updates
- [ ] Verify on landing: `?active=true` is the default consumer filter → inactive agent disappears from `/agents` list (60s)
- [ ] Re-activate → reappears

#### Delete
- [ ] Delete the test agent → consumer disappears (60s)
- [ ] If the agent was assigned to a property, confirm the property's agent sidebar gracefully handles the missing FK

---

### Domain D: Articles

- **Admin URL:** http://localhost:3051/ro/articles
- **Pre-state:** some seeded articles in mixed draft/published states

#### Create draft
- [ ] New article, title (ro + en), excerpt, body (markdown), category, cover image, status=draft, save
- [ ] Article appears in admin list with `draft` badge
- [ ] **Not visible on Revery:** http://localhost:3052/ro/blog → draft must NOT appear

#### Publish
- [ ] Open admin detail → set status=published, save → publishedAt timestamp set
- [ ] **Verify on Revery:** http://localhost:3052/ro/blog → article appears (60s)
- [ ] Open `/ro/blog/<slug>` → cover renders, body renders, author byline
- [ ] Switch to `/en/blog/<slug>` → English title renders if `title.en` set; otherwise fallback (verify whatever the design intent is)

#### Edit + unpublish
- [ ] Edit body → save → consumer reflects (60s)
- [ ] Set status back to `draft` → consumer list excludes it (60s); direct slug URL should 404 or 401
- [ ] Bulk-select 2 drafts → bulk-publish → both appear on Revery

#### Delete
- [ ] Delete article → gone from admin and from Revery (60s)

**Known gotchas:**
- Articles are Revery-only; Landing has no `/blog` surface
- Romanian text must use diacritics (ă, â, î, ș, ț); Memory: `feedback_diacritics.md`

---

### Domain E: Academy — Courses

- **Admin URL:** http://localhost:3051/ro/academy/courses

#### Create draft course
- [ ] New course, title (ro + en), description, status=draft, save → redirect to detail
- [ ] Upload cover image
- [ ] Detail page shows lessons table (empty) + stats panel

#### Add lessons
- [ ] Add lesson 1: title, content (text type), save → appears in lessons table
- [ ] Add lesson 2 (video type with a YouTube URL)
- [ ] Add lesson 3 (text)
- [ ] Reorder via drag-and-drop → table reflects new order; refresh page → order persists

#### Publish course
- [ ] Set course status=published → toast
- [ ] **Verify on Academy:** http://localhost:3053/ro/catalog → course visible
- [ ] Open detail `/ro/courses/<slug>` → lessons listed in correct order

#### Preview unpublished lesson
- [ ] Set course back to draft (or add a 4th draft lesson)
- [ ] On lesson edit page → "Generate Preview Token" button → copy preview URL
- [ ] Open `http://localhost:3053/ro/preview/<lessonId>?previewToken=<token>` in a fresh incognito window → lesson renders

#### Edit + duplicate
- [ ] Edit course title, save → catalog reflects (page reload)
- [ ] Duplicate course → copy created with `(2)` suffix or similar

#### Archive + restore
- [ ] Archive course → admin badge changes; catalog excludes (page reload)
- [ ] Restore from archive → status=draft again

#### Delete
- [ ] Delete course → "delete impact" preview shows enrollments / lessons → confirm → gone

**Known gotchas:**
- Academy is fully client-side React Query — no 60s wait, just refresh the page
- Lesson reorder uses `POST /admin/academy/courses/:id/lessons/reorder` with `{lessonIds: [...]}`

---

### Domain F: Inquiries (cross-app submission → admin visibility)

- **Admin URL (admin):** http://localhost:3051/ro/inquiries
- **Admin URL (agent):** http://localhost:3051/ro/my-inquiries (only as AGENT role; out of scope this pass)

#### Submit from Landing
- [ ] Open http://localhost:3050/ro/contact → fill form → submit → "Mulțumim" success state
- [ ] Open http://localhost:3050/ro/properties/<slug> → click "Request Info" → modal → submit
- [ ] In admin /ro/inquiries → both inquiries visible at top of list (no wait — admin uses fresh fetch)
- [ ] Each inquiry shows: source field stamped (`tge-contact` for contact-page; modal source per `useInquirySubmission`), `siteId: TGE_LUXURY`, sourceUrl

#### Submit from Revery
- [ ] http://localhost:3052/ro/contact → submit
- [ ] http://localhost:3052/ro/properties/<slug> → "Request Info" → submit
- [ ] In admin → both visible, `siteId: REVERY`, source stamped per Revery hook

#### Status lifecycle
- [ ] Open an inquiry → mark `read` → status badge updates; sidebar unread count drops by 1
- [ ] Mark `archived` → moves out of "new" filter
- [ ] Open kanban view (`?view=kanban`) → drag an inquiry between columns → status updates

#### Soft-delete + restore
- [ ] Delete an inquiry → toast with Undo for ~5 seconds → click Undo → restored
- [ ] Delete another, let toast time out → gone from list
- [ ] (Optional, requires URL hack) call `POST /api/v1/inquiries/:id/restore` directly to verify restore path works after timeout

**Known gotchas:**
- Throttle: 5 inquiries/min per X-Forwarded-For; multiple rapid submissions from same source 429
- Honeypot field: any value in the hidden honeypot silently 200s without persisting (intentional — bot defense)
- GDPR consent must be checked or submission 400s

---

## Phase 2 — Cross-cutting checks

### Brand isolation matrix
| Property tier | Should appear on Landing | Should appear on Revery |
|---|---|---|
| `luxury` | ✓ | ✗ |
| `affordable` | ✗ | ✓ |

If any cell flips, that's a **Blocker** — server-side `X-Site` enforcement is broken. File immediately.

### Locale parity (admin sidebar)
- [ ] Switch admin locale `ro` → `en` → `fr` → `de` via the locale switcher
- [ ] Sidebar labels translate cleanly in all 4 (no raw keys like `"Sidebar.properties"` showing)
- [ ] Form labels on Property/Article forms translate

### Image pipeline
- [ ] Property hero uploaded in Domain A renders on landing detail (no broken-image icon)
- [ ] Course cover uploaded in Domain E renders on academy catalog
- [ ] Agent photo uploaded in Domain C renders on landing /agents

### Settings sanity
- [ ] http://localhost:3051/ro/profile → current user shown, can edit name
- [ ] /ro/audit-logs → shows the operations performed during this checklist (recent CREATE/UPDATE/DELETE entries)

---

## Phase 3 — Final go/no-go

- [ ] All Domain A–F sections walked
- [ ] Cross-cutting checks pass
- [ ] Playwright suite green
- [ ] `bugs.md` has zero **Blocker** or **Critical** open

If yes → demo-ready. If any Critical/Blocker open → fix or escalate before demo time.

---

## Run notes (append as you go)

<!-- Datestamped notes on what worked, what didn't, fix decisions -->

### 2026-05-10 — automated pass complete

**Playwright suite expanded to 33 specs, all green (10.6s).**

| Bucket | Specs | Coverage |
|---|---:|---|
| Setup (auth bootstrap) | 1 | login → cache JWT for in-process reuse |
| Admin auth surface | 3 | BFF login / refresh / logout |
| Admin sidebar data sources | 12 | every demo-relevant API the sidebar pages depend on returns 200 + data |
| Admin lifecycle | 7 | full CRUD round-trips for properties (×4), agents, articles, academy course+lessons, inquiries (×2) |
| Properties brand isolation | (in lifecycle) | luxury invisible to REVERY, affordable invisible to TGE_LUXURY, query-bypass rejected, status PATCH round-trips |
| Consumer-app render | 8 | Landing /ro + /properties, Revery /ro + /properties + /blog, Academy /ro auth-gate, Landing /en + Revery /en locale parity |

**Run with:** `SEED_ADMIN_PASSWORD=<value> pnpm --filter @tge/admin test:e2e`

**Bugs surfaced (1 Minor):**
- BUG-001 — `GET /articles/:slug` does not filter by `status=published`. Drafts are returned to public callers via slug-detail. No current user-facing leak (consumer apps use the list endpoint with status filter), but a wire-level surface bug worth patching. Logged in `bugs.md`.

**Setup gotchas worth knowing:**
- The auth-login throttle is 5/60s per IP. Multiple test runs in quick succession 429. Wait ~65s between runs, or set `DEV_AUTH_THROTTLE_DISABLED=1` on the API.
- `SEED_ADMIN_PASSWORD` env doesn't update an existing admin password (seed only writes on create). Used `scratch_reset_admin.mjs` (gitignored) to reset the password before the first test run.
- Admin BFF refresh tokens are single-use rotation. The original auth fixture pattern (storageState + per-test refresh) cascades 401s — refactored to cache a raw access token for the test run instead.

**What still needs a human eye (run the manual checklist for):**
- Visual layout, image quality, animation polish
- Form-validation feedback + error states (forms aren't exercised by the suite; CRUD goes through API)
- Drag-and-drop UX for lesson reordering and inquiry kanban
- Status badge colors / iconography
- Locale copy idiom (e.g. does "Mulțumim" / "Vă mulțumim" sound right)
- Image upload + image rendering on consumer detail pages (multipart pipelines)
- Settings + profile page edits
- Soft-delete toast undo timing (5-second window)
- AGENT role parallel pass (out of scope per the user's depth choice)
