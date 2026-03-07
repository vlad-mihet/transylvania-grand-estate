import { Locale, LocalizedString } from "@tge/types";

const intlLocaleMap: Record<Locale, string> = {
  en: "en-US",
  ro: "ro-RO",
  fr: "fr-FR",
  de: "de-DE",
};

export function localize(str: LocalizedString, locale: Locale): string {
  return str[locale] ?? str.en;
}

export function formatPrice(price: number, locale: Locale = "en"): string {
  return new Intl.NumberFormat(intlLocaleMap[locale] ?? "en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatArea(area: number, locale: Locale = "en"): string {
  return `${new Intl.NumberFormat(intlLocaleMap[locale] ?? "en-US").format(area)} m²`;
}
