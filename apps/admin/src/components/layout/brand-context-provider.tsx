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

/**
 * Three-state brand context: `all` (admin sees every row), `tge`, `revery`.
 * Persists in `?brand=` so deep links work, with sessionStorage as fallback
 * across navigation.
 */
export type BrandContext = "all" | "tge" | "revery";

const SESSION_KEY = "tge.adminBrandFilter";
const URL_PARAM = "brand";

const BRAND_VALUES: readonly BrandContext[] = ["all", "tge", "revery"] as const;

function isBrandContext(value: string | null): value is BrandContext {
  return value !== null && (BRAND_VALUES as readonly string[]).includes(value);
}

interface BrandContextValue {
  active: BrandContext;
  setActive: (next: BrandContext) => void;
  /**
   * Brand value to forward to API queries — `undefined` for `all` so the
   * server-side filter is skipped, brand string otherwise.
   */
  apiBrand: "tge" | "revery" | undefined;
}

const Ctx = createContext<BrandContextValue | null>(null);

function readSession(): BrandContext | null {
  if (typeof window === "undefined") return null;
  try {
    return isBrandContext(window.sessionStorage.getItem(SESSION_KEY))
      ? (window.sessionStorage.getItem(SESSION_KEY) as BrandContext)
      : null;
  } catch {
    return null;
  }
}

function writeSession(brand: BrandContext) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, brand);
  } catch {
    // sessionStorage can be unavailable (private mode, quota); silently skip.
  }
}

export function BrandContextProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlBrand = searchParams.get(URL_PARAM);

  // URL is the source of truth so the back button + deep links work without
  // an effect-driven state copy.
  const active: BrandContext = isBrandContext(urlBrand) ? urlBrand : "all";

  const setActive = useCallback(
    (next: BrandContext) => {
      writeSession(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "all") params.delete(URL_PARAM);
      else params.set(URL_PARAM, next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  // One-shot URL hydration from sessionStorage when the URL is bare. After
  // this mount tick, `setActive` owns all transitions.
  useEffect(() => {
    if (isBrandContext(urlBrand)) return;
    const session = readSession();
    if (session && session !== "all") {
      const params = new URLSearchParams(searchParams.toString());
      params.set(URL_PARAM, session);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<BrandContextValue>(
    () => ({
      active,
      setActive,
      apiBrand: active === "all" ? undefined : active,
    }),
    [active, setActive],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBrandContext(): BrandContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error(
      "useBrandContext must be used within a BrandContextProvider",
    );
  }
  return ctx;
}
