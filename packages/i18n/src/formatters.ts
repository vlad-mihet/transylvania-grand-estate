"use client";

import { useLocale } from "next-intl";
import { localeMetadata, type Locale } from "@tge/locale";

/**
 * Currency formatter with project defaults. Defaults to the locale's
 * `defaultCurrency` from `localeMetadata` (currently EUR for every
 * supported locale) and renders without decimals for round real-estate
 * prices. Callers override per-row when a Property carries an explicit
 * `currency` column.
 *
 * Usage:
 *   const formatPrice = useFormatCurrency();
 *   <span>{formatPrice(property.price, property.currency)}</span>
 *
 * Output examples (locale-driven grouping + symbol placement):
 *   RO: `1 250 000 €`
 *   EN: `€1,250,000`
 *   FR: `1 250 000 €`
 *   DE: `1.250.000 €`
 *
 * Implementation note: we use native `Intl.NumberFormat` rather than
 * next-intl's `useFormatter` because next-intl narrows the options shape
 * to its own internal types (no `numberingSystem`, restricted
 * `timeZoneName`, etc.). The native API works the same way and lets us
 * pass any `Intl.NumberFormatOptions` field through unchanged.
 */
export function useFormatCurrency(): (
  value: number,
  currency?: string,
) => string {
  const locale = useLocale() as Locale;
  const tag = localeMetadata[locale].bcp47;
  return (value: number, currency?: string) => {
    const code = currency ?? localeMetadata[locale].defaultCurrency;
    return new Intl.NumberFormat(tag, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(value);
  };
}

/**
 * Date formatter — defaults to `dateStyle: "long"` for content surfaces
 * ("15 May 2026" / "15 mai 2026"). Pass explicit options to override.
 * Accepts `Date`, ISO string, or epoch milliseconds.
 */
export function useFormatDate(): (
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
) => string {
  const locale = useLocale() as Locale;
  const tag = localeMetadata[locale].bcp47;
  return (value, options) => {
    const date =
      value instanceof Date
        ? value
        : typeof value === "string"
          ? new Date(value)
          : new Date(value);
    return new Intl.DateTimeFormat(tag, options ?? { dateStyle: "long" }).format(
      date,
    );
  };
}

/**
 * Number formatter — locale-aware grouping + decimal handling.
 * `formatNumber(1234.5)` → "1.234,5" in DE, "1 234,5" in RO,
 * "1,234.5" in EN.
 */
export function useFormatNumber(): (
  value: number,
  options?: Intl.NumberFormatOptions,
) => string {
  const locale = useLocale() as Locale;
  const tag = localeMetadata[locale].bcp47;
  return (value, options) => new Intl.NumberFormat(tag, options).format(value);
}
