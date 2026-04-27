export const locales = ["ro", "en", "fr", "de"] as const;
export const defaultLocale = "ro" as const;
export type Locale = (typeof locales)[number];

// Autonyms — each locale rendered in its own language. Canonical pattern for
// locale switchers (Wikipedia, Google): a user stuck in the wrong locale can
// recognise their target without first having to translate the menu.
//
// `as const satisfies` keeps the literal types ("Română" | "English" | ...)
// while enforcing exhaustive coverage of every Locale at compile time —
// adding a locale to `locales` without extending this map is a build error.
export const localeAutonyms = {
  ro: "Română",
  en: "English",
  fr: "Français",
  de: "Deutsch",
} as const satisfies Record<Locale, string>;
