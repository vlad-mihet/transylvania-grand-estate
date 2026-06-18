# Adversarial Review — CRM Listing Sync (REBS adapter)

Read-only review. Branch `feat/adorys-city-images`, code under `apps/api/src/crm-sync/`,
`packages/types/src/schemas/crm-listing.ts`, `apps/api/src/uploads/storage/*`.

---

## 1. Verdict on the swappability goal: **PARTIALLY achieved**

The part that matters is real. Core (`crm-sync/core/*`) contains **zero REBS field names** —
grep for `price_sale`/`full_images`/`internal_id`/`meta.next` in `core/` returns only doc
comments. The canonical model (`crm-listing.ts`) is genuinely top-down from `Property`, the
mapper is the only file that knows REBS, and the orchestrator branches on `capabilities()`,
never a CRM name. Adding a richer-multilang CRM needs **no core change** (the
`importedLocalizedString` en/fr/de optionals + `backfillLocalized` already cover it).

But the capability port is **padded with decorative surface the core never reads**, which both
violates the YAGNI mandate and forces core edits for a second adapter:

| Capability / member | Read by core? | Evidence |
|---|---|---|
| `auth: 'apiKey'` | **No** | orchestrator never references `caps.auth`; adapter owns auth internally |
| `pagination: 'offset'` | **No** | never referenced anywhere in `core/` |
| `webhooks` | **No** | "Reserved flag" — `listing-provider.port.ts:38` |
| `delta` + `sourceModifiedAt` | **No** | stored at `listing-write.service.ts:210`, never read; no change-detection exists |
| `deletion.perItem404` + `isAlive()` | **No** | `isAlive` defined (`rebs.adapter.ts:54`) but orchestrator only uses `deletion.absence` (`orchestrator.ts:130`) — the whole 404 path is dead |

**Primary-probe walk — adding CRM #2 (OAuth / page-token / deleted-feed / multilang):**
- OAuth, page-token → adapter-internal, core unchanged. **But** you must still widen the
  single-literal types `auth: 'apiKey'` (`port.ts:17`) and `pagination: 'offset'` (`port.ts:18`)
  in a *core* file purely to stay type-correct for fields nothing reads. Boundary-by-type smell.
- "Deleted-listings feed" (neither absence nor 404) → **no capability expresses it**; you add a
  capability *and* new consumption logic at `orchestrator.ts:130`. The port is shaped around
  REBS's two deletion modes, not capability-complete.
- `crmSourceSchema = z.enum(["rebs"])` (`crm-listing.ts:47`) must gain the new source — shared
  contract edit, acceptable.

**Conclusion:** you would *not* rewrite the sync — core + canonical model survive. The
abstraction is real where it counts, but five capability surfaces are dead/speculative, exactly
the "no speculative hooks for CRMs that don't exist" the brief forbade.

---

## 2. Findings

