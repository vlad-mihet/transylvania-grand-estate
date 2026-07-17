# Admin Delta Matrix — verify-sweep-2026-07 (Phase 3)

Stamps: ✅ pass · ⚠ pass-with-note · ❌ BUG-ref · ⏭ n/a (role has no access — verified 403/hidden) · ⬜ not yet run
Built as a **delta** over `.qa/full-sweep-2026-07/admin-matrix.md`: every prior ⬜ cell, every prior ❌ re-verified post-fix, deep-CRUD where prior pass was list-render-only, plus modules the prior matrix never listed. Prior-green cells are re-probed only where marked.
Credentials: recorded in run.md Phase 0 (seed fixtures; no seeded plain-ADMIN user — carried note from prior sweep).

## A — EDITOR full pass (entire column was ⬜ last sweep)
| Surface | EDITOR | Notes |
|---|---|---|
| Login + dashboard | ⬜ | |
| Properties list/create/edit | ⬜ | confirm intended permission level (create? edit? read-only?) |
| Articles CRUD + publish/unpublish | ⬜ | core EDITOR surface |
| Content hub + locale meter | ⬜ | core EDITOR surface |
| Testimonials CRUD | ⬜ | |
| Inquiries | ⬜ | |
| Academy courses/lessons | ⬜ | prior note: manage=ADMIN+ for students |
| Forbidden: people/team, settings, audit-logs, bank-rates | ⬜ | expect 403/hidden |

## B — Deep-CRUD on previously list-render-only modules (SUPER_ADMIN)
| Surface | Stamp | Cross-app verification |
|---|---|---|
| Bank rates: create/edit/delete a rate | ⬜ | new rate appears in revery mortgage-calculator chips |
| Financial indicators: edit value | ⬜ | revery calculators pick up new value |
| Testimonials: create/edit/delete | ⬜ | appears/disappears on landing |
| Developers: create + logo upload + edit | ⬜ | appears on landing/revery developers pages |
| Counties: create/rename/delete | ⬜ | cities filter reflects |
| Cities: create + per-brand hero upload round-trip | ⬜ | hero renders on correct brand site only |
| Brand visibility: actual curation (feature/reorder) | ⬜ | public-site order changes |
| Articles: publish → landing 200; unpublish → 404 | ⬜ | BUG-109 UI-level |
| Properties: multi-image upload (files[]) | ⬜ | gallery on public site |
| Properties: delete flow + confirmation | ⬜ | gone from public list |
| Properties: zero-image property | ⬜ | landing renders gracefully (legacy Blocker #1 area) |

## C — Never-matrixed modules (SUPER_ADMIN + EDITOR spot)
| Surface | SUPER_ADMIN | EDITOR |
|---|---|---|
| Catalog | ⬜ | ⬜ |
| Finance | ⬜ | ⬜ |
| Locations | ⬜ | ⬜ |
| Settings page (itself) | ⬜ | ⏭ expect 403 |
| Academy students: invite → accept → listed | ⬜ | ⏭ manage=ADMIN+ |
| People: agents CRUD + invite (prior ⬜) | ⬜ | ⏭ |

## D — Tier C every-role smoke (all ⬜ last sweep)
| Surface | SUPER_ADMIN | EDITOR | AGENT |
|---|---|---|---|
| Profile | ⬜ | ⬜ | ⬜ |
| 403 page renders | ⬜ | ⬜ | ⬜ |
| Forgot/reset password round-trip | ⬜ (one role) | | |
| Accept-invite round-trip (EDITOR invite) | ⬜ | | |

## E — Re-verify prior ❌ (post-fix, first real-data pass)
| Surface | Stamp | Notes |
|---|---|---|
| Audit-logs page: rows for fresh mutations + paginate/filter/CSV export | ⬜ | BUG-117 fixed; page never had real data before |
| People/team list + KPI | ⬜ | BUG-118 fixed |

## F — Cross-cutting
| Check | Stamp |
|---|---|
| Two-tab refresh-token race (prior ⬜) | ⬜ |
| AGENT quick re-probe: 6 forbidden URLs → 403; foreign PATCH 403 / own 200 | ⬜ |
| Console clean throughout (zero IntlError bar) | ⬜ |
