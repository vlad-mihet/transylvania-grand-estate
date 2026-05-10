"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Phase = "idle" | "starting" | "climbing" | "finishing";

interface LoaderContextValue {
  show: () => void;
  hide: () => void;
  isActive: boolean;
  progress: number;
}

const LoaderContext = createContext<LoaderContextValue | null>(null);

const MIN_VISIBLE_MS = 1200;
const STARTING_DURATION_MS = 250;
const FINISHING_DURATION_MS = 350;
const FADE_OUT_MS = 400;

export function LoaderProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const phaseRef = useRef<Phase>("idle");
  const progressRef = useRef(0);
  const startedAtRef = useRef(0);
  const startingFromRef = useRef(0);
  const finishingFromRef = useRef(0);
  const finishingStartedAtRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHideRef = useRef(false);

  const stopRaf = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Tick is stored in a ref so it can self-schedule via rAF without tripping
  // the no-use-before-defined rule, and so callers (show/beginFinishing) can
  // schedule it without circular useCallback deps. The function only reads
  // refs and stable setters, so it never needs to be re-installed.
  const tickRef = useRef<() => void>(() => {});

  useEffect(() => {
    tickRef.current = () => {
      const now = performance.now();
      const phase = phaseRef.current;

      if (phase === "starting") {
        const elapsed = now - startedAtRef.current;
        const t = Math.min(elapsed / STARTING_DURATION_MS, 1);
        const next =
          startingFromRef.current + (30 - startingFromRef.current) * t;
        progressRef.current = next;
        setProgress(next);
        if (t >= 1) {
          phaseRef.current = "climbing";
        }
      } else if (phase === "climbing") {
        const next = progressRef.current + (90 - progressRef.current) * 0.02;
        progressRef.current = next;
        setProgress(next);
      } else if (phase === "finishing") {
        const elapsed = now - finishingStartedAtRef.current;
        const t = Math.min(elapsed / FINISHING_DURATION_MS, 1);
        const next =
          finishingFromRef.current + (100 - finishingFromRef.current) * t;
        progressRef.current = next;
        setProgress(next);
        if (t >= 1) {
          stopRaf();
          if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
          fadeTimeoutRef.current = setTimeout(() => {
            phaseRef.current = "idle";
            progressRef.current = 0;
            setIsActive(false);
            setProgress(0);
          }, FADE_OUT_MS);
          return;
        }
      } else {
        return;
      }

      rafRef.current = requestAnimationFrame(() => tickRef.current());
    };
  }, [stopRaf]);

  const scheduleTick = useCallback(() => {
    rafRef.current = requestAnimationFrame(() => tickRef.current());
  }, []);

  const show = useCallback(() => {
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
    pendingHideRef.current = false;
    startedAtRef.current = performance.now();
    startingFromRef.current = progressRef.current;
    if (phaseRef.current === "idle") {
      progressRef.current = 0;
      startingFromRef.current = 0;
      setProgress(0);
    }
    phaseRef.current = "starting";
    setIsActive(true);
    stopRaf();
    scheduleTick();
  }, [stopRaf, scheduleTick]);

  const beginFinishing = useCallback(() => {
    finishingFromRef.current = progressRef.current;
    finishingStartedAtRef.current = performance.now();
    phaseRef.current = "finishing";
    stopRaf();
    scheduleTick();
  }, [stopRaf, scheduleTick]);

  const hide = useCallback(() => {
    if (phaseRef.current === "idle" || phaseRef.current === "finishing") return;
    const elapsed = performance.now() - startedAtRef.current;
    if (elapsed < MIN_VISIBLE_MS) {
      // Defer to ensure overlay is visible long enough to read.
      if (pendingHideRef.current) return;
      pendingHideRef.current = true;
      setTimeout(() => {
        pendingHideRef.current = false;
        if (phaseRef.current === "starting" || phaseRef.current === "climbing") {
          beginFinishing();
        }
      }, MIN_VISIBLE_MS - elapsed);
      return;
    }
    beginFinishing();
  }, [beginFinishing]);

  useEffect(() => {
    return () => {
      stopRaf();
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    };
  }, [stopRaf]);

  return (
    <LoaderContext.Provider value={{ show, hide, isActive, progress }}>
      {children}
    </LoaderContext.Provider>
  );
}

export function useLoader(): LoaderContextValue {
  const ctx = useContext(LoaderContext);
  if (!ctx) {
    throw new Error("useLoader must be used inside <LoaderProvider>");
  }
  return ctx;
}
