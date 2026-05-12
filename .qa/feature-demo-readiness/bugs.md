# Bug Report — Pre-Demo Admin Readiness

End-to-end QA gate before live demo. Format mirrors `.qa/feature-landing/bugs.md`. Each bug gets a unique `BUG-###` id assigned in order of discovery.

**Severity rubric:**
- **Blocker** — demo cannot proceed; data loss, auth broken, brand-isolation leak, admin save fails silently
- **Critical** — golden path broken on a demo-flow surface (a step in `run.md` Domain A–F doesn't work)
- **Major** — feature works but with visible defect (wrong copy, missing image, off-by-one)
- **Minor** — cosmetic, edge-case, non-default locale
- **Trivial** — typos, console warnings

## Bug counts (live tally)
| Severity | Count |
|----------|-------|
| Blocker | 0 |
| Critical | 0 |
| Major | 0 |
| Minor | 1 |
| Trivial | 0 |

---

### BUG-001 — `GET /articles/:slug` does not filter by `status=published` (drafts visible to public callers)
- **Severity:** Minor (no current user-facing impact; flagged for defense-in-depth)
- **App/Area:** api / `apps/api/src/articles/articles.service.ts:46`
- **Phase:** Playwright (articles.spec.ts development)
- **Environment:** local, branch `feat/contact-flow-prod-readiness`
- **Steps to reproduce:**
  1. Create a draft article via admin: `POST /api/v1/articles` (status defaults to `draft`).
  2. Note the slug.
  3. As a Revery consumer: `curl -H 'X-Site: REVERY' http://localhost:4000/api/v1/articles/<slug>`.
- **Expected:** 404 (draft not visible) or 200 with `status=published` only.
- **Actual:** 200 with the full draft body, including `status: "draft"` and `publishedAt: null`.
- **Suspected cause:** `findBySlug` in `articles.service.ts:46` does a plain `findUnique({ where: { slug } })` with no status filter. The list endpoint at `apps/api/src/articles/articles.controller.ts:27` DOES support `?status=published` filtering, and consumer apps (Revery `/blog`) use the list endpoint exclusively — so there's no current real-world leak. But anyone with a draft slug can dig out unpublished content via the slug-detail route.
- **Suggested fix:** Add a status filter to the public `findBySlug` (return 404 when `status !== 'published'`) and split a separate `findBySlugForEditor` (already exists at line 67) for admin reads. Mirror what `properties.service.ts:597` does with `assertTierInScope` — apply a similar `assertPublishedForPublic` gate.
- **Workaround in tests:** The Playwright fixture `findArticleBySlug` (`apps/admin/tests/e2e/_fixtures/api.ts`) treats non-`published` responses as null to match consumer-visible semantics.

---

<!-- Bugs appended below as discovered. Template:

### BUG-XXX — One-line summary
- **Severity:** Blocker | Critical | Major | Minor | Trivial
- **App/Area:** admin / landing / revery / academy / api
- **Phase:** Domain A | B | C | D | E | F | Cross-cutting | Playwright
- **Environment:** local, branch, commit
- **Steps to reproduce:**
  1.
  2.
- **Expected:**
- **Actual:**
- **Suspected cause:**
- **Evidence:** (URLs, curl output, screenshots)
- **Suggested fix:**

-->
