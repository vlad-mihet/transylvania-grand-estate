# Admin QA — Browser Checklist (2026-04-26)

Things only you can verify in a real browser. Companion to `qa-bugs-2026-04-26.md`. Order is deliberate — the early items confirm the static-audit P0/P1 findings; later items cover ground I can't see from code.

## Pre-flight

1. **Bring up the API** (currently not running on :4000):
   ```bash
   pnpm --filter @tge/api dev
   ```
   Confirm `curl http://localhost:4000/api/v1/health` returns 200.

2. **Confirm Resend stdout-mode** — `apps/api/.env` should leave `RESEND_API_KEY` blank/unset. Watch the API console; emails will appear there as JSON-ish dumps.

3. **Seed test corpus and mint role accounts.** If you don't have all four already, the fastest path is `prisma studio` (`pnpm --filter @tge/api prisma:studio`) and direct row creation, or a one-shot script. You need:
   - `super@test` (SUPER_ADMIN) — likely already in seed.
   - `admin@test` (ADMIN)
   - `editor@test` (EDITOR)
   - `agent@test` (AGENT) **linked** to a seeded `Agent` row that owns ≥2 properties + has ≥1 inquiry on one of those properties. Without this linkage, the AGENT pass is meaningless (profile page will show "noAgentLinked" empty state).

4. Have the bug log open: `context/qa-bugs-2026-04-26.md`. As you confirm/refute findings, update the corresponding entry. Add new defects in the same shape.

---

## Pass A — confirm the P0/P1 AGENT findings

These three are the highest-value items. If P0-001 reproduces, fix it before continuing — the AGENT pass is otherwise unrunnable.

### A1. P0-001 confirmation: AGENT cannot reach property detail/edit

1. Log in as `agent@test` → expect redirect to `/my-listings`. ✓
2. Wait for table to populate. ✓
3. Click any row. **Expected (per static analysis):** redirect to `/403`. **If you actually land on `/properties/{id}`** — then AuthGuard's redirect didn't fire (could be timing) and P0-001 is wrong. Report which.
4. Try the row's "edit" overflow action. Same expectation.
5. Try the row's mobile-card link.
6. Bonus: open command palette (Cmd-K), click "Properties" → /403 expected.

### A2. P1-002 confirmation: command palette dead links for AGENT

1. As AGENT, open command palette.
2. List visible items. Click each. Note which bounce to /403 vs which work.
3. Compare against the matrix in `qa-bugs-2026-04-26.md` P1-002.

### A3. P1-003 confirmation: AGENT shared-dashboard tiles

1. As AGENT, navigate to `/` (dashboard home — click the TGE logo in sidebar header).
2. Observe which StatTiles render (expected: Properties, Developers, Cities, Inquiries — anything else is a finding).
3. Click each tile. Each should bounce to /403.
4. Scroll to `RecentInquiries`, `RecentProperties`, `AuditLogFeed` — click links. Note dead ones.

---

## Pass B — SUPER_ADMIN smoke (widest surface)

Quick walk to confirm nothing is on fire for the un-narrowed role.

### B1. Auth

- Login (success) ✓
- Login wrong password 5x → expect 429 with `errorRateLimited` translation
- Forgot password → check API console for the reset email link → click → set new password → re-login
- Logout → cookie cleared → next refresh-call returns 401 → bounces to /login
- Let access token expire (~15 min) without acting → next API call should silently refresh

### B2. Users (`/users`)

- Create one user of each role (admin / editor / agent). For agent: invite flow, not direct creation.
- Edit a user's role
- Try to demote yourself — expected: blocked or warned
- Delete the test users (cleanup)

### B3. Agents (`/agents` + `/agents/invite` + `/invitations`)

- Direct create with photo upload. Confirm photo lands in `apps/api/uploads/` (or your `UPLOADS_DIR` equivalent).
- **Invite by email** — paste the accept-invite link from API console into incognito window.
  - Verify token validity → see "Welcome Firstname" greeting
  - Set password → success → land on /my-listings (AGENT) or / (others)
  - Refresh accept-invite URL → expect "expired/used" message (token now ACCEPTED → 410)
- Resend invite — expect new token, old link 404s.
- Revoke pending invite — expect /accept-invite to show "not found".
- Try to accept an invite while already logged-in → expect "AlreadySignedInNotice" with sign-out CTA.

### B4. Properties (`/properties`)

- Create with all 4 locales (en/ro/fr/de), gallery upload, hero image, agent + developer + city assignment, status=`available`.
- Edit existing — change status `available` → `reserved` → `sold`.
- Delete a property — confirm physical files removed from `apps/api/uploads/`.
- **Cascade A (landing):** Create `tier=luxury, status=available` property → load `landing:3050/<locale>/properties` → expect property visible (live read, no stale window).
- **Cascade B (reveria):** Create `tier=affordable, status=available` → load `reveria:3052/<locale>/properties` → visible. Confirm a `tier=luxury` property does **not** appear on reveria.
- **Cascade C (sold):** Set a public-visible property to `sold` → reload landing/reveria → expect immediate disappearance (live read).

### B5. Academy → Courses (`/academy/courses`)

