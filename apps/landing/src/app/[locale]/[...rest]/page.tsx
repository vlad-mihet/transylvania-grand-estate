import { notFound } from "next/navigation";

// Catch-all for unmatched paths *under* a locale prefix (e.g. /ro/garbage).
// Without it, Next falls through to the root app/not-found.tsx, which renders
// the locale-less multi-language fallback. Calling notFound() here routes the
// miss to [locale]/not-found.tsx so the visitor gets a clean, single-locale
// 404 with the site chrome. Still returns a 404 status.
export default function CatchAllNotFound() {
  notFound();
}
