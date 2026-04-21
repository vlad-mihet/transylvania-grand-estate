"use client";

import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/auth/language-switcher";
import { APP_VERSION, BRAND } from "@/lib/config/brand";

interface AuthShellProps {
  children: ReactNode;
  /** Optional slot rendered between the card and the footer — used by the
   *  login page for its action row + status pill. */
  afterCard?: ReactNode;
  /** Show the deploy version chip in the footer (login only). */
  showVersion?: boolean;
  /** id on the <main> element — target of the skip-to-content link. */
  mainId?: string;
}

/**
 * Shared chrome for login / forgot-password / reset-password / accept-invite.
 * Owns the copper top-glow, brand wordmark, card wrapper, and footer so the
 * four pages stop hand-duplicating the same 40-line scaffold.
 */
export function AuthShell({
  children,
  afterCard,
  showVersion = false,
  mainId = "main",
}: AuthShellProps) {
  return (
    <main
      id={mainId}
      className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[320px] bg-[radial-gradient(ellipse_at_top,_color-mix(in_srgb,var(--color-copper)_5%,transparent),_transparent_70%)]"
      />

      <div className="relative flex w-full max-w-[440px] flex-col items-center gap-7">
        <header className="flex flex-col items-center gap-3">
          <h2 className="text-[22px] font-semibold tracking-[-0.015em] text-foreground">
            {BRAND.name}
          </h2>
          <div
            aria-hidden
            className="h-px w-10 bg-[var(--color-copper)] opacity-70"
          />
        </header>

        <div className="w-full overflow-hidden rounded-md border border-border bg-card shadow-sm">
          <div className="p-6">{children}</div>
        </div>

        {afterCard}

        <footer className="mt-1 flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-border pt-4">
          <LanguageSwitcher />
          <span aria-hidden className="text-muted-foreground/30">
            ·
          </span>
          {showVersion && (
            <>
              <span className="mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                v{APP_VERSION}
              </span>
              <span aria-hidden className="text-muted-foreground/30">
                ·
              </span>
            </>
          )}
          <span className="text-[10px] text-muted-foreground/80">
            © {new Date().getFullYear()} {BRAND.name}
          </span>
        </footer>
      </div>
    </main>
  );
}
