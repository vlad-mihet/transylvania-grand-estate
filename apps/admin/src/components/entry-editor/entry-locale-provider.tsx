"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LOCALE_KEYS,
  PRIMARY_LOCALE,
  isLocaleKey,
  type LocaleKey,
} from "./types";

const URL_PARAM_ACTIVE = "loc";
const URL_PARAM_COMPARE = "cmp";

interface EntryLocaleContextValue {
  /** The locale currently being edited (or shown in the left pane in compare mode). */
  active: LocaleKey;
  setActive: (locale: LocaleKey) => void;
  /**
   * When non-null, compare mode is active: the editor renders two columns,
   * left bound to `active`, right bound to `compareLocale`. Use
   * `setCompareLocale(null)` to exit compare mode.
   */
  compareLocale: LocaleKey | null;
  setCompareLocale: (locale: LocaleKey | null) => void;
  available: readonly LocaleKey[];
  primary: LocaleKey;
}

const EntryLocaleContext = createContext<EntryLocaleContextValue | null>(null);

interface EntryLocaleProviderProps {
  children: ReactNode;
  available?: readonly LocaleKey[];
}

export function EntryLocaleProvider({
  children,
  available = LOCALE_KEYS,
}: EntryLocaleProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlActive = searchParams.get(URL_PARAM_ACTIVE);
  const urlCompare = searchParams.get(URL_PARAM_COMPARE);

  // The URL is the source of truth. Derive `active` and `compareLocale`
  // during render so we never call setState in an effect.
  const active: LocaleKey =
    isLocaleKey(urlActive) && available.includes(urlActive)
      ? urlActive
      : PRIMARY_LOCALE;

  const compareLocale: LocaleKey | null =
    isLocaleKey(urlCompare) &&
    available.includes(urlCompare) &&
    urlCompare !== active
      ? urlCompare
      : null;

  const pushParams = useCallback(
    (next: { active: LocaleKey; compareLocale: LocaleKey | null }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.active === PRIMARY_LOCALE) {
        params.delete(URL_PARAM_ACTIVE);
      } else {
        params.set(URL_PARAM_ACTIVE, next.active);
      }
      if (next.compareLocale === null) {
        params.delete(URL_PARAM_COMPARE);
      } else {
        params.set(URL_PARAM_COMPARE, next.compareLocale);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const setActive = useCallback(
    (locale: LocaleKey) => {
      if (!available.includes(locale)) return;
      // If we'd collide with compareLocale, drop the compare pane.
      const nextCompare = compareLocale === locale ? null : compareLocale;
      pushParams({ active: locale, compareLocale: nextCompare });
    },
    [pushParams, available, compareLocale],
  );

  const setCompareLocale = useCallback(
    (locale: LocaleKey | null) => {
      if (locale !== null && !available.includes(locale)) return;
      if (locale === active) return; // can't compare a locale with itself
      pushParams({ active, compareLocale: locale });
    },
    [pushParams, available, active],
  );

  // No cross-entity locale persistence: the URL `loc` param is the sole source
  // of truth, so a fresh form always opens on the primary locale unless the URL
  // says otherwise. (Previously a sessionStorage resume leaked the last-edited
  // locale from one entity's form into the next — BUG-206.)

  const value = useMemo<EntryLocaleContextValue>(
    () => ({
      active,
      setActive,
      compareLocale,
      setCompareLocale,
      available,
      primary: PRIMARY_LOCALE,
    }),
    [active, setActive, compareLocale, setCompareLocale, available],
  );

  return (
    <EntryLocaleContext.Provider value={value}>
      {children}
    </EntryLocaleContext.Provider>
  );
}

export function useEntryLocale(): EntryLocaleContextValue {
  const ctx = useContext(EntryLocaleContext);
  if (!ctx) {
    throw new Error(
      "useEntryLocale must be used within an EntryLocaleProvider. " +
        "Wrap your editor in <EntryLocaleProvider>.",
    );
  }
  return ctx;
}
