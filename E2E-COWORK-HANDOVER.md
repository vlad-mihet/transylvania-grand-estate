# E2E test handover — Claude Cowork

The full local stack is **running** (combined branch `e2e/admin-rebs` = admin-listing fixes +
REBS sync). Drive the browser to run the two test plans below. Everything is local/dev data —
create and delete freely.

## Stack (already up)
| Service | URL | Notes |
|---|---|---|
| **Admin** | http://localhost:3051 | Login at **`/ro/login`** (`/login` redirects there) |
| **Revery** (affordable brand) | http://localhost:3052/ro | Public site — shows `affordable` listings |
| **Landing / TGE** (luxury brand) | http://localhost:3050/ro | Public site — shows `luxury` listings |
| **API** | http://localhost:4000/api/v1 | NestJS; REBS sync enabled |
| Postgres | localhost:5435 | Seeded: 45 cities, 96 properties (72 luxury / 24 affordable) |

> First page load per app is **slow** (Next dev compiles on demand) — give each route ~10–40s the
> first time, then it's fast. The admin keeps you logged in across SPA navigation; a full browser
> reload re-authenticates automatically via an httpOnly cookie.

## Admin credentials (dev DB only)
- **Email:** `admin@transylvaniagrandestate.ro`
- **Password:** `VerifyAdmin2026!`
- Role: SUPER_ADMIN.

---

## ✅ Fixes applied since your last run (please re-verify)

Your 3-bug report was triaged and the two real bugs are fixed on the running stack:

- **Bug 2 — Revery nested routes 404 (REAL, fixed).** Root cause was a next-intl
  `pathnames` map incompatible with next-intl@4.8.3 + next@16.1.6, which 404'd every
  2+-segment route. The map was removed. **Verified:** `/ro/instrumente/calculator-ipotecar`
  and `/ro/cities/<slug>` now return 200. Please re-check property details, city, agent,
  developer, blog, and tool pages open normally. **Note:** tool pages now use the canonical
  `/instrumente/*` URL in every locale (the localized `/tools` · `/outils` · `/werkzeuge`
  aliases were dropped) — that's expected, not a bug.
- **Bug 3 — Edit form showed wrong tier / would wipe amenities & classification (REAL, fixed).**
  The edit page now hydrates the full form. **Please verify:** open an existing **affordable**
  listing → Brand/Tier reads **"Affordable — REVERY"**, amenities + classification are
  populated from saved data, and the form is **not** "unsaved" on load. Toggle one amenity,
  save, reopen → tier unchanged and amenities/classification retained.
- **Bug 1 — Locale fields wiped on tab switch (REAL, fixed).** Your clean-keystroke re-test was
  right and my first triage was wrong. The localized editor bound a single react-hook-form
  controller to `title.${active}` and swapped `active` on tab change — a name-changing controller
  drops the previous locale's value, so only the active locale stayed registered and every save
  validated the inactive locales as `undefined` (never reaching the API). Fixed: one controller
  per locale, static names, only the active one visible. A Playwright regression
  (`localized-editor.spec.ts`) covers it — confirmed failing on the old code, passing on the fix.
  **Please re-run A2:** on a fresh form, type RO + EN with real keystrokes, set the required
  fields, and save → it should POST and appear in the Revery catalog. The RO→EN→RO round-trip no
  longer blanks fields.

### A2 follow-up fixes (from your last pass)
- **Silent save failure (fixed).** A save blocked by validation used to do *nothing* — no toast,
  no error — because metadata inputs never rendered their errors and there was no invalid handler.
  Now: a toast fires ("fix N fields before saving"), and each field (neighborhood, yearBuilt, slug,
  city…) shows its own inline error. Note **neighborhood + yearBuilt are still required** by design
  (pending a product call on whether to relax them) — they'll just tell you now instead of failing
  silently.
- **0-image detail page crash (fixed).** A listing with no images tripped the Adorys detail error
  boundary. Now it renders a "Fără imagini" placeholder. Verified on the Sibiu test listing (200,
  renders). You can re-check that listing's detail page.

---

## Plan A — Admin listing management (no external deps)

Goal: confirm a manually-created listing reaches the right public site, on **both** brands, with
rich fields and the address geocoder.

