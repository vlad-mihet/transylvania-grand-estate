"use client";

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ApiError, setAccessToken } from "@/lib/api-client";
import { qk } from "@/hooks/query-keys";
import type { Profile } from "@/hooks/queries";

/**
 * On a terminal 401 (i.e. refresh also failed, per `apiFetch`'s built-in
 * retry), drop tokens and send the user to login with a `returnTo` pointing
 * at where they were. This is the single centralized 401 handler; pages no
 * longer re-implement the check.
 */
function handleTerminal401(error: unknown) {
  if (!(error instanceof ApiError) || error.status !== 401) return;
  if (typeof window === "undefined") return;
  setAccessToken(null);
  const current = `${window.location.pathname}${window.location.search}`;
  const segments = window.location.pathname.split("/").filter(Boolean);
  const locale = segments[0] && /^[a-z]{2}$/.test(segments[0]) ? segments[0] : "ro";
  // Avoid redirect loops when already on /login.
  if (window.location.pathname.includes("/login")) return;
  window.location.assign(
    `/${locale}/login?returnTo=${encodeURIComponent(current)}`,
  );
}

/**
 * Module-level dedupe for `/api/auth/refresh`. React StrictMode mounts every
 * effect twice in dev; without this lock both fire `restoreSession()` in
 * parallel, the first rotates the jti, the second sees a revoked jti and
 * 401s — kicking the user out. Sharing the in-flight promise across mounts
 * collapses the race to one network call. (Mirrors the dedup inside
 * `apiFetch`'s 401 retry, but for the on-mount restore path.)
 */
let inflightRestore: Promise<{
  accessToken: string;
  user: Profile;
} | null> | null = null;

async function restoreSession() {
  if (inflightRestore) return inflightRestore;
  inflightRestore = (async () => {
    try {
      const res = await fetch("/api/auth/refresh", { method: "POST" });
      if (!res.ok) return null;
      return (await res.json()) as { accessToken: string; user: Profile };
    } catch {
      return null;
    } finally {
      setTimeout(() => {
        inflightRestore = null;
      }, 0);
    }
  })();
  return inflightRestore;
}

const SessionContext = createContext<{ isRestoring: boolean }>({
  isRestoring: true,
});

/**
 * `true` while the on-mount session restore is still in flight. Hooks that
 * want to avoid showing a "logged out" state during the restore window
 * (auth guard redirect, useSession.isLoading) should consult this rather
 * than just checking the access token, which is null until restore lands.
 */
export function useSessionRestoring(): boolean {
  return useContext(SessionContext).isRestoring;
}

function SessionRestorer({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    let cancelled = false;
    restoreSession()
      .then((data) => {
        if (cancelled) return;
        if (data) {
          setAccessToken(data.accessToken);
          qc.setQueryData(qk.me(), data.user);
        }
      })
      .finally(() => {
        if (!cancelled) setIsRestoring(false);
      });
    return () => {
      cancelled = true;
    };
  }, [qc]);

  return (
    <SessionContext.Provider value={{ isRestoring }}>
      {children}
    </SessionContext.Provider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
        queryCache: new QueryCache({ onError: handleTerminal401 }),
        mutationCache: new MutationCache({ onError: handleTerminal401 }),
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <SessionRestorer>{children}</SessionRestorer>
    </QueryClientProvider>
  );
}
