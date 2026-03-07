export const locales = ["en", "ro", "fr", "de"] as const;
export const defaultLocale = "ro" as const;
export type Locale = (typeof locales)[number];