1. **Log in** at http://localhost:3051/ro/login with the credentials above.
2. **Create a REVERY listing**: Properties → New. Fill: title/description (RO + EN), price,
   type = Apartment, **Brand / Tier = "Affordable — REVERY"**, **City = a city already in the list
   (e.g. Sibiu or Cluj-Napoca)**, then:
   - Toggle a few **Amenities** (Balcony, Parking, AC).
   - Add 1–2 **Features** (e.g. RO "Vedere panoramică" / EN "Panoramic view").
   - In **Location → "Find address"**, type a street (e.g. "Bulevardul Eroilor Cluj") and pick a
     result → confirm latitude/longitude auto-fill.
   - Upload 1–2 images, set a hero.
   - Save.
3. **Verify on Revery**: open http://localhost:3052/ro and find the listing in the affordable
   catalog → open its detail page → confirm title/price/amenities/features/images render.
   - **Expected:** it appears. (Before this fix it would NOT — that was the showstopper.)
4. **Create a TGE/luxury listing**: repeat step 2 but **Brand / Tier = "Luxury — TGE"**, a city, save.
5. **Verify on Landing/TGE**: http://localhost:3050/ro → confirm it appears there, and that the
   REVERY listing does **not** appear on TGE (and vice-versa) — brand isolation.
6. **Edit / move brand** (optional): edit the REVERY listing, switch tier to Luxury, save → it
   should disappear from Revery and appear on TGE.

**Pass criteria:** every created listing shows on the correct site only; amenities, features,
images, and geocoded coordinates all persist and render.

---

## Plan B — REBS sync (needs the REBS web UI)

Goal: a listing published in REBS flows into the Revery site via our sync.

> **Current state:** the REBS account returns **0 active listings** right now — so you must publish
> one first. The sync is wired and verified (a trigger now returns `{ran:true, fetched:0, …}`).

1. **Log into REBS** (web UI) with the credentials **Vlad will give you directly** (not in this file).
2. **Create + activate a listing** in REBS:
   - **For sale** (not rent).
   - **Priced in EUR** (avoids a currency-rate dependency in dev).
   - Type = apartment / house / land (these map; office/commercial/industrial are skipped by design).
   - **City = a Romanian city already in our platform** (e.g. **Cluj-Napoca** or **Sibiu**) so it
     isn't quarantined.
   - Set its availability to **"Activă"** (only active listings are exported by REBS).
3. **Trigger our sync** (the hourly cron also does this automatically; to run it now, paste this in a
   terminal — the access token is short-lived, so this fetches a fresh one each run):
   ```bash
   TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
     -H 'Content-Type: application/json' -H 'X-Site: ADMIN' \
     -d '{"email":"admin@transylvaniagrandestate.ro","password":"VerifyAdmin2026!"}' \
     | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(JSON.parse(s).data.accessToken))")
   curl -s -X POST http://localhost:4000/api/v1/crm-sync/sync \
     -H "Authorization: Bearer $TOKEN" -H 'X-Site: ADMIN'
   ```
   **Expected:** a summary like `{"ran":true,"fetched":1,"created":1,"quarantined":0,"errors":0,...}`.
4. **Verify on Revery**: open http://localhost:3052/ro → the imported listing should appear in the
   affordable catalog, with its **images mirrored** (served from our `/uploads/...`, not REBS).
5. **Re-sync idempotency** (optional): run the trigger again → expect `created:0, updated:1` and
   `mediaReused` > 0 (no duplicate, no image re-download).
6. **Edit protection** (optional): in the admin, mark the imported listing `sold`; re-sync → it
   should stay `sold` (the sync never overwrites human-set status/tier).

**Gotchas:**
- An **unknown city** (not in our table) → the listing is **quarantined** (imported but hidden;
  visible in the admin for review, not on the public site). That's expected behaviour, not a bug.
- Use **EUR**; a RON-priced listing needs the EUR/RON rate which may not be seeded in dev.

**Pass criteria:** an active, for-sale, EUR, known-city REBS listing appears on Revery after a sync,
with mirrored images; re-syncs don't duplicate it; admin status edits survive.

---

## After testing
- Delete test listings from the admin (Properties → … → Delete), or leave them — it's a dev DB.
- Report: which steps passed/failed, with screenshots and any console/network errors.

## Notes for the report
- A **real bug was already found + fixed** during bring-up: the sync's Postgres advisory-lock SQL
  used a non-existent function overload (`pg_try_advisory_lock(bigint,bigint)`) and failed every run;
  fixed by casting to `int`. So the sync you're testing is the corrected version.
