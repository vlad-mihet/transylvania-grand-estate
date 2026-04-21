"use client";

import { useAuth } from "./auth-provider";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useEffect } from "react";

/**
 * Paths an AGENT may visit. Anything else bounces to /403. Admin-only pages
 * (Users, Settings, etc.) already route-guard themselves with useEffect
 * redirects based on permissions, but this belt-and-suspenders check covers
 * the narrower AGENT surface so a curious agent can't URL-poke into the
 * admin catalog even momentarily.
 */
const AGENT_ALLOWED_PREFIXES = [
  "/",
  "/my-listings",
  "/my-inquiries",
  "/profile",
];

const PUBLIC_PREFIXES = ["/login", "/403"];

function isPathAllowedForAgent(pathname: string): boolean {
  // Exact root match
  if (pathname === "/") return true;
  return AGENT_ALLOWED_PREFIXES.some(
    (prefix) => prefix !== "/" && pathname.startsWith(prefix),
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role === "AGENT") {
      const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
      if (!isPublic && !isPathAllowedForAgent(pathname)) {
        router.replace("/403");
      }
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
