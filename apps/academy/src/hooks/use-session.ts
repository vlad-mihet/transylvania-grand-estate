"use client";

import { useSessionRestoring } from "@/components/providers";
import { useMe } from "./queries";

/**
 * Semantic alias over `useMe` plus the SessionRestorer's restoring flag —
 * a call like `useSession()` reads more naturally at the call site than
 * `useMe()`, and folds in the on-mount-refresh-in-flight window so callers
 * don't render a "logged out" state during the brief restore round-trip.
 */
export function useSession() {
  const me = useMe();
  const isRestoring = useSessionRestoring();
  return {
    profile: me.data ?? null,
    // While the SessionRestorer is still in flight, `me.data` is null even
    // for a logged-in user, which would otherwise flash unauthenticated UI.
    // Treat that window as loading.
    isLoading: isRestoring || me.isLoading,
    isAuthenticated: !!me.data,
    error: me.error,
    refetch: me.refetch,
  };
}
