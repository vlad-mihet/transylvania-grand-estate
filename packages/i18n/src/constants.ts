export const locales = ["ro", "en", "fr", "de"] as const;
export const defaultLocale = "ro" as const;
export type Locale = (typeof locales)[number];
