"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

const SESSION_KEY = "tge.entryLocale";
const URL_PARAM = "loc";

interface EntryLocaleContextValue {
  active: LocaleKey;
  setActive: (locale: LocaleKey) => void;
  available: readonly LocaleKey[];
  primary: LocaleKey;
}

const EntryLocaleContext = createContext<EntryLocaleContextValue | null>(null);

interface EntryLocaleProviderProps {
  children: ReactNode;
  available?: readonly LocaleKey[];
}

function readSession(): LocaleKey | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(SESSION_KEY);
    return isLocaleKey(value) ? value : null;
  } catch {
    return null;
  }
}

function writeSession(locale: LocaleKey) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, locale);
  } catch {
    // sessionStorage can be unavailable (private mode, quota); silently skip.
  }
}

export function EntryLocaleProvider({
  children,
  available = LOCALE_KEYS,
}: EntryLocaleProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlLocale = searchParams.get(URL_PARAM);

  // The URL param is the source of truth. Derive `active` from it during
  // render so we never call setState in an effect.
  const active: LocaleKey =
    isLocaleKey(urlLocale) && available.includes(urlLocale)
      ? urlLocale
      : PRIMARY_LOCALE;

  const setActive = useCallback(
    (next: LocaleKey) => {
      if (!available.includes(next)) return;
      writeSession(next);
      const params = new URLSearchParams(searchParams.toString());
      params.set(URL_PARAM, next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams, available],
  );

  // On mount, if the URL has no `loc` param, hydrate it from sessionStorage
  // (or leave it at the primary). This is a one-shot URL sync — not a state
  // sync — so it doesn't trigger cascading renders.
  useEffect(() => {
    if (isLocaleKey(urlLocale) && available.includes(urlLocale)) return;
    const session = readSession();
    if (session && available.includes(session) && session !== PRIMARY_LOCALE) {
      const params = new URLSearchParams(searchParams.toString());
      params.set(URL_PARAM, session);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
    // Run only once on mount; subsequent locale changes go through `setActive`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<EntryLocaleContextValue>(
    () => ({ active, setActive, available, primary: PRIMARY_LOCALE }),
    [active, setActive, available],
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
