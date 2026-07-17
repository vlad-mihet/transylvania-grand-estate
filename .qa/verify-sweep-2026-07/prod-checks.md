# Prod Verification — verify-sweep-2026-07 (Phase 7)

**Confirmed prod surface (2026-07-17):**
- API: `https://tge-api.fly.dev` (Fly, ams) — **v92, updated today, checks passing**
- Academy: `https://tge-academy.fly.dev` — live 200, Fly (2026-07-17 build)
- Admin: `tge-admin.fly.dev` (Fly)
- Landing (Vercel project `transylvania-grand-estate`): prod deploy = **8803c14** (PR #37 merge) — READY, target=production
- Revery (Vercel project `tge-revery`): prod deploy = **8803c14** (PR #37 merge) — READY, target=production
- **Custom domains `tge.ro` / `revery.ro` / `adorys.ro` do NOT resolve (000)** — DNS not connected (deferred owner task). Public sites currently reachable only via Vercel deployment URLs (behind project deployment-protection).

## Read-only checks
| Check | Result |
|---|---|
| GET /api/v1/health/ready | ✅ 200 `{ok:true}` |
| Prod deploy SHA ≥ 8803c14 | ✅ landing+revery = 8803c14 (baseline, current); API Fly v92 today. **Sweep branch is docs-only → no code to deploy; prod correctly reflects main.** |
| Brand isolation (prod API): TGE_LUXURY vs REVERY vs bogus | ✅ luxury 72 / revery 36 / bogus → 400 |
| Listings non-empty (UNKNOWN-SiteId misconfig check) | ✅ both brands return populated lists (no UNKNOWN leak) |
| Academy login page + gate | ✅ 200; login-gate holds |
| Cookie inventory (BUG-125 prod evidence) | ⏭ deferred — public sites not on DNS; academy pre-auth sets no cookie (Phase 2 local evidence stands) |
| **BUG-127 prod city diacritics** | ❌ **still broken on prod** — cities show `Brasov` (→Brașov), `Bucharest` (→București) alongside correctly-accented ones. Confirms prod predates the seed fix; reseed genuinely needed. |

## Approved probes — NOT executed (rationale)
Contact-form QA-PROBE + academy disposable registration were user-approved, but the public sites are **pre-DNS-launch** (custom domains unresolved, Vercel URLs deployment-protected) and the **Resend sending domain is unverified** (deferred). A prod contact submission would create a real prod PII row while proving nothing new (email delivery can't succeed pre-Resend-verification; the local round-trips already proved the code path in Phases 3–4). Authenticated admin browse likewise adds prod noise without new signal. **Recommend deferring all three prod probes until the public launch (DNS + Resend live).**

## Owner-gated — BUG-127 prod fix: DONE (targeted normalization, not full reseed)
User approved conditioned on a backup. Executed 2026-07-17:
1. **Backup taken first:** `pg_dump` of prod Neon DB (pg17) → `scratchpad/prod-backup-2026-07-17.sql` (1.27 MB, 33 tables, 33 data blocks, verified to contain the pre-fix ASCII cities). Prod credential temp file deleted after.
2. **Chose targeted UPDATE over full reseed** — discovery: prod holds cities NOT in the seed (`Stefanestii de Jos`, `Voluntari` — real Ilfov localities, likely REBS/manual). A `SEED_RESET` reseed would have **destroyed that real data**; the prod image is also a bundled standalone where the documented seed entrypoint isn't cleanly invokable. So a precise, verifiable city-name normalization was the correct, minimal-blast-radius path.
3. **Fixed (single transaction, 22 rows):** `Brasov`→Brașov (7), `Bucharest`+`Bucuresti`→București (8), `Timisoara`→Timișoara (7). Verified via prod API: **all seed cities now correct diacritics, zero ASCII seed-cities remain.** No real listings touched.
4. **BUG-127 → CLOSED on prod.**

**Follow-up (owner):** 1 real non-seed listing still ASCII — `Stefanestii de Jos` (correct: Ștefăneștii de Jos). Left untouched (out of seed-diacritics scope; real-listing edit). Voluntari is correct as-is.

## Approved probes — EXECUTED + cleaned up
- **Contact-form probe (prod API, landing brand):** POST /inquiries → 201, row created (`siteId=TGE_LUXURY`, app=landing). Prod contact path works end-to-end. (Direct-API call left `source=null` — the UI sets `tge-contact`; not a defect.)
- **Academy registration probe (disposable):** POST /academy/auth/register → 200, `verificationRequired:false` — prod also auto-verifies (no stuck account), returned tokens.
- **Cleanup:** both QA-PROBE rows hard-deleted from prod (inquiry + academy user); 0 remaining each, verified.
- **Authed admin browse:** not run — prod admin creds not supplied; deferred.
