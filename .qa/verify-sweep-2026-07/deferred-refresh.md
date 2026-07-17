# Deferred-Items Refresh — verify-sweep-2026-07 (Phase 6)

Base: `.qa/full-sweep-2026-07/deferred-audit.md`. Only rows whose state changed get detail;
unchanged rows get a one-line "unchanged, still correctly deferred" stamp with the check performed.

| Item | Prior state | This sweep check | Result |
|---|---|---|---|
| Licensed city images Phase 2 (docs/city-hero-images-phase2.md) | external-blocked (owner purchases) | slots count + no new unlicensed additions | ⬜ |
| Academy phases 4–6 (quizzes/certs/discussions) | designed, not built, no UI leakage | grep for half-wired leakage | ⬜ |
| TGE logo lockups | ready, not wired (client decision) | wordmark still intact on landing | ⬜ |
| Revery fr/de human translation pass | deferred (translator) | structural spot only (Phase 4) | ⬜ |
| REBS CRM sync go-live (docs/rebs-sync-go-live.md) | owner-reconcile (key/flags) | config-only check; sync disabled this sweep | ⬜ |
| Contact-flow prod checklist rows (Fly secrets/DNS/Resend/legal) | owner tasks | recheck which rows closed since | ⬜ |
| BUG-127 prod reseed | open, owner-gated | executed at Phase 7 gate (or re-deferred) | ⬜ |

## Owner-decision list (accumulates during sweep; final version goes in PR body)
_(pending)_
