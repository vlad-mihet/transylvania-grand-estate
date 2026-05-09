export type LocaleKey = "ro" | "en" | "fr" | "de";

export const LOCALE_KEYS: readonly LocaleKey[] = ["ro", "en", "fr", "de"] as const;
export const PRIMARY_LOCALE: LocaleKey = "ro";

export const LOCALE_LABELS: Record<LocaleKey, string> = {
  ro: "RO",
  en: "EN",
  fr: "FR",
  de: "DE",
};

export type LocaleStatus = "filled" | "partial" | "missing" | "error";

export type LocaleCompleteness = Record<LocaleKey, LocaleStatus>;

export type LocaleErrorCounts = Partial<Record<LocaleKey, number>>;

export function isLocaleKey(value: unknown): value is LocaleKey {
  return value === "ro" || value === "en" || value === "fr" || value === "de";
}

export function isFilled(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
