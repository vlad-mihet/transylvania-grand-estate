"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { setAccessToken } from "@/lib/api-client";
import {
  can as checkCan,
  type Action,
  type AdminRole,
  type OwnershipResource,
} from "@/lib/permissions";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  /** Populated when the user's role is "AGENT" — links to a sales-agent record. */
  agentId?: string | null;
}

/**
 * Thrown by `login()` so callers can branch on HTTP status (429 for rate-
 * limit) without sniffing the message string.
 */
export class AuthError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  can: (action: Action, resource?: OwnershipResource) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Module-level dedupe for `/api/auth/refresh`. React StrictMode in dev
 * mounts every component twice (mount → unmount → mount), so without this
 * lock both effects fire `restore()` in parallel. With Wave-1's single-use
 * RT rotation (auth.service.ts:78-95), the first call rotates the jti and
 * the second call sees the revoked jti → 401 → the BFF route deletes the
 * cookie → AuthGuard sees `!user` → bounces to /login. Sharing the
 * in-flight Promise across mounts collapses the race to one network call.
 */
let inflightRestore: Promise<{
  accessToken: string;
  user: AuthUser;
} | null> | null = null;

async function restoreSession(): Promise<{
  accessToken: string;
  user: AuthUser;
} | null> {
  if (inflightRestore) return inflightRestore;
  inflightRestore = (async () => {
    try {
      const res = await fetch("/api/auth/refresh", { method: "POST" });
      if (!res.ok) return null;
      return (await res.json()) as { accessToken: string; user: AuthUser };
    } catch (err) {
      console.error("Session restore failed:", err);
      return null;
    } finally {
      // Release the lock on the next tick so a quick StrictMode remount
      // still hits the cached result, but a genuine later refresh (e.g.
      // post-401 retry from the api-client) issues a fresh call.
      setTimeout(() => {
        inflightRestore = null;
      }, 0);
    }
  })();
  return inflightRestore;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginRoute = pathname?.endsWith("/login") ?? false;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(!isLoginRoute);

  useEffect(() => {
    if (isLoginRoute) return;
    let cancelled = false;
    restoreSession().then((data) => {
      if (cancelled) return;
      if (data) {
        setAccessToken(data.accessToken);
        setUser(data.user);
      }
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isLoginRoute]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthUser> => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new AuthError(
          data?.error?.message || "Login failed",
          res.status,
        );
      }

      const data = (await res.json()) as {
        accessToken: string;
        user: AuthUser;
      };
      setAccessToken(data.accessToken);
      setUser(data.user);
      return data.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      login,
      logout,
      can: (action, resource) => checkCan(user, action, resource),
    }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/**
 * Imperative permission hook. Use this in handlers or when conditionally
 * passing props. For render-time gating of a JSX block, prefer the `<Can>`
 * component from `@/components/shared/can`.
 */
export function usePermissions() {
  const { user, can } = useAuth();
  return useMemo(
    () => ({
      role: user?.role ?? null,
      agentId: user?.agentId ?? null,
      can,
      isRole: (...roles: AdminRole[]) =>
        !!user && roles.includes(user.role as AdminRole),
    }),
    [user, can],
  );
}
