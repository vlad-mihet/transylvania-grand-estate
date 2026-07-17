# Admin Sweep Matrix (Phase 3)

Stamps: ✅ pass · ⚠ pass-with-note · ❌ BUG-ref · ⏭ n/a (role has no access — verified 403/hidden) · ⬜ not yet run
Credentials: SUPER_ADMIN `admin@` (QaTest123!), EDITOR `editor@` (QaSweep123!), AGENT `agent@` (QaSweep123!). No seeded plain-ADMIN user — noted below.

## Tier A — full role pass
| Module | SUPER_ADMIN | EDITOR | AGENT |
|---|---|---|---|
| Properties (list/create/edit/images/delete) | ⚠ list/create/edit pass (BUG-114/115/116; images→Phase 5, delete→end of pass) | ⬜ | ⬜ (own only) |
| Inquiries kanban / my-inquiries | ⚠ pass (list+sheet+filters+archive; BUG-112/113) | ⬜ | ⬜ |
| People: team + invitations | ⬜ | ⬜ | ⬜ (403) |
| People: agents CRUD + invite | ⬜ | ⬜ | ⬜ (self only) |
| Settings / users mgmt | ⬜ | ⬜ | ⬜ (403) |
| Academy: courses/lessons | ⬜ | ⬜ | ⬜ (403) |
| Academy: students/invitations | ⬜ | ⬜ (manage=ADMIN+) | ⬜ (403) |

## Tier B — SUPER_ADMIN functional + AGENT 403 + EDITOR spot
| Module | SUPER_ADMIN | EDITOR spot | AGENT 403/hidden |
|---|---|---|---|
| Dashboard | ⚠ pass (KPIs vs DB verified; BUG-111 label) | ⬜ | ⬜ (redirect my-listings) |
| Bank rates CRUD | ⬜ | ⬜ | ⬜ |
| Financial indicators | ⬜ | ⬜ | ⬜ |
| Testimonials CRUD | ⬜ | ⬜ | ⬜ |
| Developers CRUD | ⬜ | ⬜ | ⬜ |
| Counties CRUD | ⬜ | ⬜ | ⬜ |
| Cities CRUD + per-brand heroes | ⬜ | ⬜ | ⬜ |
| Brand visibility | ⬜ | ⬜ | ⬜ |
| Articles + content hub / locale meter | ⬜ | ⬜ | ⬜ |
| Audit logs | ❌ BUG-117 (page renders + filters/CSV present, but no mutation is ever audited) | ⬜ | ⬜ |

## Tier C — every-role smoke
| Surface | SUPER_ADMIN | EDITOR | AGENT |
|---|---|---|---|
| Profile | ⬜ | ⬜ | ⬜ |
| 403 page | ⬜ | ⬜ | ⬜ |
| Forgot/reset password | ⬜ (one flow, any role) | | |
| Accept-invite | ⬜ (via Phase 3 invite flows) | | |

## Cross-cutting
- ⬜ Two-tab refresh-token race
- ⬜ Dirty-form in-app nav (documents BUG-107 behavior)
- ⬜ BFF conduct across API restart
- ⬜ AGENT direct-URL probes (~6 URLs) + curl PATCH foreign property
- ⬜ i18n spot-check (en) on 2–3 modules
- ⬜ Audit-log entry appears after each Tier A/B mutation (checked in module passes)
