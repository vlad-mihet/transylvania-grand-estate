"use client";

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { ApiError, clearTokens } from "@/lib/api-client";

/**
 * On a terminal 401 (i.e. refresh also failed, per `apiFetch`'s built-in
 * retry), drop tokens and send the user to login with a `returnTo` pointing
 * at where they were. This is the single centralized 401 handler; pages no
 * longer re-implement the check.
 */
function handleTerminal401(error: unknown) {
  if (!(error instanceof ApiError) || error.status !== 401) return;
  if (typeof window === "undefined") return;
  clearTokens();
  const current = `${window.location.pathname}${window.location.search}`;
  const segments = window.location.pathname.split("/").filter(Boolean);
  const locale = segments[0] && /^[a-z]{2}$/.test(segments[0]) ? segments[0] : "ro";
  // Avoid redirect loops when already on /login.
  if (window.location.pathname.includes("/login")) return;
  window.location.assign(
    `/${locale}/login?returnTo=${encodeURIComponent(current)}`,
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
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
