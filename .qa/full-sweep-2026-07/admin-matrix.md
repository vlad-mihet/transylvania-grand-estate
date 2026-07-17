# Admin Sweep Matrix (Phase 3)

Stamps: ✅ pass · ⚠ pass-with-note · ❌ BUG-ref · ⏭ n/a (role has no access — verified 403/hidden) · ⬜ not yet run
Credentials: SUPER_ADMIN `admin@` (QaTest123!), EDITOR `editor@` (QaSweep123!), AGENT `agent@` (QaSweep123!). No seeded plain-ADMIN user — noted below.

## Tier A — full role pass
| Module | SUPER_ADMIN | EDITOR | AGENT |
|---|---|---|---|
| Properties (list/create/edit/images/delete) | ⚠ list/create/edit pass (BUG-114/115/116; images→Phase 5, delete→end of pass) | ⬜ | ⬜ (own only) |
| Inquiries kanban / my-inquiries | ⚠ pass (list+sheet+filters+archive; BUG-112/113) | ⬜ | ⬜ |
| People: team + invitations | ❌ BUG-118 (list broken) / ✅ invite ADMIN/EDITOR works (BUG-120 email copy) | ⬜ | ✅ 403 |
| People: agents CRUD + invite | ⬜ | ⬜ | ✅ self only (my-listings) |
| Settings / users mgmt | ⬜ settings (BUG-118 users list) | ⬜ | ✅ 403 |
| Academy: courses/lessons | ✅ workspace + 4 courses + lesson table/reorder/stats/export render | ⬜ | ✅ 403 |
| Academy: students/invitations | ✅ list renders (0 students, fresh seed) | ⬜ (manage=ADMIN+) | ✅ 403 |

## Tier B — SUPER_ADMIN functional + AGENT 403 + EDITOR spot
| Module | SUPER_ADMIN | EDITOR spot | AGENT 403/hidden |
|---|---|---|---|
| Dashboard | ⚠ pass (KPIs vs DB verified; BUG-111 label) | ⬜ | ⬜ (redirect my-listings) |
| Bank rates CRUD | ✅ list renders (7 real banks, filters) | ⬜ | ✅ POST→404 |
| Financial indicators | ✅ EUR/RON 5.2359 + IRCC 5.58 render (calc inputs) | ⬜ | ⬜ |
| Testimonials CRUD | ✅ list renders (4, ratings/quotes) | ⬜ | ⬜ |
| Developers CRUD | ✅ list renders (4, promoted toggles, counts) | ⬜ | ⬜ |
| Counties CRUD | ✅ (dialog CRUD; 42 seeded, visible in cities filter) | ⬜ | ⬜ |
| Cities CRUD + per-brand heroes | ✅ list 46 + brand badges; **per-brand hero override UI works** (base+TGE+Adorys images on Cluj) | ⬜ | ⬜ |
| Brand visibility | ✅ renders (TGE+Revery curation panels, empty=default order by design) | ⬜ | ✅ /403 |
| Articles + content hub / locale meter | ✅ list + /articles/new + createHref (legacy P3-010 fixed); draft leak = BUG-109 (API) | ⬜ | ✅ /403 |
| Audit logs | ❌ BUG-117 (page renders + filters/CSV present, but no mutation is ever audited) | ⬜ | ⬜ |

## Tier C — every-role smoke
| Surface | SUPER_ADMIN | EDITOR | AGENT |
|---|---|---|---|
| Profile | ⬜ | ⬜ | ⬜ |
| 403 page | ⬜ | ⬜ | ⬜ |
| Forgot/reset password | ⬜ (one flow, any role) | | |
| Accept-invite | ⬜ (via Phase 3 invite flows) | | |

## AGENT parallel pass — ✅ PASS (security intact)
- Nav correctly narrowed to Astăzi / Cererile mele / Anunțurile mele / Profil.
- Direct-URL probes → all `/ro/403`: people/team, settings, audit-logs, articles, academy/courses, bank-rates (6/6).
- my-listings scoped to own 7 properties; my-inquiries scoped to own 2 (incl. the one on the QA-created property).
- Foreign-property edit URL renders "Proprietatea nu a fost găsită" (API GET→404) — no data leak; write blocked (API PATCH→403).
- API RBAC spot (agent token): PATCH foreign→403, GET foreign→404, PATCH own→200, /auth/users→403, /audit-logs→403, POST /bank-rates→404. All correct.
- Minor UX only: foreign edit route shows not-found rather than 403 (acceptable; noted, not filed).

## Cross-cutting
- ⬜ Two-tab refresh-token race
- ✅ Dirty-form in-app nav — confirmed BUG-107 (navigated away from dirty property form via sidebar, no guard prompt; beforeunload-only by design)
- ⚠ BFF conduct across API restart — observed during the watch-loop incident: API-down → admin mutations returned 503 + "Failed to fetch" toast; recovered cleanly once API rebound (no rebuild needed). Acceptable.
- ✅ AGENT direct-URL probes (6 URLs) + curl PATCH foreign property — see AGENT pass above
- ⚠ i18n spot-check (en) — property form literal-EN (BUG-106); missing keys Common.relations (BUG-114), inquiries.typeLabel.viewing (BUG-122); dashboard RO mislabel (BUG-111)
- ❌ Audit-log entry after mutations — BUG-117 (no entries ever written for resource mutations)