| # | Sev | Location | Defect | Impact |
|---|-----|----------|--------|--------|
| 1 | **Critical** | `listing-sync.orchestrator.ts:152-170` | **Short-feed mass-unpublish.** Deletion safety only guards `presentIds.length === 0`. A feed that returns HTTP-200 with a *valid but truncated* page set (REBS pagination bug, premature `meta.next:null`, upstream partial outage) walks "successfully," so it bypasses both the abort-on-error guard (line 93-100, only fires on a thrown error) and the zero-guard. `updateMany({ externalId: { notIn: presentIds } })` then soft-unpublishes every live row not in the short set. | Public catalog goes dark. Recoverable (soft) but exactly the highest-stakes scenario the brief named ("a transient short feed must never mark live listings deleted"). No ratio/floor check vs current DB count. |
| 2 | **High** | `sync-lock.service.ts:46-64` | **Advisory lock is unreliable under Prisma's connection pool.** `pg_try_advisory_lock` is *session-scoped* — bound to the backend that ran it. `tryAcquire`, the run's queries, and `release` each go through `$queryRaw`/Prisma and may land on **different pooled connections**. `pg_advisory_unlock` on another connection unlocks nothing (logs "advisory unlock failed") and the original lock **persists on its still-open pooled connection**. The "auto-release on disconnect" backstop rarely fires in a long-lived server. The comment (lines 14-17) admits this and ships anyway. | After a run whose unlock misses, every subsequent hourly tick logs "already running on another instance — skipping" and **the sync silently stops**, with a misleading log. Errs safe (over-locks, never under-locks) but defeats the feature. |
| 3 | **High** | `rebs.mapper.ts:64-86` → `orchestrator.ts:90-101,162-169` | **A transient bad field on a live listing silently unpublishes it.** Map-skips (no price, `for_sale` flips, type renamed, blank city) drop the listing from `presentIds`. Reconcile then unpublishes the previously-imported row. Self-heals next run *if* it maps again, but a partial upstream change (e.g. REBS renames one `property_type`) silently unpublishes that subset. `summary.fetched` counts post-filter, so the count looks plausible. | Silent, data-hiccup-driven removal of live inventory; compounds #1. |
| 4 | Medium | `download-image.util.ts:29` (`fetch(url)`) | **SSRF.** The server downloads arbitrary URLs from feed fields (`full_images`/`thumbnail`/…) validated only as `https?://` (`rebs.mapper.ts:218`, `canonicalImageSchema` `.url()`). No host allowlist, no private-IP/`169.254.169.254` block, default redirect-following. The image content-type check (line 34-40) limits *exfiltration* but not blind SSRF (internal port hits, state-changing GETs). | A compromised/poisoned feed makes our server fetch internal addresses. Brief explicitly flagged this; it is unconstrained. |
| 5 | Medium | `crm-listing.ts:86-141`; consumed in `rebs.adapter.ts:41-47` | **The "load-bearing wall" canonical schema is never `.parse()`d at runtime.** Only `rebsFeedSchema.parse` runs (`rebs.client.ts:76`); the mapper returns a hand-built object typed as `CanonicalListingInput`. The contract is compile-time only — a future adapter (or a mapper edit producing e.g. an empty `citySlug`, out-of-range `sortOrder`) writes straight to the DB. False assurance / defense-in-depth gap. |
| 6 | Medium | `rebs.mapper.ts:113` | **Missing `currency_sale` defaults to `'EUR'`.** A RON-priced listing that omits the currency field is stored at face value as EUR — a ~5× too-high price. `BrandRouteService.toEur` deliberately *throws* on unknown currency to avoid exactly this; the mapper's silent EUR-default undercuts that guarantee. |
| 7 | Medium | `port.ts:14-39`; `listing-write.service.ts:210`; `rebs.adapter.ts:54` | **Speculative generality / dead code** (see table in §1): `auth`, `pagination`, `webhooks`, `delta`+`sourceModifiedAt`, `perItem404`+`isAlive` are all unread by core. Brief: "minimal port… no speculative hooks." |
| 8 | Medium | `listing-write.service.ts:286-332` | **No change-detection → full write + image-row churn every run.** Despite the advertised `delta:'modifiedTimestamp'` and stored `sourceModifiedAt`, every property is fully UPDATEd and its CRM image rows `deleteMany`+`createMany` *every hour* regardless of `date_modified`. Content is idempotent (URLs reused, no re-download) but **`PropertyImage.id` and `sortOrder` are not stable** — they're recreated hourly. Write amplification scales with catalog size; the brief listed `date_modified` change-detection as a correctness item and it is absent. |
| 9 | Low | `rebs.client.ts:46-55` | Pagination walk has **no visited-set / max-page cap**. A feed whose `meta.next` points to itself loops forever; the run hangs (holding the lock from #2) with no run-level timeout. `listings` Map bounds memory but not the loop. |
| 10 | Low | `rebs.mapper.ts:68` | Feed assumed active-only via `for_sale` only; the parsed `availability` flag (`rebs.types.ts:59`) is ignored. A `for_sale && !availability` (reserved) listing imports as `available`. |
| 11 | Low | `crm-sync.controller.ts:19` | Manual trigger doesn't check `isConfigured()/isEnabled()` (cron does, `crm-sync.cron.ts:23`). With no key it sends an empty `Authorization` header and runs a doomed fetch. Fails safe (aborts, no deletion) but noisy. Auth itself is fine — global `JwtAuthGuard`+`RolesGuard` (`app.module.ts:213-214`) enforce `@Roles`. |
| 12 | Low | `media-mirror.service.ts:80-94` + `listing-write.service.ts:304-329` | R2 upload happens before the DB image txn; a crash between leaves **orphaned R2 objects** (no DB row). Best-effort `deleteObjects` only covers feed-drop obsoletes, not crash orphans. No data loss, slow storage leak. |

**Secret handling:** clean. Key travels in the `Authorization` header (not the URL), never logged
(errors log `status`+`url` only, `rebs.client.ts:73`), not echoed in the run summary. Good.

**Migration/repo-fit:** good. `@@unique([source, externalId])` with both-nullable columns
(NULLs distinct, native rows unconstrained) is correct (`schema.prisma:488`, migration verified);
public reads filter `unpublishedAt IS NULL` (`properties.service.ts:164`), so quarantine/unpublish
actually take effect; cron mirrors `BnrSyncService`. No parallel machinery invented.

**Tests:** the integration spec is real (drives the actual orchestrator + adapter over a fixture,
asserts upsert identity, mirror-once-reuse, soft-unpublish, human-field protection, feed-error
abort). **Coverage holes on the data-loss paths:** no test for the short/partial-feed
mass-unpublish (#1), the map-skip-shrinks-presentIds path (#3), the zero-listing guard itself, the
advisory-lock pooling behaviour (#2 — FakePrisma always grants, so the bug is invisible), or image
row-id stability across runs (#8). The most dangerous behaviours are the least tested.

---

## 3. Single most important thing to fix — and merge call

**Fix #1 (short-feed mass-unpublish) before anything else.** The zero-listing guard is a fig leaf:
it only catches the all-or-nothing case, while the realistic failure — a 200-OK truncated walk —
sails through and dark-publishes the live catalog. Minimum viable guard: refuse to reconcile when
`presentIds.length` drops below a sane floor relative to the current live count for that source
(e.g. abort if it would unpublish more than N% in one run), and/or require pagination to reach a
terminal `meta.next:null` *with* a `total_count` cross-check before trusting "absent = deleted."

**Block merge: yes.** Three findings (#1 Critical, #2/#3 High) are exactly the data-loss and
silent-availability-loss modes the brief made the bar for a passing review, and the most
data-destructive paths have zero test coverage. The architecture is sound enough to keep; the
deletion/reconcile path and the advisory lock are not production-safe as written.
