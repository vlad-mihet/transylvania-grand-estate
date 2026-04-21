/**
 * Brand + app constants. Single source of truth for the admin surface so
 * auth pages, metadata, and support CTAs don't each hand-type the name.
 */
export const BRAND = {
  /** Wordmark shown in page headers, footer copyright, metadata. */
  name: "Transylvania Grand Estate",
  /** Terminal-flavoured shortcut (copper tile, compact contexts). */
  shortName: "TGE",
  /** Descriptor that follows the wordmark in tab titles + meta. */
  productName: "Admin",
  /** Operator inbox — access requests, invitation support, password resets. */
  supportEmail: "admin@tge.ro",
  /** Public brand URL. */
  orgUrl: "https://tge.ro",
} as const;

/** Build-time app version — `NEXT_PUBLIC_APP_VERSION` is set by CI. */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

/** `mailto:` target used by the "Need access" link on auth pages. */
export function supportMailto(subject: string): string {
  return `mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(subject)}`;
}
