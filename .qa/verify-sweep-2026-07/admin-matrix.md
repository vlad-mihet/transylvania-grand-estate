# Admin Delta Matrix — verify-sweep-2026-07 (Phase 3)

Stamps: ✅ pass · ⚠ pass-with-note · ❌ BUG-ref · ⏭ n/a (403/hidden verified) · ⬜ not run
Delta over `.qa/full-sweep-2026-07/admin-matrix.md`. Credentials in run.md Phase 0.
Browser-driven (Claude in Chrome), console/network tapped throughout.

## A — EDITOR full pass (was entirely ⬜)
| Surface | EDITOR | Notes |
|---|---|---|
| Login + dashboard | ✅ | invite round-trip login lands `/ro` as EDITOR; dashboard KPIs render |
| Properties list/create/edit | ✅ list (97) | can view/list; create not blocked at nav — permission depth not exhaustively pushed |
| Articles list | ✅ | full articles list renders (8) |
| Content hub | ✅ | renders |
| Testimonials | ✅ | renders |
| Inquiries (Cereri) | ❌ **BUG-208** | nav+KPI+widget exposed but every `/inquiries` API call → 403; page = dead error card |
| Audit logs | ❌ **BUG-209** | EDITOR reads full audit trail (API 200) — RBAC exposure, owner confirm |
| Financial indicators | ⚠ | renders + shows "Sincronizează" write CTA to EDITOR (BUG-209 note) |
| Bank rates | ✅ | list renders; create button correctly hidden |
| Forbidden: people/team, settings, brand-visibility | ⏭ | all → `/ro/403` correctly |

## B — Deep-CRUD on previously list-only modules (SUPER_ADMIN)
| Surface | Stamp | Evidence |
|---|---|---|
| Bank rates: create | ✅ | "QA Sweep Bank" created (5.55%, ord 7), "Dobândă creată" |
| Financial indicators | ✅ | EUR/RON 5.2359 + sync CTA render (edit not mutated) |
| Testimonials: create | ✅ | "QA Sweep Client" created (RO+EN quote req enforced — EN validation gate) |
| Developers | ⚠ render | list + create form exist (logo upload not exercised; prior sweep ✅) |
| Counties | ⚠ **BUG-210** | list/CRUD renders (42); per-county PROPRIETĂȚI count = 0 (unwired) |
| Cities: per-brand hero | ✅ (prior) | prior sweep verified base+TGE+brand override on Cluj |
| Brand visibility: curation | ✅ | added Cluj→Save materialized 18-city ordered rotation; **landing homepage led with cluj-napoca** (cross-app confirmed); reset to default after |
| Articles: publish/unpublish | ❌ **BUG-207** | unpublish→revery/blog 404 + gone from list (BUG-109 holds); but "Publică" CTA silently fails to publish |
| Properties: multi-image upload | ✅ | 2 PNGs via files[] → both persisted, "Proprietate actualizată" |
| Properties: zero-image render | ❌ **BUG-205** | image-less property → landing detail 500 (`images[0].src`) |
| Properties: create (full) | ⚠ **BUG-206** | created but hit default-0/year + sticky-locale traps |

## C — Never-matrixed modules (SUPER_ADMIN)
| Surface | Stamp |
|---|---|
| Catalog | ✅ renders (Proprietăți/dezvoltatori/testimoniale hub) |
| Finance | ✅ renders (Dobânzi + indicatori hub) |
| Content | ✅ renders (articole/cursuri/traduceri hub) |
| Locations | ✅ renders (județe/orașe/brand pages hub) |
| Settings (page) | ✅ renders (company info, 4-locale tagline/description form) |
| Academy students | ✅ renders (own workspace, empty state, invite+CSV) |
| Academy invitations | ✅ renders (via /invitations Academy tab) |

## D — Tier C every-role smoke (was all ⬜)
| Surface | Stamp |
|---|---|
| Profile (SUPER_ADMIN) | ✅ renders ("Niciun agent legat" state) |
| Profile (AGENT) | ✅ in nav |
| 403 page | ✅ renders (RO copy, "Înapoi la panou") for EDITOR+AGENT forbidden routes |
| Forgot/reset password round-trip | ✅ EDITOR: forgot → email link → reset → auto-login |
| Accept-invite round-trip | ✅ EDITOR invite → email (RO team copy, BUG-120 holds) → set password → login |

## E — Re-verify prior ❌
| Surface | Stamp |
|---|---|
| Audit-logs page (real data) | ✅ | rows for PROPERTY.CREATE/DELETE, USER.LOGIN, INQUIRY.CREATE w/ brand; filters+CSV+diff (BUG-117 holds) |
| People/team list | ❌ **BUG-202** | still silently empty (`expand=allLocales` 400) — BUG-118 regressed |

## F — Cross-cutting
| Check | Stamp |
|---|---|
| Two-tab refresh race | ⬜ deferred (lower value; refresh-token e2e green in Phase 1) |
| AGENT re-probe | ✅ | my-listings scoped (7), my-inquiries scoped (2, after property_slug set); team/audit → 403; API: foreign PATCH 403, own PATCH 200, users 403, audit 403 |
| Console clean (zero IntlError) | ✅ | zero IntlError/MISSING across all pages walked |
| Sidebar unread badge | ✅ | Cereri 31→30 after mark-read (BUG-121 holds) |

## Phase 3 findings: BUG-202,205,206,207,208,209,210 (+203 broadened). Matrix substantially complete; zero remaining high-value ⬜.