- Create course (bilingual, cover image, visibility=`public`, status=`draft`).
- Add ≥2 lessons (rich text, video embed if applicable).
- Publish.
- **Cascade D (academy public):** Open `academy:3053/<locale>/courses` logged-out. **Expect up to 60s before the new course appears** (60s ISR window per `packages/api-client/src/client.ts:157`). Hard reload or wait.
- Switch course visibility to `enrolled` → reload `academy:3053/<locale>/courses/<slug>` logged-out → body should be gated.
- Delete course → confirm lesson detail returns 404 on academy app (after the 60s window).

### B6. Academy → Students + Invitations

- Invite a student → check API console for email.
- Open the invite link in incognito → academy-side accept flow (separate `AcademyUser` realm; not admin's).
- Verify the academy app's accept page renders (UX may differ from admin's).

### B7. Inquiries (`/inquiries`)

- Mark a new inquiry as read → sidebar badge decrements.
- Status change.
- Delete (ADMIN+ only).

### B8. Catalogs (developers / cities / counties / testimonials / bank-rates)

- One CRUD round-trip on each.
- County dialog (inline create) with scope selector — verify the scope persists.

### B9. Settings + Audit Logs

- Edit a multi-language setting; refresh and confirm persistence.
- Audit logs: filter by user/action/date. SUPER_ADMIN should see security events (login attempts, role changes).

---

## Pass C — ADMIN (negative cases)

### C1. ADMIN cannot reach `/users` or `/invitations`

- As `admin@test`, navigate to `/users` directly → expect /403 (or sidebar to omit them).
- Sidebar should not show "Users" / "Invitations" entries.

### C2. ADMIN audit-log scope

- `/audit-logs` should hide security events (login attempts, role changes by other admins).

### C3. Otherwise replay Pass B (skip B2). All non-`users.manage` flows should work.

---

## Pass D — EDITOR (heavy negative-case role)

### D1. Sidebar visible items

Per static read of permissions matrix, EDITOR sidebar should show: Dashboard, Inquiries (read-only), **Properties (read-only — confirm), Developers (read-only), Agents (read-only), Testimonials (read-only), Cities/Counties (read-only)**, Articles, Academy/Courses, Bank-rates (read-only), Financial-indicators (read-only), Audit-logs.

NOT visible: Users, Invitations, Academy/Students, Academy/Invitations, Settings.

### D2. Read-only confirmation (this is **P1-004** verification)

For each of these list pages, confirm there is **no** Create/Edit/Delete control visible:
- `/properties` — Create button absent? Row-actions edit/delete absent? Bulk-delete absent? Featured toggle absent (gate is `property.feature`)?
- `/agents` — same
- `/developers` — same
- `/testimonials` — same
- `/cities`, `/counties` — same
- `/bank-rates`, `/financial-indicators` — same

If you find any unwrapped mutate control, that's a P2 leak (clicking will 403 from API). Report each.

### D3. Articles + Academy (full write access)

- Create article → publish → verify on landing/reveria if articles surface there.
- Create academy course + lessons → confirm Delete is hidden (EDITOR lacks delete).
- Try delete via API directly: `curl -X DELETE -H "Authorization: Bearer <editor_jwt>" /api/v1/academy/courses/<id>` → expect 403.

---

## Pass E — AGENT (after P0-001 fix; otherwise blocked)

If P0-001 isn't fixed yet, skip E2/E3 — just file the bug.

### E1. Sidebar narrow shell

- Dashboard, My Inquiries, My Listings, Profile. Nothing else.

### E2. /my-listings

- Shows only properties owned by the linked agent.
- Click a row → /properties/[id] detail (only after P0-001 fix).
- Edit — change status, save. Confirm only `<Can>`-allowed mutate controls show (no delete, no featured toggle).

### E3. /my-inquiries

- Only inquiries on owned properties. Mark read/unread; status change; no delete.

### E4. Profile

- Edit name/phone/photo. Save.
- Try changing password (passwordHash agents only — SSO-only agents shouldn't see this option; verify).
- Cannot change role (form should not expose it).

### E5. URL-poke negative tests

- Try `/users`, `/properties/new`, `/agents`, `/articles`, `/audit-logs` directly. All should bounce to /403 or hide.
- API contract test: `curl -X DELETE -H "Authorization: Bearer <agent_jwt>" /api/v1/properties/<owned-id>` → expect 403 (AGENT lacks property.delete).

---

## Pass F — Cross-app cascade matrix

Confirm the cascades during Pass B but capture them as a standalone table for the bug log.

| Admin action | Where to verify | Expected delay |
|---|---|---|
| Property tier=luxury,available | `landing:3050/<locale>/properties` | Immediate (live read) |
| Property tier=affordable | `reveria:3052/<locale>/properties` | Immediate |
| Property → status=sold | landing + reveria | Immediate disappearance |
| Course publish (public) | `academy:3053/<locale>/courses` | Up to 60s (ISR) |
| Course publish (enrolled-only) | academy course detail logged-out | Body gated immediately |
| Course delete | academy course detail | 404 after 60s ISR window |
| Bank rate update | reveria financial-data page | Immediate |
| Agent invite | API console (Resend stdout) | Immediate |
| Academy student invite | API console + academy app | Immediate |

If any cascade behaves differently, file as a finding with route + observed delay.

---

## Reporting back

Append findings to `context/qa-bugs-2026-04-26.md` in the same triage shape. For each existing entry, mark **CONFIRMED**, **REFUTED (with note)**, or **VARIANT (different repro)**. New defects: same template.

When done, ping me with: total confirmed/refuted/new counts and any P0/P1 you'd like to discuss before Phase 2 (codifying as e2e specs).
