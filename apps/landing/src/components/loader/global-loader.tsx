"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { cn } from "@tge/utils";
import { DiamondSvg } from "@/components/layout/floating-diamond";
import { useLoader } from "./loader-context";

const SAFETY_TIMEOUT_MS = 8000;

export function GlobalLoader() {
  const { hide, isActive, progress } = useLoader();
  const pathname = usePathname();

  const wasActiveRef = useRef(false);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-hide when the URL changes after the loader was shown.
  // pathname from next/navigation includes the locale prefix (/ro/..., /en/...),
  // so locale switches register as a pathname change too — no separate locale watch needed.
  useEffect(() => {
    if (!wasActiveRef.current) return;
    hide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Track active state + arm safety timeout.
  useEffect(() => {
    if (isActive) {
      wasActiveRef.current = true;
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = setTimeout(() => {
        hide();
      }, SAFETY_TIMEOUT_MS);
    } else {
      wasActiveRef.current = false;
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
    }
    return () => {
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
    };
  }, [isActive, hide]);

  if (!mounted) return null;

  const displayProgress = Math.max(0, Math.min(100, progress));
  const showPercent = displayProgress > 5;

  const overlay = (
    <div
      aria-hidden={!isActive}
      role="status"
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center",
        "bg-background transition-opacity duration-300 ease-luxury",
        isActive
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      )}
    >
      <div className="flex flex-col items-center gap-12">
        {/* Diamond mark + wordmark — exact composition of the header logo
            (horizontal: diamond left, wordmark right, gap-4), scaled up to
            read as a viewport centerpiece. */}
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="relative shrink-0">
            <div className="absolute inset-0 -m-3 rounded-full animate-diamond-glow bg-amethyst/20 blur-lg" />
            <DiamondSvg className="relative block w-11 h-11 sm:w-12 sm:h-12" />
          </div>
          <span className="font-serif text-2xl sm:text-3xl md:text-4xl font-medium text-cream tracking-[0.03em] leading-none whitespace-nowrap">
            Transylvania
            <span className="tge-accent text-copper logo-glow"> Grand Estate</span>
          </span>
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-[2px] w-[340px] bg-cream/10 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-copper transition-[width] duration-150 ease-out"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
          <span
            className="text-[11px] font-sans font-semibold uppercase tracking-[0.25em] text-cream-muted/70 tabular-nums"
            style={{
              opacity: showPercent ? 1 : 0,
              transition: "opacity 200ms var(--ease-luxury)",
            }}
          >
            {Math.floor(displayProgress).toString().padStart(2, "0")}%
          </span>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
