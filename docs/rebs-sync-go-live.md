# REBS listing sync — go-live checklist

Cutover steps to turn on the CRM → platform listing sync (Phase 1). The feature
ships on branch `feat/crm-rebs-sync` and is **dormant in prod** until the Fly
secrets below are set — so deploying it changes nothing until you flip the switch.

Background: the sync pulls **active for-sale** listings from our REBS instance into
the **REVERY/affordable** brand hourly — mirroring images to R2, converting RON→EUR,
quarantining unknown cities, and soft-unpublishing listings that leave the feed. It
never overwrites human edits (`status`, `tier`) after first import. Full design:
`apps/api/src/crm-sync/` and the plan doc.

## Prerequisites
- REBS API key in hand (vendor-issued).
- Confirm our instance subdomain still matches `REBS_BASE_URL`'s default
  (`https://client-396fe343.crmrebs.com/api/public`). If REBS gave you a different
  instance, note it for step 2.
- Fly CLI authenticated (`fly auth whoami`); admin on `tge-api`.

---

## 0. Validate the live feed FIRST (no deploy, no DB)
Prove the key authenticates and check the real field vocabulary before anything ships.

```bash
# put the key + instance URL in apps/api/.env (gitignored — never commit it):
#   REBS_API_KEY=<key>
#   REBS_BASE_URL=https://client-396fe343.crmrebs.com/api/public
pnpm rebs:validate
```

Review the report:
- **Auth** — must say `✅ Authenticated`. A `401/403` means the key or instance is wrong.
- **`total_count: 0` with a valid key** — the feed exports only listings with
  Valabilitate **"Activă"** (`availability=1`), and own-site export is governed by
  the CRM admin module **"Promovare Site Propriu"**. If the CRM shows active
  listings but the feed is empty: open the listing and confirm it's literally
  "Activă" (not "Incompletă" — REBS's default until required fields are complete)
  and enabled for own-site promotion; otherwise it's agency-manager/REBS-support
  territory, not a bug on our side. (Sanity check the key sees data at all:
  `/api/public/agent/` and `/api/public/region/` should have non-zero counts.)
- **`property_type`** — any line flagged `⚠ UNMAPPED` is a type the mapper would skip.
  If you see real types we don't handle, extend `mapPropertyType()` in
  `apps/api/src/crm-sync/adapters/rebs/rebs.mapper.ts` (+ its spec) on the branch.
- **image field shapes** — the mapper expects URL strings or `{url|full|image|src|href}`
  objects. If REBS uses a different shape, adjust `imageUrl()` in the mapper.
- **currency_sale** — anything other than EUR/RON is skipped (logged) in Phase 1.

Iterate on the branch until the report is clean and `pnpm --filter @tge/api test:unit` is green.

---

## 1. Merge → deploy → migrate (one step, automatic)
Merge the PR to `main`. `.github/workflows/deploy-api.yml` (push to `main`) runs
`flyctl deploy`, and `apps/api/fly.toml`'s `release_command = "npx prisma migrate deploy"`
applies the new migration (`…_add_crm_sync_listing_source`) before traffic shifts.

Verify:
```bash
fly logs -a tge-api          # look for the release_command running migrate deploy
```
The sync is still OFF at this point (no secrets yet).

---

## 2. Set the Fly secrets (the actual switch)
```bash
fly secrets set REBS_API_KEY=<key> REBS_SYNC_ENABLED=1 -a tge-api
# add REBS_BASE_URL=<url> ONLY if the instance differs from the schema default
```
Setting secrets restarts the machine. The hourly `@Cron` will now run.

---

## 3. Trigger the first import
Either wait for the top of the hour, or run it immediately as an admin:
```bash
curl -X POST https://tge-api.fly.dev/api/v1/crm-sync/sync \
  -H "Authorization: Bearer <SUPER_ADMIN_JWT>"
# → { ran, fetched, created, updated, quarantined, unpublished, mediaDownloaded, ... }
```
Watch it run: `fly logs -a tge-api` (the orchestrator logs a one-line summary).

---

## 4. Verify
- **REVERY site** shows the new affordable listings.
- **Quarantined count** (`quarantined > 0`): those listings have an unknown city and
  are imported but `unpublishedAt`-held. They surface in the admin (ADMIN sees
  unpublished) — each needs its `City` row + a `revery` `CityBrand` membership before
  it publishes. (Known cities get the membership auto-ensured.)
- **Images** resolve from R2 (not hotlinked from REBS).
- **Price** — spot-check a listing that was RON in the feed; stored value should be EUR.

---

## 5. Kill-switch / rollback
```bash
fly secrets set REBS_SYNC_ENABLED=0 -a tge-api    # stops all further syncs instantly
```
Already-imported rows remain (soft state — the sync never hard-deletes). No
destructive rollback is needed; re-enable by setting it back to `1`.

---

## Watch-outs
- **Memory**: `tge-api` runs at **512MB** (the prod seed OOMs there). The first import
  downloads every image sequentially (each capped at 15MB, buffered then uploaded) and
  can take a while; it holds a Postgres advisory lock for the duration (which also
  prevents the next hourly tick from overlapping). If the first run is large, bump and
  restore: `fly scale memory 1024 -a tge-api` → run → `fly scale memory 512 -a tge-api`.
- **Feed errors are safe**: a failed walk aborts the run and **never** unpublishes — only
  a listing's genuine absence from a *successful* full walk soft-unpublishes it.
- **Deferred** (not in this phase): TGE/luxury promotion, en/fr/de translation, webhooks,
  the agent feed, and lead-capture POST-back.
