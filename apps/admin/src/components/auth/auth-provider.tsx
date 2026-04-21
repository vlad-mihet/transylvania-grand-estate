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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginRoute = pathname?.endsWith("/login") ?? false;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(!isLoginRoute);

  useEffect(() => {
    if (isLoginRoute) return;
    const restore = async () => {
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          setAccessToken(data.accessToken);
          setUser(data.user);
        }
      } catch (err) {
        console.error("Session restore failed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    restore();
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
