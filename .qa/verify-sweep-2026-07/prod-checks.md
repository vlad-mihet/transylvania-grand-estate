# Prod Verification — verify-sweep-2026-07 (Phase 7)

Prod surface (domains to be confirmed at Phase 7 start — do not guess):
- API: https://tge-api.fly.dev (Fly, ams)
- Admin: tge-admin.fly.dev / admin.tge.ro (confirm which answers)
- Academy: https://tge-academy.fly.dev
- Landing (TGE): Vercel — confirm domain (tge.ro per .env.production.example)
- Revery: Vercel — confirm domain (revery.ro vs adorys.ro references both exist in repo)

Rule: judge nothing before checking `x-vercel-cache` (hard-refresh) and confirming the
deployed SHA ≥ 8803c14 (Vercel deployment metadata / `flyctl image show`). Stale deploy = Major finding, not a bug hunt.

## Read-only (no approval needed)
| Check | Result |
|---|---|
| GET /api/v1/health/ready on tge-api | ⬜ |
| flyctl status: tge-api / tge-admin / tge-academy | ⬜ |
| flyctl logs scan (error spam) ×3 apps | ⬜ |
| Deploy SHA current on all 5 surfaces | ⬜ |
| Brand isolation on prod API (X-Site TGE_LUXURY vs REVERY vs bogus) | ⬜ |
| Listings non-empty on landing + revery (UNKNOWN-SiteId misconfig check) | ⬜ |
| Browser smoke: landing (home/list/detail/locale/credits/console) | ⬜ |
| Browser smoke: revery (+ calculators load, maps) | ⬜ |
| Browser smoke: academy login page + logged-out deep-URL redirect | ⬜ |
| Admin unauthenticated deep-URLs redirect to login | ⬜ |
| Cookie inventory on all 3 public sites (BUG-125 evidence, prod) | ⬜ |
| BUG-127 pre-check: prod city values (expect ASCII until reseed) | ⬜ |

## Approved probes (user-approved 2026-07-17; clean up after)
| Probe | Result | Cleanup |
|---|---|---|
| QA-PROBE contact submission — landing | ⬜ | owner archives in admin |
| QA-PROBE contact submission — revery | ⬜ | owner archives in admin |
| Academy registration (disposable address) | ⬜ | owner removes student |
| Authenticated read-only prod-admin browse (creds from owner at Phase 7) | ⬜ | no saves |

## Owner-gated (re-confirm immediately before executing)
| Action | Status |
|---|---|
| BUG-127 prod reseed: bump tge-api VM →1GB, seed detached (nohup→logfile; do NOT use Windows `fly ssh -C`), restore 512MB, re-check diacritics | ⬜ awaiting gate |
