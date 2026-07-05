# Cowork handover — REBS "listing not in feed" investigation

You have browser access; use it to investigate **inside the REBS CRM web UI** why our
active listing is not exported to the public API, fix it if the UI allows, and then
verify the import end-to-end on our stack.

## Context (already established — don't re-derive)

- Our REBS adapter was audited against the official docs (`https://demo.crmrebs.com/api/doc/`)
  on 2026-07-05 and **conforms** (auth, pagination, retry, deletion semantics, image
  mirroring, code tables). The problem is **not** our code.
- The API key authenticates: `/api/public/agent/` → 1, `/api/public/region/` → 91.
  But `/api/public/property/` and `/api/public/city/` → **`total_count: 0`**.
- The CRM portfolio ("Portofoliul meu") shows **1 active + 1 incomplete** listing.
  The active one: **CP3207425** — Apartament, Strada Nicolae Bălcescu Nr. 12, Ap. 5,
  Sibiu, 95.000 €, agent Claudiu Dumitrache, semafor verde "A" (Activă),
  added 05 Iul '26 18:44. Its **Promovare column is empty** — no promotion channels.
- Per the REBS docs, the feed exports listings with Valabilitate "Activă"
  (`availability=1`), and own-site export is governed by the CRM module
  **"Promovare Site Propriu"**. Working hypothesis: the listing (or the agency
  account) has the own-site channel disabled, so the feed exports nothing.

## Credentials

- **REBS web UI**: Vlad gives you the URL + login directly (not in this file).
- **Our admin** (local dev DB only): `admin@transylvaniagrandestate.ro` / `VerifyAdmin2026!`.

## Part 1 — Investigate in the REBS UI

1. Log into REBS. Open listing **CP3207425** (Detalii and/or Editează).
2. Hunt for the promotion controls. Look for (Romanian UI): **"Promovare"**,
   **"Promovare Site Propriu"**, **"Site propriu"**, "Export", "Publicare" — as a tab or
   section on the listing edit page, AND as an entry in the account/administration menu
   (agency-level module). Screenshot everything you find, enabled or not.
3. If there is a per-listing **"Site propriu"** toggle → enable it, save, and confirm the
   Promovare column in the portfolio list now shows a badge on CP3207425.
4. If the control is agency-level (administration → Promovare Site Propriu), inspect it:
   is the own-site channel configured/active at all? Which valabilități are included?
   Enable/fix what the UI permits; screenshot what it looks like.
5. Also note anything else that could gate export (e.g., a "validare" step, a missing
   required field warning on the listing, portal-assignment screens). The second listing
   is deliberately "Incompletă" — leave it alone unless a comparison helps.
6. If the UI offers no such control anywhere, that's a valid finding: report it —
   the fix is then a request to the agency manager / REBS support (docs say the export
   config is theirs).

## Part 2 — Verify the feed (terminal, repo root)

```bash
pnpm rebs:validate
```
Success = `meta.total_count (full feed): 1` and a sample object for the Sibiu apartment
with `for_sale=true`, `property_type` 1, `currency_sale` 1 (EUR). If it's still 0
after ~10 minutes, re-check Part 1 findings and report; don't loop indefinitely.

## Part 3 — Run the sync end-to-end (only if Part 2 shows ≥1)

Stack should already be up (admin :3051, revery :3052, api :4000). If the API is down:
`pnpm --filter @tge/api start` (compile-once; ~40s).

1. Trigger the sync:
   ```bash
   TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
     -H 'Content-Type: application/json' -H 'X-Site: ADMIN' \
     -d '{"email":"admin@transylvaniagrandestate.ro","password":"VerifyAdmin2026!"}' \
     | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(JSON.parse(s).data.accessToken))")
   curl -s -X POST http://localhost:4000/api/v1/crm-sync/sync \
     -H "Authorization: Bearer $TOKEN" -H 'X-Site: ADMIN'
   ```
   Expect `{"ran":true,"fetched":1,"created":1,"quarantined":0,"errors":0,...}`.
   (Sibiu exists in our DB with a Revery brand membership, so **no quarantine** expected.)
2. **Revery render**: open `http://localhost:3052/ro` → the Sibiu apartment appears in
   the catalog; its detail page renders title/price/images; image URLs are ours
   (`/uploads/...`), **not** `crmrebs.com`.
3. **CRM deep-link** (new since your last run): `http://localhost:3052/id/<externalId>/`
   must 307 → the listing's `/ro/properties/<slug>` page. `<externalId>` is the REBS id —
   check the sync response/DB, or try the numeric part of CP3207425.
4. **Idempotency**: re-run the trigger → expect `created:0, updated:1, mediaReused>0`.
5. **Edit protection**: in the admin (`http://localhost:3051/ro/login`), set the imported
   listing's status to `sold`, re-run the trigger → status must stay `sold`.

## Report back

- Where the own-site export control lives in the REBS UI (screenshots), what state it
  was in, and what you changed.
- The `rebs:validate` output and each sync summary JSON.
- Pass/fail per Part 3 step, with screenshots and any console/network errors.
- Do NOT edit repo code — findings only; code fixes go through Vlad.
