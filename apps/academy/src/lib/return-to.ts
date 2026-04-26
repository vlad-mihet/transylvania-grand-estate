/**
 * Allowlist validator for post-login `returnTo` destinations. Raw strings
 * from query params or OAuth fragments can't be trusted (open redirect),
 * and the typed next-intl router only accepts declared pathnames anyway —
 * so we match against a known set of internal academy routes and return
 * the shape the typed router wants.
 *
 * Returns `null` for anything that doesn't cleanly match a known path.
 * Callers should fall back to `/` in that case.
 */

const SLUG_RE = /^[a-z0-9-]+$/;

export type ValidatedReturnTo =
  | { pathname: "/" }
  | { pathname: "/catalog" }
  | { pathname: "/account" }
  | { pathname: "/courses/[slug]"; params: { slug: string } }
  | {
      pathname: "/courses/[slug]/[lessonSlug]";
      params: { slug: string; lessonSlug: string };
    };

export function validateReturnTo(
  raw: string | null | undefined,
): ValidatedReturnTo | null {
  if (!raw) return null;
  // Reject external URLs and protocol-relative tricks.
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("//") ||
    raw.startsWith("\\")
  ) {
    return null;
  }
  // Strip any query/fragment — the returnTo is a path only.
  const path = raw.split("?")[0]?.split("#")[0] ?? "";
  if (!path.startsWith("/")) return null;

  // Drop a leading locale segment if present — we re-stamp the active
  // locale via the typed router.
  const segments = path.split("/").filter(Boolean);
  const rest =
    segments[0] && /^[a-z]{2}$/.test(segments[0])
      ? segments.slice(1)
      : segments;

  if (rest.length === 0) return { pathname: "/" };
  if (rest.length === 1 && rest[0] === "catalog") return { pathname: "/catalog" };
  if (rest.length === 1 && rest[0] === "account") return { pathname: "/account" };

  if (rest.length === 2 && rest[0] === "courses") {
    const slug = rest[1];
    if (slug && SLUG_RE.test(slug)) {
      return { pathname: "/courses/[slug]", params: { slug } };
    }
  }
  if (rest.length === 3 && rest[0] === "courses") {
    const slug = rest[1];
    const lessonSlug = rest[2];
    if (slug && lessonSlug && SLUG_RE.test(slug) && SLUG_RE.test(lessonSlug)) {
      return {
        pathname: "/courses/[slug]/[lessonSlug]",
        params: { slug, lessonSlug },
      };
    }
  }
  return null;
}
