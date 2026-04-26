"use client";

import { useMe } from "./queries";

/**
 * Semantic alias over `useMe` — a call like `useSession()` reads more
 * naturally at the call site than `useMe()`, and keeps the pages decoupled
 * from the specific query key / hook so we can later swap to a proper
 * context-backed session if refresh tokens move to an HttpOnly cookie.
 */
export function useSession() {
  const me = useMe();
  return {
    profile: me.data ?? null,
    isLoading: me.isLoading,
    isAuthenticated: !!me.data,
    error: me.error,
    refetch: me.refetch,
  };
}
