import { Locale } from "@/types/property";

export function formatPrice(price: number, locale: Locale = "en"): string {
  return new Intl.NumberFormat(locale === "ro" ? "ro-RO" : "en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatArea(area: number, locale: Locale = "en"): string {
  return `${new Intl.NumberFormat(locale === "ro" ? "ro-RO" : "en-US").format(area)} m²`;
}
