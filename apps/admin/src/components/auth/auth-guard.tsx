"use client";

import { useAuth } from "./auth-provider";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useEffect } from "react";
import { isPathAllowedForAgent } from "@/lib/agent-paths";

const PUBLIC_PREFIXES = ["/login", "/403"];

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
